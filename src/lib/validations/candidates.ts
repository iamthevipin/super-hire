import { z } from 'zod';
import type { CandidateSource } from '@/types/candidates';

export const CANDIDATE_SOURCE_OPTIONS = [
  'linkedin',
  'indeed',
  'referral',
  'career_site',
  'other',
] as const;

export const SOURCE_LABELS: Record<CandidateSource, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  referral: 'Referral',
  career_site: 'Career Site',
  other: 'Other',
};

const candidateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().max(50).optional(),
  current_job_title: z.string().max(200).optional(),
  source: z.enum(CANDIDATE_SOURCE_OPTIONS).optional(),
  tags: z.array(z.string().trim().min(1, 'Tag cannot be empty').max(50)).optional(),
});

export type CandidateSchema = z.infer<typeof candidateSchema>;

export const addCandidateSchema = candidateSchema;
export type AddCandidateSchema = CandidateSchema;

export const editCandidateSchema = candidateSchema;
export type EditCandidateSchema = CandidateSchema;

export const moveCandidateStageSchema = z.object({
  application_id: z.string().uuid(),
  new_stage_id: z.string().uuid(),
  rejection_reason: z.string().min(1).optional(),
});

export type MoveCandidateStageSchema = z.infer<typeof moveCandidateStageSchema>;

export const bulkImportRowSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().max(50).optional(),
  source: z.enum(CANDIDATE_SOURCE_OPTIONS).optional(),
  tags: z.string().optional(),
  current_job_title: z.string().max(200).optional(),
});

export type BulkImportRow = z.infer<typeof bulkImportRowSchema>;
