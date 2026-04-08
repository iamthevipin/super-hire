'use server';

import { createClient } from '@/lib/supabase/server';
import { setRatingSchema, upsertCommentSchema } from '@/lib/validations/feedback';
import { logActivity } from '@/actions/activity';
import type { StageFeedbackGroup } from '@/types/feedback';

const EXCLUDED_STAGES = ['applied', 'hired', 'rejected'];

function isExcludedStage(name: string): boolean {
  return EXCLUDED_STAGES.includes(name.toLowerCase());
}

function getActorName(user: { user_metadata?: { full_name?: string }; email?: string }): string {
  return user.user_metadata?.full_name ?? user.email ?? 'Team member';
}

export async function setStageRating(
  candidateId: string,
  stageId: string,
  rating: number
): Promise<{ error?: string }> {
  const parsed = setRatingSchema.safeParse({
    candidate_id: candidateId,
    pipeline_stage_id: stageId,
    rating,
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

  if (isExcludedStage(stage.name)) {
    return { error: 'Feedback is not available for this stage' };
  }

  const { data: existing } = await supabase
    .from('stage_ratings')
    .select('id')
    .eq('enterprise_id', membership.enterprise_id)
    .eq('candidate_id', candidateId)
    .eq('pipeline_stage_id', stageId)
    .single();

  const isUpdate = !!existing;

  const { error } = await supabase.from('stage_ratings').upsert(
    {
      enterprise_id: membership.enterprise_id,
      candidate_id: candidateId,
      pipeline_stage_id: stageId,
      rating,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'enterprise_id,candidate_id,pipeline_stage_id' }
  );

  if (error) return { error: error.message };

  const actorName = getActorName(user);
  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: candidateId,
    application_id: null,
    event_type: isUpdate ? 'feedback_updated' : 'feedback_added',
    actor_id: user.id,
    actor_name: actorName,
    description: isUpdate
      ? `${actorName} updated feedback on ${stage.name} — \u2605${rating}`
      : `${actorName} submitted feedback on ${stage.name} — \u2605${rating}`,
  });

  return {};
}

export async function clearStageRating(
  candidateId: string,
  stageId: string
): Promise<{ error?: string }> {
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

  const { error } = await supabase
    .from('stage_ratings')
    .delete()
    .eq('enterprise_id', membership.enterprise_id)
    .eq('candidate_id', candidateId)
    .eq('pipeline_stage_id', stageId);

  if (error) return { error: error.message };

  const actorName = getActorName(user);
  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: candidateId,
    application_id: null,
    event_type: 'feedback_deleted',
    actor_id: user.id,
    actor_name: actorName,
    description: `${actorName} deleted their feedback on ${stage.name}`,
  });

  return {};
}

export async function upsertFeedbackComment(
  candidateId: string,
  stageId: string,
  body: string
): Promise<{ error?: string; commentId?: string }> {
  const parsed = upsertCommentSchema.safeParse({
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

  if (isExcludedStage(stage.name)) {
    return { error: 'Feedback is not available for this stage' };
  }

  const { data: existing } = await supabase
    .from('feedback_comments')
    .select('id')
    .eq('enterprise_id', membership.enterprise_id)
    .eq('candidate_id', candidateId)
    .eq('pipeline_stage_id', stageId)
    .eq('user_id', user.id)
    .single();

  const isUpdate = !!existing;
  const actorName = getActorName(user);

  const { data, error } = await supabase
    .from('feedback_comments')
    .upsert(
      {
        enterprise_id: membership.enterprise_id,
        candidate_id: candidateId,
        pipeline_stage_id: stageId,
        user_id: user.id,
        user_name: actorName,
        body: parsed.data.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'enterprise_id,candidate_id,pipeline_stage_id,user_id' }
    )
    .select('id')
    .single();

  if (error) return { error: error.message };

  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: candidateId,
    application_id: null,
    event_type: isUpdate ? 'feedback_updated' : 'feedback_added',
    actor_id: user.id,
    actor_name: actorName,
    description: isUpdate
      ? `${actorName} updated feedback on ${stage.name}`
      : `${actorName} submitted feedback on ${stage.name}`,
  });

  return { commentId: data?.id };
}

