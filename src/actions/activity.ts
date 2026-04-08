'use server';

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityEvent, ActivityEventType } from '@/types/activity';

interface LogActivityParams {
  supabase: SupabaseClient;
  enterprise_id: string;
  candidate_id: string;
  application_id: string | null;
  event_type: ActivityEventType;
  actor_id: string;
  actor_name: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  const {
    supabase,
    enterprise_id,
    candidate_id,
    application_id,
    event_type,
    actor_id,
    actor_name,
    description,
    metadata,
  } = params;

  await supabase.from('activity_timeline').insert({
    enterprise_id,
    candidate_id,
    application_id,
    event_type,
    actor_id,
    actor_name,
    description,
    metadata: metadata ?? null,
  });
}

export async function getActivityForCandidate(
  candidateId: string
): Promise<{ data?: ActivityEvent[]; error?: string }> {
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

  if (!['admin', 'owner'].includes(membership.role)) {
    return { error: 'Forbidden' };
  }

  const { data, error } = await supabase
    .from('activity_timeline')
    .select(
      'id, enterprise_id, candidate_id, application_id, event_type, actor_id, actor_name, description, metadata, created_at'
    )
    .eq('candidate_id', candidateId)
    .eq('enterprise_id', membership.enterprise_id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: (data ?? []) as ActivityEvent[] };
}
