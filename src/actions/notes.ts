'use server';

import { createClient } from '@/lib/supabase/server';
import { noteSchema, updateNoteSchema } from '@/lib/validations/feedback';
import { logActivity } from '@/actions/activity';
import type { CandidateNote } from '@/types/feedback';

function getActorName(user: { user_metadata?: { full_name?: string }; email?: string }): string {
  return user.user_metadata?.full_name ?? user.email ?? 'Team member';
}

export async function addNote(
  candidateId: string,
  stageId: string,
  body: string
): Promise<{ error?: string; noteId?: string }> {
  const parsed = noteSchema.safeParse({
    candidate_id: candidateId,
    pipeline_stage_id: stageId,
    body,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return { error: 'No enterprise' };

  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('id, name')
    .eq('id', stageId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!stage) return { error: 'Stage not found' };

  const actorName = getActorName(user);

  const { data, error } = await supabase
    .from('candidate_notes')
    .insert({
      enterprise_id: membership.enterprise_id,
      candidate_id: candidateId,
      pipeline_stage_id: stageId,
      user_id: user.id,
      user_name: actorName,
      body: parsed.data.body,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: candidateId,
    application_id: null,
    event_type: 'note_added',
    actor_id: user.id,
    actor_name: actorName,
    description: `${actorName} added a note (${stage.name} stage)`,
  });

  return { noteId: data?.id };
}

export async function updateNote(
  noteId: string,
  body: string
): Promise<{ error?: string }> {
  const parsed = updateNoteSchema.safeParse({ note_id: noteId, body });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return { error: 'No enterprise' };

  const { data: note } = await supabase
    .from('candidate_notes')
    .select('id, candidate_id, pipeline_stage_id')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!note) return { error: 'Note not found or not yours' };

  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('id', note.pipeline_stage_id)
    .single();

  const { error } = await supabase
    .from('candidate_notes')
    .update({ body: parsed.data.body, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  const actorName = getActorName(user);
  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: note.candidate_id,
    application_id: null,
    event_type: 'note_updated',
    actor_id: user.id,
    actor_name: actorName,
    description: `${actorName} edited a note (${stage?.name ?? 'unknown'} stage)`,
  });

  return {};
}

export async function deleteNote(noteId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return { error: 'No enterprise' };

  const { data: note } = await supabase
    .from('candidate_notes')
    .select('id, candidate_id, pipeline_stage_id')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!note) return { error: 'Note not found or not yours' };

  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('id', note.pipeline_stage_id)
    .single();

  const { error } = await supabase
    .from('candidate_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  const actorName = getActorName(user);
  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: note.candidate_id,
    application_id: null,
    event_type: 'note_deleted',
    actor_id: user.id,
    actor_name: actorName,
    description: `${actorName} deleted a note (${stage?.name ?? 'unknown'} stage)`,
  });

  return {};
}

export async function getNotesForCandidate(
  candidateId: string
): Promise<{
  data?: (CandidateNote & { stage_name: string; is_own: boolean })[];
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return { error: 'No enterprise' };

  const { data, error } = await supabase
    .from('candidate_notes')
    .select(
      'id, enterprise_id, candidate_id, pipeline_stage_id, user_id, user_name, body, created_at, updated_at'
    )
    .eq('candidate_id', candidateId)
    .eq('enterprise_id', membership.enterprise_id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  const notes = data ?? [];
  const stageIds = [...new Set(notes.map((n) => n.pipeline_stage_id))];

  let stageMap = new Map<string, string>();
  if (stageIds.length > 0) {
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .in('id', stageIds);
    if (stages) {
      stageMap = new Map(stages.map((s) => [s.id, s.name]));
    }
  }

  return {
    data: notes.map((n) => ({
      ...n,
      stage_name: stageMap.get(n.pipeline_stage_id) ?? 'Unknown stage',
      is_own: n.user_id === user.id,
    })),
  };
}
