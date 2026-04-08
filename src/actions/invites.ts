'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { inviteSchema } from '@/lib/validations/invites';
import { sendInviteEmail } from '@/lib/email';
import { WELCOME_CONTEXT_COOKIE, WELCOME_COOKIE_MAX_AGE } from '@/lib/constants/auth';
import type { PendingInvite, ValidatedInvite } from '@/types/invites';

// success + emailSent for actions that send email — callers can warn when emailSent is false
type SendInviteResult = { success: true; emailSent: boolean } | { error: string };
type ActionResult = { success: true } | { error: string };

// UUID v4 format — invite tokens are always generated with crypto.randomUUID()
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Helper — get current user's enterprise membership
// ---------------------------------------------------------------------------
async function getMembership(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id, role, user_id')
    .eq('user_id', user.id)
    .single();

  return membership ? { ...membership, userId: user.id } : null;
}

// ---------------------------------------------------------------------------
// Helper — fetch inviter name and enterprise name for email composition
// ---------------------------------------------------------------------------
async function fetchEmailContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  membership: { userId: string; enterprise_id: string }
): Promise<{ inviterName: string; enterpriseName: string }> {
  const admin = createAdminClient();

  const [{ data: inviterData }, { data: enterprise }] = await Promise.all([
    admin.auth.admin.getUserById(membership.userId),
    supabase.from('enterprises').select('name').eq('id', membership.enterprise_id).single(),
  ]);

  return {
    inviterName:
      (inviterData?.user?.user_metadata?.full_name as string | undefined) ??
      inviterData?.user?.email ??
      'A team member',
    enterpriseName: enterprise?.name ?? 'your team',
  };
}

// ---------------------------------------------------------------------------
// Create invite
// ---------------------------------------------------------------------------
export async function createInvite(formData: FormData): Promise<SendInviteResult> {
  const supabase = await createClient();
  const membership = await getMembership(supabase);

  if (!membership) return { error: 'Unauthorized' };

  if (membership.role !== 'admin' && membership.role !== 'owner') {
    return { error: 'Only admins can invite members' };
  }

  const raw = {
    email: formData.get('email') as string,
    role: formData.get('role') as string,
  };

  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { email, role } = parsed.data;

  const { data: existing } = await supabase
    .from('pending_invites')
    .select('id')
    .eq('enterprise_id', membership.enterprise_id)
    .eq('email', email.toLowerCase())
    .eq('status', 'invited')
    .maybeSingle();

  if (existing) {
    return { error: 'A pending invite already exists for this email' };
  }

  const inviteToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from('pending_invites')
    .insert({
      enterprise_id: membership.enterprise_id,
      email: email.toLowerCase(),
      role,
      invited_by: membership.userId,
      invite_token: inviteToken,
      expires_at: expiresAt,
    });

  if (insertError) return { error: insertError.message };

  let emailSent = false;
  try {
    const { inviterName, enterpriseName } = await fetchEmailContext(supabase, membership);
    await sendInviteEmail(email, enterpriseName, inviterName, inviteToken);
    emailSent = true;
  } catch {
    // Non-fatal — the invite row exists and an admin can resend.
  }

  return { success: true, emailSent };
}

// ---------------------------------------------------------------------------
// Get invites for the current enterprise
// invite_token is intentionally excluded — it must not be exposed to the UI
// ---------------------------------------------------------------------------
export async function getInvites(): Promise<
  { data: Omit<PendingInvite, 'invite_token'>[] } | { error: string }
