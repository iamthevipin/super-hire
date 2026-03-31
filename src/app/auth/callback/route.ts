import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FLOW_COOKIE } from "@/lib/constants/auth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const cookieStore = await cookies();
  const flow = cookieStore.get(FLOW_COOKIE)?.value as "signup" | "login" | undefined;
  cookieStore.delete(FLOW_COOKIE);

  const { data: membership } = await supabase
    .from("enterprise_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasEnterprise = membership !== null;

  if (flow === "login" && !hasEnterprise) {
    return NextResponse.redirect(
      `${origin}/login?error=no_account`
    );
  }

  const destination = hasEnterprise ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(`${origin}${destination}`);
}
