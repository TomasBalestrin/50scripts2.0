-- ============================================================
-- MIGRATION 011: Script Go - Complete System Overhaul
-- Date: February 2026
-- Description: New onboarding, gamification, sales tracking,
--              personalized scripts, and module toggle system.
-- ============================================================

-- ============================================================
-- 1. NEW TABLE: user_onboarding
-- Stores onboarding form data for personalization & lead mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Block 1: Personal Info
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  -- Block 2: Business Info
  company_name TEXT,
  business_type TEXT NOT NULL,
  business_type_custom TEXT,
  role_in_business TEXT,
  average_ticket TEXT,
  target_audience TEXT,
  main_objections TEXT,
  -- Block 3: Strategic Info
  main_challenges TEXT[] NOT NULL DEFAULT '{}',
  main_challenges_custom TEXT,
  has_partner BOOLEAN DEFAULT FALSE,
  time_knowing_cleiton TEXT,
  faturamento_mensal TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding" ON user_onboarding
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all onboarding" ON user_onboarding
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- ============================================================
-- 2. NEW TABLE: script_sales
-- Track sales generated per script
-- ============================================================
CREATE TABLE IF NOT EXISTS script_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE script_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sales" ON script_sales
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sales" ON script_sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sales" ON script_sales
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sales" ON script_sales
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all sales" ON script_sales
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_script_sales_user ON script_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_script_sales_script ON script_sales(script_id);
CREATE INDEX IF NOT EXISTS idx_script_sales_date ON script_sales(sale_date DESC);

-- ============================================================
-- 3. NEW TABLE: personalized_scripts
-- History of AI-generated personalized scripts
-- ============================================================
CREATE TABLE IF NOT EXISTS personalized_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  situation TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  generated_content TEXT NOT NULL,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE personalized_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own personalized scripts" ON personalized_scripts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own personalized scripts" ON personalized_scripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all personalized scripts" ON personalized_scripts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_personalized_scripts_user ON personalized_scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_personalized_scripts_created ON personalized_scripts(created_at DESC);

-- ============================================================
-- 4. ALTER TABLE: profiles - New gamification columns
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_level TEXT NOT NULL DEFAULT 'iniciante',
  ADD COLUMN IF NOT EXISTS cyclic_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_scripts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_reward_pending BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- ============================================================
-- 5. RPC: add_cyclic_xp
-- Adds XP to cyclic bar (0-100), awards +5 bonus scripts per cycle
-- ============================================================
CREATE OR REPLACE FUNCTION add_cyclic_xp(
  p_user_id UUID,
  p_xp INTEGER
) RETURNS JSON AS $$
DECLARE
  v_current_xp INTEGER;
  v_new_xp INTEGER;
  v_cycles_completed INTEGER := 0;
BEGIN
  SELECT cyclic_xp INTO v_current_xp
  FROM profiles WHERE id = p_user_id;

  v_new_xp := COALESCE(v_current_xp, 0) + p_xp;

  -- Count how many 100 XP cycles were completed
  WHILE v_new_xp >= 100 LOOP
    v_new_xp := v_new_xp - 100;
    v_cycles_completed := v_cycles_completed + 1;
  END LOOP;

  -- If cycles completed, set pending flag (user must collect)
  IF v_cycles_completed > 0 THEN
    UPDATE profiles
    SET cyclic_xp = v_new_xp,
        cyclic_xp_reward_pending = TRUE,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET cyclic_xp = v_new_xp,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'new_xp', v_new_xp,
    'cycles_completed', v_cycles_completed,
    'reward_pending', v_cycles_completed > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. RPC: record_active_day
-- Records a daily login, computes level from active days,
-- updates streak, and awards bonuses
-- ============================================================
CREATE OR REPLACE FUNCTION record_active_day(
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_last_date DATE;
  v_active_days INTEGER;
  v_current_level TEXT;
  v_new_level TEXT;
  v_leveled_up BOOLEAN := FALSE;
  v_bonus INTEGER := 0;
  v_today DATE := CURRENT_DATE;
  v_streak INTEGER;
  v_longest_streak INTEGER;
  v_streak_reward BOOLEAN := FALSE;
BEGIN
  SELECT last_active_date, active_days, new_level, current_streak, longest_streak
  INTO v_last_date, v_active_days, v_current_level, v_streak, v_longest_streak
  FROM profiles WHERE id = p_user_id;

  -- Only count once per day
  IF v_last_date = v_today THEN
    RETURN json_build_object(
      'already_recorded', true,
      'level', COALESCE(v_current_level, 'iniciante'),
      'active_days', COALESCE(v_active_days, 0),
      'streak', COALESCE(v_streak, 0),
      'leveled_up', false,
      'streak_reward_pending', false
    );
  END IF;

  v_active_days := COALESCE(v_active_days, 0) + 1;

  -- Update streak: consecutive if yesterday was last active
  IF v_last_date = v_today - INTERVAL '1 day' THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_streak := 1;
  END IF;

  v_longest_streak := GREATEST(COALESCE(v_longest_streak, 0), v_streak);

  -- Check streak reward: every 2 consecutive days
  IF v_streak > 0 AND v_streak % 2 = 0 THEN
    v_streak_reward := TRUE;
  END IF;

  -- Compute new level based on active_days
  v_new_level := CASE
    WHEN v_active_days >= 60 THEN 'lenda'
    WHEN v_active_days >= 30 THEN 'referencia'
    WHEN v_active_days >= 21 THEN 'especialista'
    WHEN v_active_days >= 14 THEN 'estrategista'
    WHEN v_active_days >= 7  THEN 'executor'
    WHEN v_active_days >= 3  THEN 'aprendiz'
    ELSE 'iniciante'
  END;

  -- Check for level up
  IF v_new_level <> COALESCE(v_current_level, 'iniciante') THEN
    v_leveled_up := TRUE;
    v_bonus := 10; -- +10 personalized scripts on level up
  END IF;

  UPDATE profiles
  SET active_days = v_active_days,
      last_active_date = v_today,
      new_level = v_new_level,
      current_streak = v_streak,
      longest_streak = v_longest_streak,
      bonus_scripts = bonus_scripts + v_bonus + (CASE WHEN v_streak_reward THEN 5 ELSE 0 END),
      streak_reward_pending = CASE WHEN v_streak_reward THEN TRUE ELSE streak_reward_pending END,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'active_days', v_active_days,
    'level', v_new_level,
    'leveled_up', v_leveled_up,
    'bonus_scripts', v_bonus,
    'streak', v_streak,
    'streak_reward_pending', v_streak_reward
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. CONFIG SEEDS: Module toggles & default password
-- ============================================================
INSERT INTO app_config (key, value, updated_at)
VALUES (
  'module_toggles',
  '{"gestao": true, "scripts": true, "personalizados": true, "buscar": true}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Update default password to performance123
INSERT INTO app_config (key, value, updated_at)
VALUES (
  'default_password',
  '{"value": "performance123"}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = '{"value": "performance123"}'::jsonb,
    updated_at = NOW();
