-- 50 Scripts 2.0 - Phase 3 Additions
-- Migration: 002_phase3_additions.sql

-- ============================================
-- 1. Add audio_url column to scripts (if not present)
-- ============================================
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- ============================================
-- 2. System Config table
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at for system_config
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_system_config_updated_at();

-- ============================================
-- 3. Default config values
-- ============================================
INSERT INTO system_config (key, value) VALUES
  ('ai_credits', '{"starter": 0, "pro": 0, "premium": 15, "copilot": -1}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value) VALUES
  ('feature_flags', '{"enable_semantic_search": false, "enable_audio": false, "enable_export": true, "enable_smart_agenda": false}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value) VALUES
  ('referral_rewards', '{"tier_1": {"count": 1, "reward": "3_ai_credits"}, "tier_2": {"count": 3, "reward": "free_pro_month"}, "tier_3": {"count": 10, "reward": "free_premium_month"}}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value) VALUES
  ('default_password', '"50scripts@2024"')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 4. RLS on system_config
-- ============================================
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Admins can read all config
CREATE POLICY "Admins can read system config"
  ON system_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert config
CREATE POLICY "Admins can insert system config"
  ON system_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update config
CREATE POLICY "Admins can update system config"
  ON system_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete config
CREATE POLICY "Admins can delete system config"
  ON system_config FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. Index on referrals(referrer_id) for reward counting
-- (safe to create even if it already exists from 001)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
