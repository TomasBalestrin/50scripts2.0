-- ============================================
-- FIX: Allow users to insert their own profile
--
-- Problem: The profiles table has no INSERT policy for regular users.
-- Only admins can insert profiles. When a new user goes through
-- onboarding, the upsert to profiles fails with RLS violation
-- because the INSERT part is blocked.
--
-- Error shown: "Erro ao garantir perfil do usuário"
--
-- Solution: Add an INSERT policy allowing users to create their
-- own profile row (where auth.uid() = id).
-- ============================================

-- Add INSERT policy for regular users on profiles
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
