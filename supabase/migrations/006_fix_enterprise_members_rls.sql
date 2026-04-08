-- =============================================================================
-- Migration 006: Fix infinite recursion in enterprise_members RLS
--
-- Problem: the enterprise_members SELECT policy queried enterprise_members
-- itself, causing infinite recursion whenever any SELECT policy on another
-- table (e.g. enterprises) triggered evaluation of this policy.
--
-- Fix: use a SECURITY DEFINER function that reads enterprise_members
-- without triggering RLS, breaking the recursive evaluation chain.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: returns the enterprise_ids the current user belongs to.
-- SECURITY DEFINER bypasses RLS so this does NOT re-trigger the policy.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_enterprise_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT enterprise_id
  FROM public.enterprise_members
  WHERE user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Drop the recursive policy and replace it with a non-recursive one.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "enterprise_members: members can view their enterprise members"
  ON enterprise_members;

CREATE POLICY "enterprise_members: members can view their enterprise members"
  ON enterprise_members FOR SELECT
  USING (enterprise_id IN (SELECT public.get_my_enterprise_ids()));
