-- ============================================
-- FIX: Infinite recursion in profiles RLS policies
--
-- Problem: Admin policies on "profiles" table do a subquery
-- back to "profiles" to check role = 'admin', which triggers
-- the same RLS policies again → infinite recursion.
--
-- Solution: Create a SECURITY DEFINER function that checks
-- admin status bypassing RLS, then use it in all admin policies.
-- ============================================

-- 1. Create helper function that bypasses RLS to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Fix profiles table policies (the source of the recursion)

-- Drop the recursive admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Recreate using is_admin() function (no recursion)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (public.is_admin());

-- 3. Fix user_onboarding admin policy (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_onboarding') THEN
    DROP POLICY IF EXISTS "Admins can read all onboarding" ON user_onboarding;
    CREATE POLICY "Admins can read all onboarding" ON user_onboarding
      FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- 4. Fix feature_flags admin policy (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags') THEN
    DROP POLICY IF EXISTS "Admins can manage feature flags" ON feature_flags;
    CREATE POLICY "Admins can manage feature flags" ON feature_flags
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- 5. Fix user_feature_assignments admin policy (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_feature_assignments') THEN
    DROP POLICY IF EXISTS "Admins can manage assignments" ON user_feature_assignments;
    CREATE POLICY "Admins can manage assignments" ON user_feature_assignments
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- 6. Fix analytics_cache admin policy (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_cache') THEN
    DROP POLICY IF EXISTS "Admins can manage analytics cache" ON analytics_cache;
    CREATE POLICY "Admins can manage analytics cache" ON analytics_cache
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- 7. Fix storage admin policies
DROP POLICY IF EXISTS "Admins can upload audio" ON storage.objects;
CREATE POLICY "Admins can upload audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'script-audios' AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update audio" ON storage.objects;
CREATE POLICY "Admins can update audio" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'script-audios' AND public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete audio" ON storage.objects;
CREATE POLICY "Admins can delete audio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'script-audios' AND public.is_admin()
  );

-- ============================================
-- 8. Make tomasbalestrin@gmail.com an admin
-- ============================================
UPDATE profiles
SET role = 'admin', updated_at = now()
WHERE email = 'tomasbalestrin@gmail.com';
