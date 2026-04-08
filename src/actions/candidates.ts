'use server';

import { createClient } from '@/lib/supabase/server';
import { addCandidateSchema, editCandidateSchema } from '@/lib/validations/candidates';
import { logActivity } from '@/actions/activity';
import type { CandidateDetail, ApplicationWithCandidate, Candidate } from '@/types/candidates';

function getActorName(user: { user_metadata?: { full_name?: string }; email?: string }): string {
  return user.user_metadata?.full_name ?? user.email ?? 'Team member';
}

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export async function addCandidate(
  jobId: string,
  formData: FormData
): Promise<{ error?: string; applicationId?: string }> {
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

  const tagsRaw = formData.get('tags');
  let parsedTags: string[] | undefined;
  if (tagsRaw) {
    if (typeof tagsRaw !== 'string') return { error: 'Invalid tags format' };
    try {
      parsedTags = JSON.parse(tagsRaw);
    } catch {
      return { error: 'Invalid tags format' };
    }
  }

  const resumeFile = formData.get('resume_file');

  const rawData = {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    current_job_title: formData.get('current_job_title') || undefined,
    source: formData.get('source') || undefined,
    tags: parsedTags,
  };

  const parsed = addCandidateSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { first_name, last_name, email, phone, current_job_title, source, tags } = parsed.data;

  const { data: existingCandidate } = await supabase
    .from('candidates')
    .select('id')
    .eq('enterprise_id', membership.enterprise_id)
    .eq('email', email)
    .single();

  let candidateId: string;

  if (existingCandidate) {
    candidateId = existingCandidate.id;

    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .eq('enterprise_id', membership.enterprise_id)
      .single();

    if (existingApp) {
      return { error: 'A candidate with this email already exists in this job' };
    }
  } else {
    const { data: newCandidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        enterprise_id: membership.enterprise_id,
        first_name,
        last_name,
        email,
        phone: phone ?? null,
        current_job_title: current_job_title ?? null,
      })
      .select('id')
      .single();

    if (candidateError || !newCandidate) return { error: candidateError?.message ?? 'Failed to create candidate' };
    candidateId = newCandidate.id;

    if (resumeFile instanceof File && resumeFile.size > 0) {
      const ext = MIME_TO_EXT[resumeFile.type];
      if (!ext) {
        await supabase.from('candidates').delete().eq('id', candidateId).eq('enterprise_id', membership.enterprise_id);
        return { error: 'Unsupported file type' };
      }
      const path = `${membership.enterprise_id}/${candidateId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(path, resumeFile);
      if (uploadError) {
        await supabase.from('candidates').delete().eq('id', candidateId).eq('enterprise_id', membership.enterprise_id);
        return { error: `Resume upload failed: ${uploadError.message}` };
      }
      const { error: resumeUpdateError } = await supabase
        .from('candidates')
        .update({ resume_path: path })
        .eq('id', candidateId)
        .eq('enterprise_id', membership.enterprise_id);
      if (resumeUpdateError) {
        await supabase.from('candidates').delete().eq('id', candidateId).eq('enterprise_id', membership.enterprise_id);
        return { error: resumeUpdateError.message };
      }
    }
  }

  const { data: appliedStage } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .eq('is_locked', true)
    .ilike('name', 'applied')
    .single();

  if (!appliedStage) return { error: 'Applied stage not found for this job' };

  const { data: application, error: appError } = await supabase
    .from('applications')
    .insert({
      enterprise_id: membership.enterprise_id,
      job_id: jobId,
      candidate_id: candidateId,
      pipeline_stage_id: appliedStage.id,
      source: source ?? null,
      tags: tags ?? [],
    })
    .select('id')
    .single();

  if (appError || !application) return { error: appError?.message ?? 'Failed to create application' };

  const candidateName = `${first_name} ${last_name}`;
  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: candidateId,
    application_id: application.id,
    event_type: 'candidate_created',
    actor_id: user.id,
    actor_name: getActorName(user),
    description: `${getActorName(user)} added ${candidateName} to the job`,
  });

  return { applicationId: application.id };
}

export async function editCandidate(
  applicationId: string,
  formData: FormData
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

  const { data: application } = await supabase
    .from('applications')
    .select('id, candidate_id, job_id')
    .eq('id', applicationId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!application) return { error: 'Application not found' };

  const tagsRaw = formData.get('tags');
  let parsedTags: string[] | undefined;
  if (tagsRaw) {
    if (typeof tagsRaw !== 'string') return { error: 'Invalid tags format' };
    try {
      parsedTags = JSON.parse(tagsRaw);
    } catch {
      return { error: 'Invalid tags format' };
    }
  }

  const rawData = {
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    current_job_title: formData.get('current_job_title') || undefined,
    source: formData.get('source') || undefined,
    tags: parsedTags,
  };

  const parsed = editCandidateSchema.safeParse(rawData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { first_name, last_name, email, phone, current_job_title, source, tags } = parsed.data;

  const { data: emailConflict } = await supabase
    .from('candidates')
    .select('id')
    .eq('enterprise_id', membership.enterprise_id)
    .eq('email', email)
    .neq('id', application.candidate_id)
    .single();

  if (emailConflict) return { error: 'Another candidate with this email already exists' };

  const { error: candidateError } = await supabase
    .from('candidates')
    .update({
      first_name,
      last_name,
      email,
      phone: phone ?? null,
      current_job_title: current_job_title ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', application.candidate_id)
    .eq('enterprise_id', membership.enterprise_id);

  if (candidateError) return { error: candidateError.message };

  const { error: appError } = await supabase
    .from('applications')
    .update({
      source: source ?? null,
      tags: tags ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('enterprise_id', membership.enterprise_id);

  if (appError) return { error: appError.message };
  return {};
}

export async function deleteCandidate(applicationId: string): Promise<{ error?: string }> {
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
    return { error: 'Only admins can delete candidates' };
  }

  const { data: application } = await supabase
    .from('applications')
    .select('id, candidate_id')
    .eq('id', applicationId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!application) return { error: 'Application not found' };

  const { data: candidateData } = await supabase
    .from('candidates')
    .select('id, resume_path')
    .eq('id', application.candidate_id)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  const { error: deleteAppError } = await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)
    .eq('enterprise_id', membership.enterprise_id);

  if (deleteAppError) return { error: deleteAppError.message };

  const { count } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('candidate_id', application.candidate_id)
    .eq('enterprise_id', membership.enterprise_id);

  if (count === 0) {
    if (candidateData?.resume_path) {
      await supabase.storage.from('resumes').remove([candidateData.resume_path]);
    }
    await supabase
      .from('candidates')
      .delete()
      .eq('id', application.candidate_id)
      .eq('enterprise_id', membership.enterprise_id);
  }

  return {};
}

export async function addCandidateToJob(
  candidateId: string,
  jobId: string
): Promise<{ error?: string; applicationId?: string }> {
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

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id')
    .eq('id', candidateId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!candidate) return { error: 'Candidate not found' };

  const { data: existingApp } = await supabase
    .from('applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('candidate_id', candidateId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (existingApp) return { error: 'Candidate is already in this job' };

  const { data: appliedStage } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('job_id', jobId)
    .eq('enterprise_id', membership.enterprise_id)
    .eq('is_locked', true)
    .ilike('name', 'applied')
    .single();

  if (!appliedStage) return { error: 'Applied stage not found for this job' };

  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      enterprise_id: membership.enterprise_id,
      job_id: jobId,
      candidate_id: candidateId,
      pipeline_stage_id: appliedStage.id,
      tags: [],
    })
    .select('id')
    .single();

  if (error || !application) return { error: error?.message ?? 'Failed to add candidate to job' };

  const { data: candidateData } = await supabase
    .from('candidates')
    .select('first_name, last_name')
    .eq('id', candidateId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  const candidateName = candidateData
    ? `${candidateData.first_name} ${candidateData.last_name}`
    : 'Candidate';

  await logActivity({
    supabase,
    enterprise_id: membership.enterprise_id,
    candidate_id: candidateId,
    application_id: application.id,
    event_type: 'candidate_created',
    actor_id: user.id,
    actor_name: getActorName(user),
    description: `${getActorName(user)} added ${candidateName} to the job`,
  });

  return { applicationId: application.id };
}

export async function getCandidateDetail(
  applicationId: string
): Promise<{ data?: CandidateDetail; error?: string }> {
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
    .select(
      `
      id, enterprise_id, job_id, candidate_id, pipeline_stage_id, owner_id,
      tags, source, rejection_reason, notes, created_at, updated_at,
      candidate:candidates(id, enterprise_id, first_name, last_name, email, phone,
        linkedin_url, current_job_title, resume_path, created_at, updated_at),
      pipeline_stage:pipeline_stages(id, job_id, enterprise_id, name, position, is_locked, created_at)
    `
    )
    .eq('id', applicationId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();

  if (!application) return { error: 'Application not found' };

  const { data: otherApps } = await supabase
    .from('applications')
    .select(
      `
      id,
      job_id,
      created_at,
      pipeline_stage:pipeline_stages(name),
      job:jobs(title)
    `
    )
    .eq('candidate_id', application.candidate_id)
    .eq('enterprise_id', membership.enterprise_id)
    .neq('id', applicationId);

  const other_applications = (otherApps ?? []).map((a) => {
    const job = a.job as unknown as { title: string } | null;
    const stage = a.pipeline_stage as unknown as { name: string } | null;
    return {
      id: a.id,
      job_id: a.job_id,
      job_title: job?.title ?? 'Unknown job',
      stage_name: stage?.name ?? null,
      created_at: a.created_at,
    };
  });

  return {
    data: {
      application: application as unknown as ApplicationWithCandidate,
      candidate: application.candidate as unknown as Candidate,
      other_applications,
    },
  };
}

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_RESUME_SIZE = 10 * 1024 * 1024;

export async function uploadResume(
  applicationId: string,
  formData: FormData
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

  const { data: application } = await supabase
    .from('applications')
    .select('id, candidate_id')
    .eq('id', applicationId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!application) return { error: 'Application not found' };

  const file = formData.get('resume_file');
  if (!(file instanceof File) || file.size === 0) return { error: 'No file provided' };

  if (!ALLOWED_RESUME_TYPES.includes(file.type)) {
    return { error: 'Only PDF, DOC, and DOCX files are allowed' };
  }
  if (file.size > MAX_RESUME_SIZE) {
    return { error: 'File size must be 10MB or less' };
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) return { error: 'Unsupported file type' };
  const path = `${membership.enterprise_id}/${application.candidate_id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('resumes').upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase
    .from('candidates')
    .update({ resume_path: path, updated_at: new Date().toISOString() })
    .eq('id', application.candidate_id)
    .eq('enterprise_id', membership.enterprise_id);

  if (updateError) return { error: updateError.message };
  return {};
}

export async function getResumeSignedUrl(
  applicationId: string
): Promise<{ url?: string; error?: string }> {
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
    .select('candidate_id')
    .eq('id', applicationId)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!application) return { error: 'Application not found' };

  const { data: candidate } = await supabase
    .from('candidates')
    .select('resume_path')
    .eq('id', application.candidate_id)
    .eq('enterprise_id', membership.enterprise_id)
    .single();
  if (!candidate?.resume_path) return { error: 'No resume found' };

  const { data, error } = await supabase.storage
    .from('resumes')
    .createSignedUrl(candidate.resume_path, 3600);

  if (error || !data?.signedUrl) return { error: error?.message ?? 'Failed to generate URL' };
  return { url: data.signedUrl };
}
