export type WorkArrangement = 'remote' | 'hybrid' | 'on_site';

export type JobStatus = 'open' | 'closed';

export interface Job {
  id: string;
  enterprise_id: string;
  title: string;
  location: string | null;
  work_arrangement: WorkArrangement | null;
  salary: string | null;
  description_overview: string | null;
  description_responsibilities: string | null;
  description_requirements: string | null;
  status: JobStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  job_id: string;
  enterprise_id: string;
  name: string;
  position: number;
  is_locked: boolean;
  created_at: string;
}

export interface JobWithStats extends Job {
  candidateCount: number;
}

export interface JobMetrics {
  totalActive: number;
  totalCandidates: number;
  totalHired: number;
}
