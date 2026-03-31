-- =============================================================================
-- Migration 002: Jobs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
CREATE TABLE jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  title         text NOT NULL,
  department    text,
  location      text,
  type          text NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract', 'internship')),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  description   text,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see jobs belonging to their enterprise
CREATE POLICY "jobs: members can view their enterprise jobs"
  ON jobs FOR SELECT
  USING (
    enterprise_id IN (
      SELECT enterprise_id
      FROM enterprise_members
      WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_jobs_enterprise_id ON jobs(enterprise_id);
CREATE INDEX idx_jobs_created_by    ON jobs(created_by);
CREATE INDEX idx_jobs_status        ON jobs(status);
