-- =============================================================================
-- Migration 003: Candidates & Applications
-- =============================================================================

-- ---------------------------------------------------------------------------
-- candidates
-- ---------------------------------------------------------------------------
CREATE TABLE candidates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  email         text NOT NULL,
  phone         text,
  linkedin_url  text,
  resume_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (enterprise_id, email)
);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Users can only see candidates within their enterprise
CREATE POLICY "candidates: members can view their enterprise candidates"
  ON candidates FOR SELECT
  USING (
    enterprise_id IN (
      SELECT enterprise_id
      FROM enterprise_members
      WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
CREATE TABLE applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  job_id        uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id  uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage         text NOT NULL DEFAULT 'applied'
                  CHECK (stage IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (job_id, candidate_id)
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Users can only see applications within their enterprise
CREATE POLICY "applications: members can view their enterprise applications"
  ON applications FOR SELECT
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
CREATE INDEX idx_candidates_enterprise_id   ON candidates(enterprise_id);
CREATE INDEX idx_applications_enterprise_id ON applications(enterprise_id);
CREATE INDEX idx_applications_job_id        ON applications(job_id);
CREATE INDEX idx_applications_candidate_id  ON applications(candidate_id);
CREATE INDEX idx_applications_stage         ON applications(stage);
