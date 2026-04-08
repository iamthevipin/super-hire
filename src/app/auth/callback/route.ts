import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FLOW_COOKIE, INVITE_TOKEN_COOKIE } from "@/lib/constants/auth";
import { cookies } from "next/headers";
import { acceptInvite } from "@/actions/invites";

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
  const flow = cookieStore.get(FLOW_COOKIE)?.value as "signup" | "login" | "invite" | undefined;
  const inviteToken = cookieStore.get(INVITE_TOKEN_COOKIE)?.value;

  cookieStore.delete(FLOW_COOKIE);

  // Handle invite flow — accept invite after Google OAuth
  if (flow === "invite" && inviteToken) {
    cookieStore.delete(INVITE_TOKEN_COOKIE);

    const result = await acceptInvite(inviteToken);

    if ("error" in result) {
      // Email mismatch: redirect back to join page with error
      const encodedToken = encodeURIComponent(inviteToken);
      return NextResponse.redirect(
        `${origin}/join?token=${encodedToken}&error=email_mismatch`
      );
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  }

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
