-- =============================================================================
-- Migration 005: Pending Invites
-- =============================================================================

-- ---------------------------------------------------------------------------
-- pending_invites
-- ---------------------------------------------------------------------------
CREATE TABLE public.pending_invites (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid        NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  email         text        NOT NULL,
  role          text        NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by    uuid        NOT NULL REFERENCES auth.users(id),
  invite_token  text        NOT NULL UNIQUE,
  status        text        NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'expired')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX pending_invites_enterprise_id_idx ON public.pending_invites(enterprise_id);
CREATE INDEX pending_invites_invite_token_idx  ON public.pending_invites(invite_token);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enterprise members can select pending invites"
  ON public.pending_invites FOR SELECT
  USING (
    enterprise_id IN (
      SELECT enterprise_id FROM public.enterprise_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "enterprise members can insert pending invites"
  ON public.pending_invites FOR INSERT
  WITH CHECK (
    enterprise_id IN (
      SELECT enterprise_id FROM public.enterprise_members
      WHERE user_id = auth.uid()
    )
  );
