"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema, otpSchema } from "@/lib/validations/auth";
import {
  EMAIL_COOKIE,
  FLOW_COOKIE,
  COOKIE_MAX_AGE,
  WELCOME_CONTEXT_COOKIE,
} from "@/lib/constants/auth";

type ActionResult =
  | { success: true }
  | { redirect: string }
  | { error: string };

const flowSchema = z.enum(["signup", "login"]).nullable().optional();

// ---------------------------------------------------------------------------
// Sign up with email OTP
// ---------------------------------------------------------------------------
export async function signUpWithEmail(
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get("email") as string };
  const parsed = signUpSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const { email } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: undefined,
    },
  });

  if (error) {
    return { error: error.message };
  }

  const cookieStore = await cookies();
  cookieStore.set(EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Login with email — checks existence via getUserByEmail before sending OTP
// ---------------------------------------------------------------------------
export async function loginWithEmail(
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get("email") as string };
  const parsed = signUpSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const { email } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: undefined,
    },
  });

  if (error) {
    // Supabase returns this when shouldCreateUser=false and the user doesn't exist
    if (
      error.message.toLowerCase().includes("signups not allowed") ||
      error.message.toLowerCase().includes("not allowed")
    ) {
      return {
        error: "No account found with this email. Please sign up first.",
      };
    }
    return { error: error.message };
  }

  const cookieStore = await cookies();
  cookieStore.set(EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Verify 6-digit OTP
// ---------------------------------------------------------------------------
export async function verifyOtp(formData: FormData): Promise<ActionResult> {
  const raw = { otp: formData.get("otp") as string };
  const parsed = otpSchema.safeParse(raw);
  const flowResult = flowSchema.safeParse(formData.get("flow"));
  const flow = flowResult.success ? flowResult.data : null;

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  const cookieStore = await cookies();
  const email = cookieStore.get(EMAIL_COOKIE)?.value;

  if (!email) {
    return { error: "Session expired. Please try again." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data.otp,
    type: "email",
  });

  if (error) {
    return { error: "Invalid or expired code. Please try again." };
  }

  cookieStore.delete(EMAIL_COOKIE);

  const hasEnterprise = await checkEnterpriseExists(supabase);

  if (flow === "login" && !hasEnterprise) {
    return {
      error: "No account found for this email. Please sign up to create one.",
    };
  }

  return { redirect: hasEnterprise ? "/dashboard" : "/onboarding" };
}

// ---------------------------------------------------------------------------
// Sign in with Google OAuth
// flow is stored in a cookie so the callback handler knows what to do
// ---------------------------------------------------------------------------
export async function signInWithGoogle(
  flow: "signup" | "login"
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return { error: error?.message ?? "Failed to initiate Google sign in" };
  }

  const cookieStore = await cookies();
  cookieStore.set(FLOW_COOKIE, flow, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return { url: data.url };
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------
export async function signOut(): Promise<{ redirect: string }> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { redirect: "/login" };
}

// ---------------------------------------------------------------------------
// Clear welcome cookie — called client-side after modal mounts
// ---------------------------------------------------------------------------
export async function clearWelcomeCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(WELCOME_CONTEXT_COOKIE);
}

// ---------------------------------------------------------------------------
// Internal helper — check if the current user has an enterprise membership
// ---------------------------------------------------------------------------
async function checkEnterpriseExists(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("enterprise_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data !== null;
}