> {
  const supabase = await createClient();
  const membership = await getMembership(supabase);

  if (!membership) return { error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('pending_invites')
    .select('id, enterprise_id, email, role, invited_by, status, created_at, expires_at')
    .eq('enterprise_id', membership.enterprise_id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: (data as Omit<PendingInvite, 'invite_token'>[]) ?? [] };
}

// ---------------------------------------------------------------------------
// Resend invite — new token + reset expiry
// ---------------------------------------------------------------------------
export async function resendInvite(inviteId: string): Promise<SendInviteResult> {
  const supabase = await createClient();
  const membership = await getMembership(supabase);

  if (!membership) return { error: 'Unauthorized' };
  if (membership.role !== 'admin' && membership.role !== 'owner') {
    return { error: 'Only admins can resend invites' };
  }

  const { data: invite } = await supabase
    .from('pending_invites')
    .select('id, email, status, expires_at')
    .eq('id', inviteId)
    .eq('enterprise_id', membership.enterprise_id)
    .maybeSingle();

  if (!invite) return { error: 'Invite not found' };

  const newToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('pending_invites')
    .update({ invite_token: newToken, expires_at: expiresAt, status: 'invited' })
    .eq('id', inviteId)
    .eq('enterprise_id', membership.enterprise_id);

  if (updateError) return { error: updateError.message };

  let emailSent = false;
  try {
    const { inviterName, enterpriseName } = await fetchEmailContext(supabase, membership);
    await sendInviteEmail(invite.email as string, enterpriseName, inviterName, newToken);
    emailSent = true;
  } catch {
    // Non-fatal — the invite row has the new token, admin can try again.
  }

  return { success: true, emailSent };
}

// ---------------------------------------------------------------------------
// Cancel invite — delete the record
// ---------------------------------------------------------------------------
export async function cancelInvite(inviteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const membership = await getMembership(supabase);

  if (!membership) return { error: 'Unauthorized' };
  if (membership.role !== 'admin' && membership.role !== 'owner') {
    return { error: 'Only admins can cancel invites' };
  }

  const { error } = await supabase
    .from('pending_invites')
    .delete()
    .eq('id', inviteId)
    .eq('enterprise_id', membership.enterprise_id);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Validate invite token — no auth required (used on /join page)
// ---------------------------------------------------------------------------
export async function validateInviteToken(
  token: string
): Promise<{ valid: true; data: ValidatedInvite } | { valid: false; reason: string }> {
  if (!token || !UUID_REGEX.test(token)) {
    return { valid: false, reason: 'invalid' };
  }

  const admin = createAdminClient();

  const { data: invite, error } = await admin
    .from('pending_invites')
    .select('id, enterprise_id, email, role, invited_by, status, created_at, expires_at')
    .eq('invite_token', token)
    .maybeSingle();

  if (error || !invite) return { valid: false, reason: 'invalid' };

  if (invite.status === 'active') return { valid: false, reason: 'already_used' };
  if (invite.status === 'expired') return { valid: false, reason: 'expired' };
  if (new Date(invite.expires_at as string) < new Date()) {
    return { valid: false, reason: 'expired' };
  }

  const [{ data: enterprise }, { data: inviterData }] = await Promise.all([
    admin.from('enterprises').select('name').eq('id', invite.enterprise_id as string).single(),
    admin.auth.admin.getUserById(invite.invited_by as string),
  ]);

  const enterpriseName = (enterprise?.name as string | undefined) ?? 'your team';
  const invitedByName =
    (inviterData?.user?.user_metadata?.full_name as string | undefined) ??
    inviterData?.user?.email ??
    'A team member';

  return {
    valid: true,
    data: {
      invite: invite as Omit<PendingInvite, 'invite_token'>,
      enterpriseName,
      invitedByName,
    },
  };
}

// ---------------------------------------------------------------------------
// Accept invite — called after user has authenticated
// ---------------------------------------------------------------------------
export async function acceptInvite(
  token: string
): Promise<{ success: true; enterpriseName: string; role: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const validation = await validateInviteToken(token);
  if (!validation.valid) {
    if (validation.reason === 'expired') return { error: 'This invite has expired' };
    if (validation.reason === 'already_used') return { error: 'This invite has already been used' };
    return { error: 'Invalid invite link' };
  }

  const { invite, enterpriseName } = validation.data;

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      error: `This invitation was sent to ${invite.email}. Please sign in with that address.`,
    };
  }

  const { data: existingMember } = await supabase
    .from('enterprise_members')
    .select('id')
    .eq('enterprise_id', invite.enterprise_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    return { error: 'You are already a member of this enterprise' };
  }

  const admin = createAdminClient();

  const { error: memberError } = await admin
    .from('enterprise_members')
    .insert({
      enterprise_id: invite.enterprise_id,
      user_id: user.id,
      role: invite.role,
    });

  if (memberError) return { error: memberError.message };

  await admin
    .from('pending_invites')
    .update({ status: 'active' })
    .eq('id', invite.id)
    .eq('enterprise_id', invite.enterprise_id);

  const cookieStore = await cookies();
  cookieStore.set(
    WELCOME_CONTEXT_COOKIE,
    JSON.stringify({ enterpriseName, role: invite.role }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: WELCOME_COOKIE_MAX_AGE,
      path: '/',
    }
  );

  return { success: true, enterpriseName, role: invite.role };
}
