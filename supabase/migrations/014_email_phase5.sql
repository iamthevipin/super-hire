-- =============================================================================
-- Migration 014: Email Phase 5 — Gmail integration + sent email log
--
-- 1. user_integrations table:
--    - Stores per-admin OAuth tokens for Gmail
--    - One row per (user_id, provider) — enforced with UNIQUE constraint
--    - RLS: users can only read/write their own row
--
-- 2. candidate_emails table:
--    - Sent email log per candidate
--    - RLS: admins/owners can select all in enterprise; admins can insert own
--    - Replica identity FULL for Supabase real-time subscriptions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. user_integrations table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_integrations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id    uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  provider         text NOT NULL CHECK (provider IN ('gmail')),
  gmail_address    text NOT NULL,
  access_token     text NOT NULL,
  refresh_token    text,
  token_expires_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- Index for enterprise lookups
CREATE INDEX IF NOT EXISTS user_integrations_enterprise_id_idx
  ON public.user_integrations(enterprise_id);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own integration rows
DROP POLICY IF EXISTS "user_integrations: owner can select" ON public.user_integrations;
CREATE POLICY "user_integrations: owner can select"
  ON public.user_integrations FOR SELECT
  USING (user_id = auth.uid());

-- RLS: users can insert their own integration rows
DROP POLICY IF EXISTS "user_integrations: owner can insert" ON public.user_integrations;
CREATE POLICY "user_integrations: owner can insert"
  ON public.user_integrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS: users can update their own integration rows
DROP POLICY IF EXISTS "user_integrations: owner can update" ON public.user_integrations;
CREATE POLICY "user_integrations: owner can update"
  ON public.user_integrations FOR UPDATE
  USING (user_id = auth.uid());

-- RLS: users can delete their own integration rows
DROP POLICY IF EXISTS "user_integrations: owner can delete" ON public.user_integrations;
CREATE POLICY "user_integrations: owner can delete"
  ON public.user_integrations FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. candidate_emails table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.candidate_emails (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id        uuid NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  candidate_id         uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  sender_user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name          text NOT NULL,
  sender_gmail_address text NOT NULL,
  subject              text NOT NULL,
  body_html            text NOT NULL,
  body_text            text NOT NULL,
  sent_at              timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS candidate_emails_candidate_id_idx
  ON public.candidate_emails(candidate_id);

CREATE INDEX IF NOT EXISTS candidate_emails_enterprise_id_idx
  ON public.candidate_emails(enterprise_id);

CREATE INDEX IF NOT EXISTS candidate_emails_sent_at_idx
  ON public.candidate_emails(sent_at DESC);

-- Enable replica identity FULL for Supabase real-time subscriptions
ALTER TABLE public.candidate_emails REPLICA IDENTITY FULL;

-- Enable RLS
ALTER TABLE public.candidate_emails ENABLE ROW LEVEL SECURITY;

-- RLS: admins/owners can select all sent emails in their enterprise
DROP POLICY IF EXISTS "candidate_emails: admins can select" ON public.candidate_emails;
CREATE POLICY "candidate_emails: admins can select"
  ON public.candidate_emails FOR SELECT
  USING (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = candidate_emails.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );

-- RLS: admins/owners can insert sent emails
DROP POLICY IF EXISTS "candidate_emails: admins can insert" ON public.candidate_emails;
CREATE POLICY "candidate_emails: admins can insert"
  ON public.candidate_emails FOR INSERT
  WITH CHECK (
    enterprise_id IN (SELECT public.get_my_enterprise_ids())
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = candidate_emails.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );
