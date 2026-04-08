'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { otpSchema } from '@/lib/validations/auth';
import {
  EMAIL_COOKIE,
  INVITE_TOKEN_COOKIE,
  FLOW_COOKIE,
  COOKIE_MAX_AGE,
} from '@/lib/constants/auth';
import { validateInviteToken, acceptInvite } from '@/actions/invites';

type ActionResult = { success: true } | { redirect: string } | { error: string };

// ---------------------------------------------------------------------------
// Initiate OTP for invite flow — sends OTP to the invited email
// ---------------------------------------------------------------------------
export async function initiateInviteOtp(
  token: string
): Promise<ActionResult> {
  const validation = await validateInviteToken(token);

  if (!validation.valid) {
    if (validation.reason === 'expired') {
      return { error: 'This invite has expired. Ask your admin to send a new one.' };
    }
    return { error: 'This invite link is not valid.' };
  }

  const { invite } = validation.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: invite.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: undefined,
    },
  });

  if (error) return { error: error.message };

  const cookieStore = await cookies();

  cookieStore.set(EMAIL_COOKIE, invite.email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  cookieStore.set(INVITE_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return { redirect: '/join/verify' };
}

// ---------------------------------------------------------------------------
// Initiate Google OAuth for invite flow
// ---------------------------------------------------------------------------
export async function signInWithGoogleForInvite(
  token: string
): Promise<{ url: string } | { error: string }> {
  const validation = await validateInviteToken(token);

  if (!validation.valid) {
    if (validation.reason === 'expired') {
      return { error: 'This invite has expired. Ask your admin to send a new one.' };
    }
    return { error: 'This invite link is not valid.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        login_hint: validation.data.invite.email,
      },
    },
  });

  if (error || !data.url) {
    return { error: error?.message ?? 'Failed to initiate Google sign in' };
  }

  const cookieStore = await cookies();

  cookieStore.set(INVITE_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  cookieStore.set(FLOW_COOKIE, 'invite', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return { url: data.url };
}

// ---------------------------------------------------------------------------
// Verify OTP for invite flow — verifies code then accepts the invite
// ---------------------------------------------------------------------------
export async function verifyInviteOtp(formData: FormData): Promise<ActionResult> {
  const raw = { otp: formData.get('otp') as string };
  const parsed = otpSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid code' };
  }

  const cookieStore = await cookies();
  const email = cookieStore.get(EMAIL_COOKIE)?.value;
  const inviteToken = cookieStore.get(INVITE_TOKEN_COOKIE)?.value;

  if (!email) return { error: 'Session expired. Please try again.' };
  if (!inviteToken) return { error: 'Invite session expired. Please start again.' };

  const supabase = await createClient();

  const { error: otpError } = await supabase.auth.verifyOtp({
    email,
    token: parsed.data.otp,
    type: 'email',
  });

  if (otpError) {
    return { error: 'Invalid or expired code. Please try again.' };
  }

  cookieStore.delete(EMAIL_COOKIE);
  cookieStore.delete(INVITE_TOKEN_COOKIE);

  const result = await acceptInvite(inviteToken);

  if ('error' in result) return { error: result.error };

  return { redirect: '/dashboard' };
}
