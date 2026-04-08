import type { PipelineStage } from '@/types/jobs';

export type CandidateSource = 'linkedin' | 'indeed' | 'referral' | 'career_site' | 'other';

export interface Candidate {
  id: string;
  enterprise_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  current_job_title: string | null;
  resume_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  enterprise_id: string;
  job_id: string;
  candidate_id: string;
  pipeline_stage_id: string | null;
  owner_id: string | null;
  tags: string[];
  source: CandidateSource | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationWithCandidate extends Application {
  candidate: Candidate;
  pipeline_stage: PipelineStage | null;
}

export interface KanbanColumn {
  stage: PipelineStage;
  applications: ApplicationWithCandidate[];
}

export interface ApplicationInOtherJob {
  id: string;
  job_id: string;
  job_title: string;
  stage_name: string | null;
  created_at: string;
}

export interface CandidateDetail {
  application: ApplicationWithCandidate;
  candidate: Candidate;
  other_applications: ApplicationInOtherJob[];
}
