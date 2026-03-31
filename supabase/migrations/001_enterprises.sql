-- =============================================================================
-- Migration 001: Enterprises & Members
-- =============================================================================

-- ---------------------------------------------------------------------------
-- enterprises
-- ---------------------------------------------------------------------------
CREATE TABLE enterprises (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text NOT NULL UNIQUE,
  logo_url     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;

-- Users can only see the enterprise(s) they belong to
CREATE POLICY "enterprises: members can view their enterprise"
  ON enterprises FOR SELECT
  USING (
    id IN (
      SELECT enterprise_id
      FROM enterprise_members
      WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- enterprise_members
-- ---------------------------------------------------------------------------
CREATE TABLE enterprise_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (enterprise_id, user_id)
);

ALTER TABLE enterprise_members ENABLE ROW LEVEL SECURITY;

-- Users can only see memberships within their own enterprise
CREATE POLICY "enterprise_members: members can view their enterprise members"
  ON enterprise_members FOR SELECT
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
CREATE INDEX idx_enterprise_members_enterprise_id ON enterprise_members(enterprise_id);
CREATE INDEX idx_enterprise_members_user_id       ON enterprise_members(user_id);
CREATE UNIQUE INDEX idx_enterprises_slug          ON enterprises(slug);
