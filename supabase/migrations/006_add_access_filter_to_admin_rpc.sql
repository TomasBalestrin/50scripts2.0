-- 50 Scripts 2.0 - Add access filter to admin_list_profiles RPC
-- Migration: 006_add_access_filter_to_admin_rpc.sql
--
-- Adds p_access parameter to filter users by last_login_at status.

CREATE OR REPLACE FUNCTION admin_list_profiles(
  p_plan TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_access TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_total BIGINT;
  v_users JSONB;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  -- Get total count with filters
  SELECT count(*) INTO v_total
  FROM profiles
  WHERE (p_plan IS NULL OR plan::text = p_plan)
    AND (p_search IS NULL OR email ILIKE '%' || p_search || '%' OR full_name ILIKE '%' || p_search || '%')
    AND (
      p_access IS NULL OR p_access = 'all'
      OR (p_access = 'accessed' AND last_login_at IS NOT NULL)
      OR (p_access = 'never' AND last_login_at IS NULL)
      OR (p_access = '7days' AND last_login_at >= NOW() - INTERVAL '7 days')
      OR (p_access = '30days' AND last_login_at >= NOW() - INTERVAL '30 days')
      OR (p_access = 'inactive30' AND last_login_at IS NOT NULL AND last_login_at < NOW() - INTERVAL '30 days')
    );

  -- Get paginated data
  SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb) INTO v_users
  FROM (
    SELECT *
    FROM profiles
    WHERE (p_plan IS NULL OR plan::text = p_plan)
      AND (p_search IS NULL OR email ILIKE '%' || p_search || '%' OR full_name ILIKE '%' || p_search || '%')
      AND (
        p_access IS NULL OR p_access = 'all'
        OR (p_access = 'accessed' AND last_login_at IS NOT NULL)
        OR (p_access = 'never' AND last_login_at IS NULL)
        OR (p_access = '7days' AND last_login_at >= NOW() - INTERVAL '7 days')
        OR (p_access = '30days' AND last_login_at >= NOW() - INTERVAL '30 days')
        OR (p_access = 'inactive30' AND last_login_at IS NOT NULL AND last_login_at < NOW() - INTERVAL '30 days')
      )
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) p;

  RETURN jsonb_build_object('users', v_users, 'total', v_total);
END;
$$;
