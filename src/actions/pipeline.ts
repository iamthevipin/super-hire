'use server';

import { createClient } from '@/lib/supabase/server';
import { pipelineStageSchema } from '@/lib/validations/jobs';
import type { PipelineStage } from '@/types/jobs';

type ActionResult = { success: true } | { error: string };

// ---------------------------------------------------------------------------
// Default stages inserted when a job is first created
// ---------------------------------------------------------------------------

const DEFAULT_STAGES: Array<{ name: string; position: number; is_locked: boolean }> = [
  { name: 'Applied',    position: 0, is_locked: true },
  { name: 'Screening',  position: 1, is_locked: false },
  { name: 'Interview',  position: 2, is_locked: false },
  { name: 'Offer',      position: 3, is_locked: false },
  { name: 'Hired',      position: 4, is_locked: true },
  { name: 'Rejected',   position: 5, is_locked: true },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MembershipResult =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string };
      membership: { enterprise_id: string; role: string };
    };

async function getMembership(): Promise<MembershipResult> {
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

  if (!membership) return { error: 'No enterprise membership found' };
  return { supabase, user, membership };
}

function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'owner';
}

// ---------------------------------------------------------------------------
// Init default stages after job creation
// ---------------------------------------------------------------------------

export async function initDefaultStages(jobId: string): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can configure pipeline stages' };

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!job) return { error: 'Job not found' };

  const stages = DEFAULT_STAGES.map((s) => ({
    ...s,
    job_id: jobId,
    enterprise_id: membership.enterprise_id,
  }));

  const { error } = await supabase.from('pipeline_stages').insert(stages);
  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Add a stage
// ---------------------------------------------------------------------------

export async function addStage(
  jobId: string,
  name: string,
  afterPosition: number
): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can add pipeline stages' };

  const parsed = pipelineStageSchema.safeParse({ name });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid stage name' };
  }

  // Fetch current stages to shift positions
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, position')
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .order('position', { ascending: true });

  if (!stages) return { error: 'Failed to load stages' };

  const newPosition = afterPosition + 1;

  // Shift all stages at newPosition and above up by 1
  const toShift = stages.filter((s) => (s.position as number) >= newPosition);
  const shiftResults = await Promise.all(
    toShift.map((stage) =>
      supabase
        .from('pipeline_stages')
        .update({ position: (stage.position as number) + 1 })
        .eq('id', stage.id)
        .eq('enterprise_id', membership.enterprise_id)
    )
  );
  const shiftError = shiftResults.find((r) => r.error);
  if (shiftError?.error) return { error: shiftError.error.message };

  const { error } = await supabase.from('pipeline_stages').insert({
    job_id: jobId,
    enterprise_id: membership.enterprise_id,
    name: parsed.data.name,
    position: newPosition,
    is_locked: false,
  });

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Rename a stage
// ---------------------------------------------------------------------------

export async function renameStage(stageId: string, name: string): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can rename stages' };

  const parsed = pipelineStageSchema.safeParse({ name });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid stage name' };
  }

  // Verify stage is not locked and belongs to this enterprise
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('is_locked')
    .eq('id', stageId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (!stage) return { error: 'Stage not found' };
  if (stage.is_locked) return { error: 'This stage cannot be renamed' };

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ name: parsed.data.name })
    .eq('id', stageId)
    .eq('enterprise_id', membership.enterprise_id);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete a stage
// ---------------------------------------------------------------------------

export async function deleteStage(stageId: string): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can delete stages' };

  // Verify stage belongs to this enterprise and is not locked
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('is_locked, job_id')
    .eq('id', stageId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (!stage) return { error: 'Stage not found' };
  if (stage.is_locked) return { error: 'This stage cannot be deleted' };

  // Block if any candidates are in this stage
  const { count } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('pipeline_stage_id', stageId)
    .eq('enterprise_id', membership.enterprise_id);

  if ((count ?? 0) > 0) {
    return {
      error: 'Move or remove all candidates from this stage before deleting it',
    };
  }

  const { error } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', stageId)
    .eq('enterprise_id', membership.enterprise_id);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Reorder stages (up/down)
// ---------------------------------------------------------------------------

export async function moveStageUp(stageId: string): Promise<ActionResult> {
  return moveStage(stageId, 'up');
}

export async function moveStageDown(stageId: string): Promise<ActionResult> {
  return moveStage(stageId, 'down');
}

async function moveStage(stageId: string, direction: 'up' | 'down'): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can reorder stages' };

  // Fetch target stage
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('id, job_id, position, is_locked')
    .eq('id', stageId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (!stage) return { error: 'Stage not found' };
  if (stage.is_locked) return { error: 'This stage cannot be reordered' };

  const jobId = stage.job_id as string;

  // Fetch all non-locked stages for this job, sorted by position
  const { data: allStages } = await supabase
    .from('pipeline_stages')
    .select('id, position, is_locked')
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .eq('is_locked', false)
    .order('position', { ascending: true });

  if (!allStages || allStages.length < 2) return { success: true };

  const typedStages = allStages as PipelineStage[];
  const index = typedStages.findIndex((s) => s.id === stageId);
  if (index === -1) return { error: 'Stage not found in list' };

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= typedStages.length) return { success: true };

  const swapStage = typedStages[swapIndex];

  // Swap positions atomically via RPC to avoid unique(job_id, position) violations
  const { error: swapError } = await supabase.rpc('swap_pipeline_stage_positions', {
    stage_a_id: stageId,
    stage_b_id: swapStage.id,
    enterprise_id_param: membership.enterprise_id,
  });
  if (swapError) return { error: swapError.message };

  return { success: true };
}

// ---------------------------------------------------------------------------
// Get stages for a job
// ---------------------------------------------------------------------------

export async function getStages(jobId: string): Promise<PipelineStage[]> {
  const result = await getMembership();
  if ('error' in result) return [];
  const { supabase, membership } = result;

  const { data } = await supabase
    .from('pipeline_stages')
    .select('id, job_id, enterprise_id, name, position, is_locked, created_at')
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .order('position', { ascending: true });

  return (data ?? []) as PipelineStage[];
}
