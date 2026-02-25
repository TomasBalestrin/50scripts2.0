-- ============================================================
-- Migration 013: Cyclic XP Reward Pending
-- Adds cyclic_xp_reward_pending so users must collect their reward
-- instead of it being silently added.
-- ============================================================

-- Add column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cyclic_xp_reward_pending BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Updated RPC: add_cyclic_xp
-- Now sets cyclic_xp_reward_pending = true instead of
-- silently adding bonus_scripts. User must explicitly collect.
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

  -- If cycles were completed, set pending flag (user must collect)
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
-- New RPC: collect_cyclic_xp_reward
-- Awards +5 bonus scripts and clears the pending flag
-- ============================================================
CREATE OR REPLACE FUNCTION collect_cyclic_xp_reward(
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pending BOOLEAN;
  v_new_bonus INTEGER;
BEGIN
  SELECT cyclic_xp_reward_pending INTO v_pending
  FROM profiles WHERE id = p_user_id;

  IF NOT COALESCE(v_pending, FALSE) THEN
    RETURN json_build_object('success', false, 'message', 'No reward pending');
  END IF;

  UPDATE profiles
  SET cyclic_xp_reward_pending = FALSE,
      bonus_scripts = bonus_scripts + 5,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING bonus_scripts INTO v_new_bonus;

  RETURN json_build_object(
    'success', true,
    'bonus_scripts', v_new_bonus
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