export async function deleteFeedbackComment(
  commentId: string
): Promise<{ error?: string }> {
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

  const { data: comment } = await supabase
    .from('feedback_comments')
    .select('id, candidate_id, pipeline_stage_id')
    .eq('id', commentId)
    .eq('user_id', user.id)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!comment) return { error: 'Comment not found or not yours' };

  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('id', comment.pipeline_stage_id)
    .single();

  const { error } = await supabase
    .from('feedback_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  const actorName = getActorName(user);
  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: comment.candidate_id,
    application_id: null,
    event_type: 'feedback_deleted',
    actor_id: user.id,
    actor_name: actorName,
    description: `${actorName} deleted their feedback on ${stage?.name ?? 'unknown stage'}`,
  });

  return {};
}

export async function getFeedbackForCandidate(
  candidateId: string
): Promise<{ data?: StageFeedbackGroup[]; error?: string }> {
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

  const [ratingsResult, commentsResult] = await Promise.all([
    supabase
      .from('stage_ratings')
      .select('id, pipeline_stage_id, rating')
      .eq('candidate_id', candidateId)
      .eq('enterprise_id', membership.enterprise_id),
    supabase
      .from('feedback_comments')
      .select('id, pipeline_stage_id, user_id, user_name, body, created_at, updated_at')
      .eq('candidate_id', candidateId)
      .eq('enterprise_id', membership.enterprise_id)
      .order('created_at', { ascending: true }),
  ]);

  if (ratingsResult.error) return { error: ratingsResult.error.message };
  if (commentsResult.error) return { error: commentsResult.error.message };

  const ratings = ratingsResult.data ?? [];
  const comments = commentsResult.data ?? [];

  const stageIds = [
    ...new Set([
      ...ratings.map((r) => r.pipeline_stage_id),
      ...comments.map((c) => c.pipeline_stage_id),
    ]),
  ];

  if (stageIds.length === 0) return { data: [] };

  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id, name, position')
    .in('id', stageIds)
    .eq('enterprise_id', membership.enterprise_id)
    .order('position', { ascending: true });

  if (stagesError) return { error: stagesError.message };

  const ratingMap = new Map(ratings.map((r) => [r.pipeline_stage_id, r.rating]));

  const groups: StageFeedbackGroup[] = (stages ?? []).map((stage) => ({
    stage: { id: stage.id, name: stage.name, position: stage.position },
    rating: ratingMap.get(stage.id) ?? null,
    comments: comments
      .filter((c) => c.pipeline_stage_id === stage.id)
      .map((c) => ({
        id: c.id,
        user_id: c.user_id,
        user_name: c.user_name,
        body: c.body,
        created_at: c.created_at,
        updated_at: c.updated_at,
        is_own: c.user_id === user.id,
      })),
  }));

  return { data: groups };
}

export async function getMyFeedbackForStage(
  candidateId: string,
  stageId: string
): Promise<{ rating: number | null; comment: { id: string; body: string } | null; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rating: null, comment: null, error: 'Unauthorized' };

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return { rating: null, comment: null, error: 'No enterprise' };

  const [ratingResult, commentResult] = await Promise.all([
    supabase
      .from('stage_ratings')
      .select('rating')
      .eq('candidate_id', candidateId)
      .eq('pipeline_stage_id', stageId)
      .eq('enterprise_id', membership.enterprise_id)
      .single(),
    supabase
      .from('feedback_comments')
      .select('id, body')
      .eq('candidate_id', candidateId)
      .eq('pipeline_stage_id', stageId)
      .eq('user_id', user.id)
      .eq('enterprise_id', membership.enterprise_id)
      .single(),
  ]);

  return {
    rating: ratingResult.data?.rating ?? null,
    comment: commentResult.data ? { id: commentResult.data.id, body: commentResult.data.body } : null,
  };
}
