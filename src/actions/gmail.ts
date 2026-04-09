'use server';

import { createClient } from '@/lib/supabase/server';
import type { GmailIntegration, SentEmail } from '@/types/email';

export async function getGmailIntegration(): Promise<{
  data?: GmailIntegration | null;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'gmail')
    .single();

  if (error && error.code !== 'PGRST116') {
    return { error: error.message };
  }

  return { data: (data as GmailIntegration | null) ?? null };
}

export async function disconnectGmail(): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'gmail');

  if (error) return { error: error.message };
  return {};
}

export async function getSentEmailsForCandidate(
  candidateId: string
): Promise<{ data?: SentEmail[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { error: 'No enterprise' };

  if (!['admin', 'owner'].includes(membership.role as string)) {
    return { error: 'Forbidden' };
  }

  const { data, error } = await supabase
    .from('candidate_emails')
    .select(
      'id, enterprise_id, candidate_id, sender_user_id, sender_name, sender_gmail_address, subject, body_html, body_text, sent_at, created_at'
    )
    .eq('candidate_id', candidateId)
    .eq('enterprise_id', membership.enterprise_id)
    .order('sent_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as SentEmail[] };
}
