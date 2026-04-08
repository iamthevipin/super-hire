-- =============================================================================
-- Migration 013: Atomic pipeline stage position swap
--
-- Adds a helper function that swaps two stage positions inside a single
-- transaction, avoiding the unique(job_id, position) constraint violation
-- that would occur with two separate UPDATE statements.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.swap_pipeline_stage_positions(
  stage_a_id       uuid,
  stage_b_id       uuid,
  enterprise_id_param uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pos_a    integer;
  pos_b    integer;
  temp_pos integer := -999999;
BEGIN
  SELECT position INTO pos_a
    FROM public.pipeline_stages
    WHERE id = stage_a_id AND enterprise_id = enterprise_id_param;

  SELECT position INTO pos_b
    FROM public.pipeline_stages
    WHERE id = stage_b_id AND enterprise_id = enterprise_id_param;

  IF pos_a IS NULL OR pos_b IS NULL THEN
    RAISE EXCEPTION 'Stage not found or access denied';
  END IF;

  -- Move A to a temporary position outside normal range to free up pos_a
  UPDATE public.pipeline_stages
    SET position = temp_pos
    WHERE id = stage_a_id AND enterprise_id = enterprise_id_param;

  -- Move B into A's old position
  UPDATE public.pipeline_stages
    SET position = pos_a
    WHERE id = stage_b_id AND enterprise_id = enterprise_id_param;

  -- Move A into B's old position
  UPDATE public.pipeline_stages
    SET position = pos_b
    WHERE id = stage_a_id AND enterprise_id = enterprise_id_param;
END;
$$;

REVOKE ALL ON FUNCTION public.swap_pipeline_stage_positions(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.swap_pipeline_stage_positions(uuid, uuid, uuid) TO authenticated;
