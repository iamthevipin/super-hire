-- =============================================================================
-- Migration 007: Add UPDATE and DELETE RLS policies for pending_invites
--
-- Migration 005 only created SELECT and INSERT policies. Without UPDATE and
-- DELETE policies, resendInvite and cancelInvite server actions fail silently
-- when using the regular (non-admin) Supabase client.
--
-- Both policies restrict to admins and owners within the user's own enterprise.
-- =============================================================================

DROP POLICY IF EXISTS "enterprise admins can update pending invites" ON public.pending_invites;
DROP POLICY IF EXISTS "enterprise admins can delete pending invites" ON public.pending_invites;

CREATE POLICY "enterprise admins can update pending invites"
  ON public.pending_invites FOR UPDATE
  USING (
    enterprise_id IN (
      SELECT public.get_my_enterprise_ids()
    )
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = pending_invites.enterprise_id
        AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    enterprise_id IN (
      SELECT public.get_my_enterprise_ids()
    )
  );

CREATE POLICY "enterprise admins can delete pending invites"
  ON public.pending_invites FOR DELETE
  USING (
    enterprise_id IN (
      SELECT public.get_my_enterprise_ids()
    )
    AND EXISTS (
      SELECT 1 FROM public.enterprise_members
      WHERE user_id = auth.uid()
        AND enterprise_id = pending_invites.enterprise_id
        AND role IN ('admin', 'owner')
    )
  );
