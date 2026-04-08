"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createEnterpriseSchema } from "@/lib/validations/enterprise";

type ActionResult = { redirect: string } | { error: string };

// ---------------------------------------------------------------------------
// Create enterprise and owner membership in a single transaction
// ---------------------------------------------------------------------------
export async function createEnterprise(
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    name: formData.get("name") as string,
    website_url: formData.get("website_url") as string,
    employee_count: formData.get("employee_count") as string,
    city: formData.get("city") as string,
    state: formData.get("state") as string,
    country: formData.get("country") as string,
  };

  const parsed = createEnterpriseSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to create a company." };
  }

  // Generate the enterprise ID server-side so we can use it for the membership
  // insert without needing a SELECT after insert. This avoids triggering the
  // enterprises SELECT policy (which requires an existing membership row) during
  // the bootstrap flow where the user has no membership yet.
  const enterpriseId = randomUUID();
  const slug = generateSlug(parsed.data.name);

  try {
    const { error: enterpriseError } = await supabase
      .from("enterprises")
      .insert({
        id: enterpriseId,
        name: parsed.data.name,
        slug,
        website_url: parsed.data.website_url || null,
        employee_count: parsed.data.employee_count,
        city: parsed.data.city,
        state: parsed.data.state,
        country: parsed.data.country,
      });

    if (enterpriseError) {
      return { error: `Enterprise insert failed: ${enterpriseError.message} (code: ${enterpriseError.code})` };
    }

    const { error: memberError } = await supabase
      .from("enterprise_members")
      .insert({
        enterprise_id: enterpriseId,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      return { error: `Member insert failed: ${memberError.message} (code: ${memberError.code})` };
    }

    return { redirect: "/dashboard" };
  } catch (err) {
    return { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// Internal helper — generate a URL-safe slug with a short random suffix
// to avoid collisions without a round-trip query loop
// ---------------------------------------------------------------------------
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
