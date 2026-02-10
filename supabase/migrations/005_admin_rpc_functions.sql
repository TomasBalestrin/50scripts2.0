-- 50 Scripts 2.0 - Admin RPC Functions (SECURITY DEFINER)
-- Migration: 005_admin_rpc_functions.sql
--
-- These functions bypass RLS using SECURITY DEFINER,
-- allowing admin operations even without the service role key.
-- Each function validates that the caller is an admin before proceeding.

-- ============================================
-- 1. Admin list profiles (paginated, filterable)
-- ============================================
CREATE OR REPLACE FUNCTION admin_list_profiles(
  p_plan TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
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
    AND (p_search IS NULL OR email ILIKE '%' || p_search || '%' OR full_name ILIKE '%' || p_search || '%');

  -- Get paginated data
  SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb) INTO v_users
  FROM (
    SELECT *
    FROM profiles
    WHERE (p_plan IS NULL OR plan::text = p_plan)
      AND (p_search IS NULL OR email ILIKE '%' || p_search || '%' OR full_name ILIKE '%' || p_search || '%')
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) p;

  RETURN jsonb_build_object('users', v_users, 'total', v_total);
END;
$$;

-- ============================================
-- 2. Admin update profile
-- ============================================
CREATE OR REPLACE FUNCTION admin_update_profile(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  UPDATE profiles
  SET
    plan = COALESCE((p_updates->>'plan')::plan_type, plan),
    is_active = COALESCE((p_updates->>'is_active')::boolean, is_active),
    role = COALESCE((p_updates->>'role')::role_type, role),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING to_jsonb(profiles.*) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- 3. Admin upsert profile (for user creation)
-- ============================================
CREATE OR REPLACE FUNCTION admin_upsert_profile(p_profile JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  INSERT INTO profiles (
    id, email, full_name, plan, role, is_active,
    niche, preferred_tone, onboarding_completed,
    xp_points, level, current_streak, longest_streak,
    ai_credits_remaining, ai_credits_monthly,
    saved_variables, push_subscription, notification_prefs,
    referral_code, referred_by, webhook_source,
    password_changed, last_login_at, created_at, updated_at
  ) VALUES (
    (p_profile->>'id')::uuid,
    p_profile->>'email',
    COALESCE(p_profile->>'full_name', ''),
    COALESCE((p_profile->>'plan')::plan_type, 'starter'),
    COALESCE((p_profile->>'role')::role_type, 'user'),
    COALESCE((p_profile->>'is_active')::boolean, true),
    p_profile->>'niche',
    COALESCE((p_profile->>'preferred_tone')::tone_type, 'casual'),
    COALESCE((p_profile->>'onboarding_completed')::boolean, false),
    COALESCE((p_profile->>'xp_points')::integer, 0),
    COALESCE((p_profile->>'level')::level_type, 'iniciante'),
    COALESCE((p_profile->>'current_streak')::integer, 0),
    COALESCE((p_profile->>'longest_streak')::integer, 0),
    COALESCE((p_profile->>'ai_credits_remaining')::integer, 10),
    COALESCE((p_profile->>'ai_credits_monthly')::integer, 10),
    COALESCE(p_profile->'saved_variables', '{}'::jsonb),
    p_profile->'push_subscription',
    COALESCE(p_profile->'notification_prefs', '{}'::jsonb),
    p_profile->>'referral_code',
    (p_profile->>'referred_by')::uuid,
    p_profile->>'webhook_source',
    COALESCE((p_profile->>'password_changed')::boolean, false),
    (p_profile->>'last_login_at')::timestamptz,
    COALESCE((p_profile->>'created_at')::timestamptz, now()),
    COALESCE((p_profile->>'updated_at')::timestamptz, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    plan = EXCLUDED.plan,
    updated_at = now()
  RETURNING to_jsonb(profiles.*) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================
-- 4. Missing INSERT policy for profiles (admins + webhooks)
-- ============================================
DO $$
BEGIN
  -- Admin insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can insert profiles'
  ) THEN
    CREATE POLICY "Admins can insert profiles"
      ON profiles FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Admin delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can delete profiles'
  ) THEN
    CREATE POLICY "Admins can delete profiles"
      ON profiles FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================
-- 5. app_config table (for webhook platform configs)
-- ============================================
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'Admins can manage app config'
  ) THEN
    CREATE POLICY "Admins can manage app config"
      ON app_config FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;
