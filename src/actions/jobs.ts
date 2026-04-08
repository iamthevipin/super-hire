'use server';

import { createClient } from '@/lib/supabase/server';
import { jobDetailsSchema } from '@/lib/validations/jobs';
import type { JobStatus, JobWithStats, JobMetrics } from '@/types/jobs';

type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; data: T })
  | { error: string };

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
// Read
// ---------------------------------------------------------------------------

export async function getJobs(status: JobStatus = 'open'): Promise<JobWithStats[]> {
  const result = await getMembership();
  if ('error' in result) return [];
  const { supabase, membership } = result;

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, enterprise_id, title, location, work_arrangement, salary, description_overview, description_responsibilities, description_requirements, status, created_by, created_at, updated_at')
    .eq('enterprise_id', membership.enterprise_id)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (!jobs) return [];

  // Get candidate counts per job (applications with any pipeline_stage_id)
  const { data: counts } = await supabase
    .from('applications')
    .select('job_id')
    .eq('enterprise_id', membership.enterprise_id)
    .not('pipeline_stage_id', 'is', null);

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.job_id] = (countMap[row.job_id] ?? 0) + 1;
  }

  return jobs.map((job) => ({
    ...job,
    work_arrangement: job.work_arrangement as JobWithStats['work_arrangement'],
    status: job.status as JobStatus,
    candidateCount: countMap[job.id] ?? 0,
  }));
}

export async function getJobMetrics(): Promise<JobMetrics> {
  const result = await getMembership();
  if ('error' in result) return { totalActive: 0, totalCandidates: 0, totalHired: 0 };
  const { supabase, membership } = result;

  const [{ count: totalActive }, { data: applications }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('enterprise_id', membership.enterprise_id)
      .eq('status', 'open'),
    supabase
      .from('applications')
      .select('pipeline_stage_id, pipeline_stages!inner(name, is_locked)')
      .eq('enterprise_id', membership.enterprise_id)
      .not('pipeline_stage_id', 'is', null),
  ]);

  let totalCandidates = 0;
  let totalHired = 0;

  for (const app of applications ?? []) {
    const stage = app.pipeline_stages as unknown as { name: string; is_locked: boolean } | null;
    if (!stage) continue;
    if (stage.name === 'Hired') {
      totalHired += 1;
    } else if (stage.name !== 'Rejected') {
      totalCandidates += 1;
    }
  }

  return {
    totalActive: totalActive ?? 0,
    totalCandidates,
    totalHired,
  };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createJob(
  formData: FormData
): Promise<{ error: string } | { jobId: string }> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, user, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can create jobs' };

  const raw = {
    title: formData.get('title') as string,
    work_arrangement: formData.get('work_arrangement') as string,
    location: (formData.get('location') as string) || undefined,
    salary: (formData.get('salary') as string) || undefined,
    description_overview: (formData.get('description_overview') as string) || undefined,
    description_responsibilities: (formData.get('description_responsibilities') as string) || undefined,
    description_requirements: (formData.get('description_requirements') as string) || undefined,
  };

  const parsed = jobDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      ...parsed.data,
      enterprise_id: membership.enterprise_id,
      created_by: user.id,
      status: 'open',
    })
    .select('id')
    .single();

  if (error || !data) return { error: error?.message ?? 'Failed to create job' };
  return { jobId: data.id as string };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateJob(
  jobId: string,
  formData: FormData
): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can edit jobs' };

  const raw = {
    title: formData.get('title') as string,
    work_arrangement: formData.get('work_arrangement') as string,
    location: (formData.get('location') as string) || undefined,
    salary: (formData.get('salary') as string) || undefined,
    description_overview: (formData.get('description_overview') as string) || undefined,
    description_responsibilities: (formData.get('description_responsibilities') as string) || undefined,
    description_requirements: (formData.get('description_requirements') as string) || undefined,
  };

  const parsed = jobDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { error } = await supabase
    .from('jobs')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Close / Reopen
// ---------------------------------------------------------------------------

export async function closeJob(jobId: string): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can close jobs' };

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function reopenJob(jobId: string): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can reopen jobs' };

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'open', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteJob(jobId: string): Promise<ActionResult> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can delete jobs' };

  // Block if any candidates exist in this job's pipeline
  const { count } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id);

  if ((count ?? 0) > 0) {
    return {
      error:
        'This job cannot be deleted because it has candidates in the pipeline. Remove all candidates first or close the job instead.',
    };
  }

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)
    .eq('enterprise_id', membership.enterprise_id);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Create from template
// ---------------------------------------------------------------------------

export async function createJobFromTemplate(
  templateJobId: string,
  formData: FormData
): Promise<{ error: string } | { jobId: string }> {
  const result = await getMembership();
  if ('error' in result) return { error: result.error };
  const { supabase, user, membership } = result;

  if (!isAdmin(membership.role)) return { error: 'Only admins can create jobs' };

  // Fetch the template job (with enterprise_id check for security)
  const { data: template } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', templateJobId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (!template) return { error: 'Template job not found' };

  // Fetch template pipeline stages
  const { data: templateStages } = await supabase
    .from('pipeline_stages')
    .select('name, position, is_locked')
    .eq('job_id', templateJobId)
    .eq('enterprise_id', membership.enterprise_id)
    .order('position', { ascending: true });

  const raw = {
    title: formData.get('title') as string,
    work_arrangement: formData.get('work_arrangement') as string,
    location: (formData.get('location') as string) || undefined,
    salary: (formData.get('salary') as string) || undefined,
    description_overview: (formData.get('description_overview') as string) || undefined,
    description_responsibilities: (formData.get('description_responsibilities') as string) || undefined,
    description_requirements: (formData.get('description_requirements') as string) || undefined,
  };

  const parsed = jobDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert({
      ...parsed.data,
      enterprise_id: membership.enterprise_id,
      created_by: user.id,
      status: 'open',
    })
    .select('id')
    .single();

  if (jobError || !newJob) return { error: jobError?.message ?? 'Failed to create job' };

  const newJobId = newJob.id as string;

  // Copy pipeline stages from template
  if (templateStages && templateStages.length > 0) {
    const stagesToInsert = templateStages.map((s) => ({
      job_id: newJobId,
      enterprise_id: membership.enterprise_id,
      name: s.name as string,
      position: s.position as number,
      is_locked: s.is_locked as boolean,
    }));

    const { error: stagesError } = await supabase
      .from('pipeline_stages')
      .insert(stagesToInsert);

    if (stagesError) return { error: stagesError.message };
  }

  return { jobId: newJobId };
}
