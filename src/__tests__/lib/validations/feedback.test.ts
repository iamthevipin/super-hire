import { describe, it, expect } from 'vitest';
import { setRatingSchema, upsertCommentSchema, noteSchema, updateNoteSchema } from '@/lib/validations/feedback';

const validUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('setRatingSchema', () => {
  it('accepts a valid rating of 1', () => {
    const result = setRatingSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      rating: 1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid rating of 5', () => {
    const result = setRatingSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      rating: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects rating below 1', () => {
    const result = setRatingSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      rating: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = setRatingSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      rating: 6,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = setRatingSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      rating: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid candidate_id uuid', () => {
    const result = setRatingSchema.safeParse({
      candidate_id: 'not-a-uuid',
      pipeline_stage_id: validUuid,
      rating: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe('upsertCommentSchema', () => {
  it('accepts valid comment', () => {
    const result = upsertCommentSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: 'Great candidate',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty body', () => {
    const result = upsertCommentSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Comment cannot be empty');
    }
  });

  it('rejects whitespace-only body', () => {
    const result = upsertCommentSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects body exceeding 2000 chars', () => {
    const result = upsertCommentSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts body of exactly 2000 chars', () => {
    const result = upsertCommentSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: 'a'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });
});

describe('noteSchema', () => {
  it('accepts valid note', () => {
    const result = noteSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: 'Strong technical background',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty body', () => {
    const result = noteSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Note cannot be empty');
    }
  });

  it('rejects whitespace-only body', () => {
    const result = noteSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects body exceeding 5000 chars', () => {
    const result = noteSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts body of exactly 5000 chars', () => {
    const result = noteSchema.safeParse({
      candidate_id: validUuid,
      pipeline_stage_id: validUuid,
      body: 'a'.repeat(5000),
    });
    expect(result.success).toBe(true);
  });
});

describe('updateNoteSchema', () => {
  it('accepts valid update', () => {
    const result = updateNoteSchema.safeParse({
      note_id: validUuid,
      body: 'Updated note content',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid note_id', () => {
    const result = updateNoteSchema.safeParse({
      note_id: 'not-a-uuid',
      body: 'Content',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty body', () => {
    const result = updateNoteSchema.safeParse({
      note_id: validUuid,
      body: '',
    });
    expect(result.success).toBe(false);
  });
});
