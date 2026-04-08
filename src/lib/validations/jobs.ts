import { z } from 'zod';

export const WORK_ARRANGEMENT_OPTIONS = ['remote', 'hybrid', 'on_site'] as const;

export const jobDetailsSchema = z.object({
  title: z.string().min(1, 'Job title is required').max(200, 'Title must be under 200 characters'),
  work_arrangement: z.enum(['remote', 'hybrid', 'on_site'], {
    error: 'Please select a work arrangement',
  }),
  location: z.string().max(200, 'Location must be under 200 characters').optional(),
  salary: z.string().max(200, 'Salary must be under 200 characters').optional(),
  description_overview: z.string().optional(),
  description_responsibilities: z.string().optional(),
  description_requirements: z.string().optional(),
});

export type JobDetailsSchema = z.infer<typeof jobDetailsSchema>;

export const pipelineStageSchema = z.object({
  name: z
    .string()
    .min(1, 'Stage name is required')
    .max(60, 'Stage name must be under 60 characters'),
});

export type PipelineStageSchema = z.infer<typeof pipelineStageSchema>;
