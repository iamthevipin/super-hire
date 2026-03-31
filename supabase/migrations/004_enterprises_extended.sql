-- =============================================================================
-- Migration 004: Extend enterprises table + add INSERT RLS policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Add onboarding fields to enterprises
-- ---------------------------------------------------------------------------
ALTER TABLE enterprises
  ADD COLUMN website_url    text,
  ADD COLUMN employee_count text,
  ADD COLUMN city           text,
  ADD COLUMN state          text,
  ADD COLUMN country        text;

-- ---------------------------------------------------------------------------
-- RLS: authenticated users can create an enterprise
-- ---------------------------------------------------------------------------
CREATE POLICY "enterprises: authenticated users can create"
  ON enterprises FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- RLS: members can update their own enterprise
-- ---------------------------------------------------------------------------
CREATE POLICY "enterprises: members can update their enterprise"
  ON enterprises FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT enterprise_id
      FROM enterprise_members
      WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: authenticated users can insert their own membership row
-- The check ensures a user can only insert a row for themselves.
-- ---------------------------------------------------------------------------
CREATE POLICY "enterprise_members: users can insert their own membership"
  ON enterprise_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
