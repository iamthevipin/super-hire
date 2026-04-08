-- =============================================================================
-- Migration 009: Jobs schema update + Pipeline Stages
--
-- 1. Alter jobs table to match Phase 2 PRD:
--    - Drop type column (was full-time/part-time/contract — not in PRD)
--    - Drop department column (P2, not in MVP scope)
--    - Rename description → description_overview
--    - Add description_responsibilities, description_requirements
--    - Add work_arrangement (remote/hybrid/on_site)
--    - Add salary (free text)
--    - Change status to ('open','closed') with default 'open'
--    - Add INSERT/UPDATE/DELETE RLS policies for admins/owners
--
-- 2. Create pipeline_stages table:
--    - Independent per job
--    - is_locked = true for Applied, Hired, Rejected (cannot rename/reorder/delete)
--    - position int for ordering
--
-- 3. Update applications table:
--    - Drop old hardcoded stage text column
--    - Add pipeline_stage_id uuid FK (nullable — Phase 3 enforces NOT NULL)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Alter jobs table
-- (columns already applied: type/department dropped, description renamed,
--  description_responsibilities, description_requirements, work_arrangement,
--  salary added — only constraints and RLS remain)
-- ---------------------------------------------------------------------------

-- Update status constraint: drop old, add new
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
    CHECK (status IN ('open', 'closed'));

-- Reset default and existing rows
ALTER TABLE public.jobs ALTER COLUMN status SET DEFAULT 'open';
UPDATE public.jobs SET status = 'open' WHERE status NOT IN ('open', 'closed');

-- Work arrangement constraint (applied after backfill — new jobs only)
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_work_arrangement_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_work_arrangement_check
    CHECK (work_arrangement IN ('remote', 'hybrid', 'on_site') OR work_arrangement IS NULL);

-- ---------------------------------------------------------------------------
-- 1a. RLS INSERT/UPDATE/DELETE for jobs (admin/owner only)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "jobs: admins can insert"    ON public.jobs;
DROP POLICY IF EXISTS "jobs: admins can update"    ON public.jobs;
DROP POLICY IF EXISTS "jobs: admins can delete"    ON public.jobs;

CREATE POLICY "jobs: admins can insert"
  ON public.jobs FOR INSERT
  WITH CHECK (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = jobs.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "jobs: admins can update"
  ON public.jobs FOR UPDATE
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = jobs.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "jobs: admins can delete"
  ON public.jobs FOR DELETE
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = jobs.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Create pipeline_stages table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  enterprise_id uuid        NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  position      integer     NOT NULL,
  is_locked     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (job_id, position)
);

-- Indexes
CREATE INDEX IF NOT EXISTS pipeline_stages_job_id_idx        ON public.pipeline_stages(job_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_enterprise_id_idx ON public.pipeline_stages(enterprise_id);

-- RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- All enterprise members can read stages
CREATE POLICY "pipeline_stages: members can select"
  ON public.pipeline_stages FOR SELECT
  USING (enterprise_id IN (SELECT public.get_my_enterprise_ids()));

-- Only admins/owners can insert, update, delete
CREATE POLICY "pipeline_stages: admins can insert"
  ON public.pipeline_stages FOR INSERT
  WITH CHECK (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = pipeline_stages.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "pipeline_stages: admins can update"
  ON public.pipeline_stages FOR UPDATE
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = pipeline_stages.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "pipeline_stages: admins can delete"
  ON public.pipeline_stages FOR DELETE
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = pipeline_stages.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Update applications table
-- ---------------------------------------------------------------------------

ALTER TABLE public.applications
  DROP COLUMN IF EXISTS stage;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS pipeline_stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS applications_pipeline_stage_id_idx ON public.applications(pipeline_stage_id);
