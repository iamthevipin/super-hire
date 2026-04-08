'use server';

import { createClient } from '@/lib/supabase/server';
import { moveCandidateStageSchema } from '@/lib/validations/candidates';
import { logActivity } from '@/actions/activity';
import type { KanbanColumn, ApplicationWithCandidate } from '@/types/candidates';

export async function getKanbanData(jobId: string): Promise<KanbanColumn[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: membership } = await supabase
    .from('enterprise_members')
    .select('enterprise_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) return [];

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, job_id, enterprise_id, name, position, is_locked, created_at')
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .order('position', { ascending: true });

  if (!stages || stages.length === 0) return [];

  const { data: applications } = await supabase
    .from('applications')
    .select(
      `
      id, enterprise_id, job_id, candidate_id, pipeline_stage_id, owner_id,
      tags, source, rejection_reason, notes, created_at, updated_at,
      candidate:candidates(id, enterprise_id, first_name, last_name, email, phone,
        linkedin_url, current_job_title, resume_path, created_at, updated_at),
      pipeline_stage:pipeline_stages(id, job_id, enterprise_id, name, position, is_locked, created_at)
    `
    )
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id);

  const appsWithOwner = (applications ?? []) as unknown as ApplicationWithCandidate[];

  return stages.map((stage) => ({
    stage,
    applications: appsWithOwner.filter((app) => app.pipeline_stage_id === stage.id),
  })) as KanbanColumn[];
}

export async function moveCandidateStage(
  applicationId: string,
  newStageId: string,
  rejectionReason?: string
): Promise<{ error?: string }> {
  const parsed = moveCandidateStageSchema.safeParse({
    application_id: applicationId,
    new_stage_id: newStageId,
    rejection_reason: rejectionReason,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { application_id, new_stage_id, rejection_reason } = parsed.data;

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

  const { data: application } = await supabase
    .from('applications')
    .select('id, enterprise_id, candidate_id, pipeline_stage_id')
    .eq('id', application_id)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!application) return { error: 'Application not found' };

  const { data: targetStage } = await supabase
    .from('pipeline_stages')
    .select('id, name, is_locked')
    .eq('id', new_stage_id)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!targetStage) return { error: 'Stage not found' };

  const isRejected = targetStage.name.toLowerCase() === 'rejected';
  if (isRejected && !rejection_reason) {
    return { error: 'Rejection reason is required' };
  }

  interface ApplicationUpdate {
    pipeline_stage_id: string;
    updated_at: string;
    rejection_reason?: string | null;
  }

  const updatePayload: ApplicationUpdate = {
    pipeline_stage_id: new_stage_id,
    updated_at: new Date().toISOString(),
    rejection_reason: isRejected && rejection_reason ? rejection_reason : null,
  };

  const { error } = await supabase
    .from('applications')
    .update(updatePayload)
    .eq('id', application_id)
    .eq('enterprise_id', membership.enterprise_id);

  if (error) return { error: error.message };

  const [candidateResult, fromStageResult] = await Promise.all([
    supabase
      .from('candidates')
      .select('first_name, last_name')
      .eq('id', application.candidate_id)
      .single(),
    supabase
      .from('pipeline_stages')
      .select('name')
      .eq('id', application.pipeline_stage_id)
      .single(),
  ]);

  const candidateName = candidateResult.data
    ? `${candidateResult.data.first_name} ${candidateResult.data.last_name}`
    : 'Candidate';
  const actorName = user.user_metadata?.full_name ?? user.email ?? 'Team member';
  const fromStageName = fromStageResult.data?.name ?? 'previous stage';

  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: application.candidate_id,
    application_id: application_id,
    event_type: isRejected ? 'candidate_rejected' : 'stage_changed',
    actor_id: user.id,
    actor_name: actorName,
    description: isRejected
      ? `${actorName} moved ${candidateName} to Rejected — Reason: ${rejection_reason}`
      : `${actorName} moved ${candidateName} from ${fromStageName} to ${targetStage.name}`,
  });

  return {};
}
