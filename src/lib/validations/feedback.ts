import { z } from 'zod';

export const setRatingSchema = z.object({
  candidate_id: z.string().uuid(),
  pipeline_stage_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
});

export const upsertCommentSchema = z.object({
  candidate_id: z.string().uuid(),
  pipeline_stage_id: z.string().uuid(),
  body: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
});

export const noteSchema = z.object({
  candidate_id: z.string().uuid(),
  pipeline_stage_id: z.string().uuid(),
  body: z.string().trim().min(1, 'Note cannot be empty').max(5000),
});

export const updateNoteSchema = z.object({
  note_id: z.string().uuid(),
  body: z.string().trim().min(1, 'Note cannot be empty').max(5000),
});
