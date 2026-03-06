-- ============================================================
-- MIGRATION 018: Daily Missions System
-- Date: March 2026
-- Description: Admin-defined missions assigned daily to users.
--              2 active missions per day, 20 XP per completion.
-- ============================================================

-- ============================================================
-- 1. NEW TABLE: missions
-- Admin-created mission templates
-- ============================================================
CREATE TABLE IF NOT EXISTS missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active missions" ON missions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage missions" ON missions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 2. NEW TABLE: user_daily_missions
-- Tracks which missions are assigned to a user on a given day
-- ============================================================
CREATE TABLE IF NOT EXISTS user_daily_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mission_id, mission_date)
);

ALTER TABLE user_daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily missions" ON user_daily_missions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own daily missions" ON user_daily_missions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert daily missions" ON user_daily_missions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all daily missions" ON user_daily_missions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_user_daily_missions_user_date ON user_daily_missions(user_id, mission_date);
CREATE INDEX IF NOT EXISTS idx_user_daily_missions_mission ON user_daily_missions(mission_id);

-- ============================================================
-- 3. RPC: get_or_assign_daily_missions
-- Returns today's 2 missions for a user, assigning them if needed
-- ============================================================
CREATE OR REPLACE FUNCTION get_or_assign_daily_missions(
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_count INTEGER;
  v_missions JSON;
BEGIN
  -- Check if user already has missions for today
  SELECT COUNT(*) INTO v_count
  FROM user_daily_missions
  WHERE user_id = p_user_id AND mission_date = v_today;

  -- If no missions assigned yet, pick 2 random active missions
  IF v_count = 0 THEN
    INSERT INTO user_daily_missions (user_id, mission_id, mission_date)
    SELECT p_user_id, m.id, v_today
    FROM missions m
    WHERE m.is_active = TRUE
    ORDER BY random()
    LIMIT 2;
  END IF;

  -- Return today's missions
  SELECT json_agg(row_to_json(t)) INTO v_missions
  FROM (
    SELECT
      udm.id,
      udm.mission_id,
      m.title,
      m.description,
      udm.completed,
      udm.completed_at,
      udm.xp_awarded
    FROM user_daily_missions udm
    JOIN missions m ON m.id = udm.mission_id
    WHERE udm.user_id = p_user_id AND udm.mission_date = v_today
    ORDER BY udm.created_at
  ) t;

  RETURN COALESCE(v_missions, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. RPC: complete_daily_mission
-- Marks a mission as complete and awards 20 XP
-- ============================================================
CREATE OR REPLACE FUNCTION complete_daily_mission(
  p_user_id UUID,
  p_mission_id UUID
) RETURNS JSON AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_already_completed BOOLEAN;
  v_xp_result JSON;
BEGIN
  -- Check if already completed
  SELECT completed INTO v_already_completed
  FROM user_daily_missions
  WHERE user_id = p_user_id
    AND mission_id = p_mission_id
    AND mission_date = v_today;

  IF v_already_completed IS NULL THEN
    RETURN json_build_object('error', 'Mission not found for today');
  END IF;

  IF v_already_completed THEN
    RETURN json_build_object('error', 'Mission already completed', 'already_completed', true);
  END IF;

  -- Mark as completed
  UPDATE user_daily_missions
  SET completed = TRUE,
      completed_at = NOW(),
      xp_awarded = 20
  WHERE user_id = p_user_id
    AND mission_id = p_mission_id
    AND mission_date = v_today;

  -- Award 20 cyclic XP
  SELECT add_cyclic_xp(p_user_id, 20) INTO v_xp_result;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', 20,
    'xp_result', v_xp_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
