-- =============================================================================
-- Migration 010: Candidates Phase 3 — schema additions + RLS
--
-- 1. candidates table:
--    - Add current_job_title (nullable text)
--    - Add resume_path (storage path, replaces resume_url concept)
--    - Add INSERT/UPDATE/DELETE RLS policies for enterprise members
--
-- 2. applications table:
--    - Add owner_id (references auth.users, nullable)
--    - Add tags (text array, default empty)
--    - Add source enum (linkedin/indeed/referral/career_site/other)
--    - Add rejection_reason (nullable text)
--    - Add INSERT/UPDATE/DELETE RLS policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Alter candidates table
-- ---------------------------------------------------------------------------

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS current_job_title text,
  ADD COLUMN IF NOT EXISTS resume_path text;

-- RLS: any enterprise member can insert candidates
DROP POLICY IF EXISTS "candidates: members can insert" ON public.candidates;
CREATE POLICY "candidates: members can insert"
  ON public.candidates FOR INSERT
  WITH CHECK (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
  );

-- RLS: any enterprise member can update candidates
DROP POLICY IF EXISTS "candidates: members can update" ON public.candidates;
CREATE POLICY "candidates: members can update"
  ON public.candidates FOR UPDATE
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
  );

-- RLS: only admins/owners can delete candidates
DROP POLICY IF EXISTS "candidates: admins can delete" ON public.candidates;
CREATE POLICY "candidates: admins can delete"
  ON public.candidates FOR DELETE
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = candidates.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Alter applications table
-- ---------------------------------------------------------------------------

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS owner_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags            text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source         text CHECK (source IN ('linkedin', 'indeed', 'referral', 'career_site', 'other')),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Index on owner_id for filtering by owner
CREATE INDEX IF NOT EXISTS applications_owner_id_idx ON public.applications(owner_id);

-- RLS: any enterprise member can insert applications
DROP POLICY IF EXISTS "applications: members can insert" ON public.applications;
CREATE POLICY "applications: members can insert"
  ON public.applications FOR INSERT
  WITH CHECK (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
  );

-- RLS: any enterprise member can update applications
DROP POLICY IF EXISTS "applications: members can update" ON public.applications;
CREATE POLICY "applications: members can update"
  ON public.applications FOR UPDATE
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
  );

-- RLS: only admins/owners can delete applications
DROP POLICY IF EXISTS "applications: admins can delete" ON public.applications;
CREATE POLICY "applications: admins can delete"
  ON public.applications FOR DELETE
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = applications.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );
