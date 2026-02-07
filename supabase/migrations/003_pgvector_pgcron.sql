-- =====================================================
-- Migration 003: pg_vector + pg_cron + missing fields
-- =====================================================

-- Enable pg_vector extension (requires Supabase Pro)
-- Uncomment when on Supabase Pro plan:
-- CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Enable pg_cron (available on Supabase Pro)
-- Uncomment when on Supabase Pro:
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Add stripe_customer_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add embedding column to scripts (1536 dimensions for OpenAI embeddings)
-- ALTER TABLE scripts ADD COLUMN IF NOT EXISTS objection_embedding vector(1536);
-- CREATE INDEX IF NOT EXISTS idx_scripts_objection_embedding ON scripts USING ivfflat (objection_embedding vector_cosine_ops) WITH (lists = 100);

-- Add notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_weekly_digest BOOLEAN DEFAULT true,
  email_plan_changes BOOLEAN DEFAULT true,
  email_referral_rewards BOOLEAN DEFAULT true,
  push_daily_tip BOOLEAN DEFAULT true,
  push_streak_reminder BOOLEAN DEFAULT true,
  push_new_challenge BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Add feature_flags table for A/B testing
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default feature flags
INSERT INTO feature_flags (key, description, enabled, rollout_percentage) VALUES
  ('semantic_search', 'Busca semantica de objecoes com pg_vector', false, 0),
  ('audio_scripts', 'Audios modelo nos scripts', false, 0),
  ('smart_agenda', 'Agenda inteligente com priorizacao por IA', true, 100),
  ('weekly_digest', 'Email semanal de desempenho', true, 100),
  ('ab_onboarding_v2', 'Nova versao do onboarding', false, 50),
  ('ab_dashboard_layout', 'Novo layout do dashboard', false, 30)
ON CONFLICT (key) DO NOTHING;

-- Add user_feature_assignments for A/B testing
CREATE TABLE IF NOT EXISTS user_feature_assignments (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  feature_flag_id UUID REFERENCES feature_flags(id) ON DELETE CASCADE,
  variant TEXT DEFAULT 'control' CHECK (variant IN ('control', 'treatment')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, feature_flag_id)
);

-- Add analytics_cache table for aggregated metrics
CREATE TABLE IF NOT EXISTS analytics_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT USING (true);

ALTER TABLE user_feature_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own assignments" ON user_feature_assignments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage assignments" ON user_feature_assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage analytics cache" ON analytics_cache
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_user_feature_assignments_user ON user_feature_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- =====================================================
-- Auto-update triggers
-- =====================================================

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- pg_cron Jobs (uncomment when pg_cron is available)
-- =====================================================

-- Daily: Generate challenges for all active users
-- SELECT cron.schedule('generate-daily-challenges', '0 5 * * *', $$
--   INSERT INTO daily_challenges (user_id, challenge_type, target_count, xp_reward, challenge_date)
--   SELECT
--     p.id,
--     (ARRAY['use_scripts', 'rate_scripts', 'use_emergency', 'complete_trail'])[floor(random() * 4 + 1)],
--     CASE floor(random() * 3)
--       WHEN 0 THEN 3
--       WHEN 1 THEN 5
--       ELSE 2
--     END,
--     CASE floor(random() * 3)
--       WHEN 0 THEN 50
--       WHEN 1 THEN 75
--       ELSE 100
--     END,
--     CURRENT_DATE
--   FROM profiles p
--   WHERE p.is_active = true
--     AND p.plan != 'starter'
--     AND NOT EXISTS (
--       SELECT 1 FROM daily_challenges dc
--       WHERE dc.user_id = p.id
--       AND dc.challenge_date = CURRENT_DATE
--     );
-- $$);

-- Daily: Update streak counts (reset if user missed a day)
-- SELECT cron.schedule('update-streaks', '0 6 * * *', $$
--   UPDATE profiles
--   SET current_streak = 0, updated_at = now()
--   WHERE is_active = true
--     AND current_streak > 0
--     AND NOT EXISTS (
--       SELECT 1 FROM script_usage su
--       WHERE su.user_id = profiles.id
--       AND su.used_at >= CURRENT_DATE - INTERVAL '1 day'
--     );
-- $$);

-- Monthly: Generate pattern analysis reports for Copilot users
-- SELECT cron.schedule('monthly-pattern-analysis', '0 3 1 * *', $$
--   INSERT INTO analytics_cache (key, value, expires_at)
--   SELECT
--     'patterns_' || p.id,
--     jsonb_build_object(
--       'total_scripts', COUNT(su.id),
--       'total_sales', COUNT(su.id) FILTER (WHERE su.resulted_in_sale),
--       'total_revenue', COALESCE(SUM(su.sale_value) FILTER (WHERE su.resulted_in_sale), 0),
--       'top_hours', (
--         SELECT jsonb_agg(jsonb_build_object('hour', h, 'count', c))
--         FROM (
--           SELECT EXTRACT(HOUR FROM su2.used_at)::int AS h, COUNT(*) AS c
--           FROM script_usage su2
--           WHERE su2.user_id = p.id AND su2.used_at >= now() - INTERVAL '30 days'
--           GROUP BY h ORDER BY c DESC LIMIT 3
--         ) hours
--       )
--     ),
--     now() + INTERVAL '30 days'
--   FROM profiles p
--   LEFT JOIN script_usage su ON su.user_id = p.id AND su.used_at >= now() - INTERVAL '30 days'
--   WHERE p.plan = 'copilot' AND p.is_active = true
--   GROUP BY p.id
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at, updated_at = now();
-- $$);

-- Hourly: Clean expired analytics cache
-- SELECT cron.schedule('clean-analytics-cache', '0 * * * *', $$
--   DELETE FROM analytics_cache WHERE expires_at < now();
-- $$);

-- Daily: Aggregate community metrics
-- SELECT cron.schedule('aggregate-community-metrics', '0 4 * * *', $$
--   INSERT INTO analytics_cache (key, value, expires_at)
--   VALUES (
--     'community_metrics',
--     (SELECT jsonb_build_object(
--       'total_scripts_used', COUNT(*),
--       'total_sales', COUNT(*) FILTER (WHERE resulted_in_sale),
--       'avg_effectiveness', ROUND(AVG(effectiveness_rating)::numeric, 2),
--       'top_scripts', (
--         SELECT jsonb_agg(t) FROM (
--           SELECT s.id, s.title, COUNT(su2.id) as uses
--           FROM scripts s
--           JOIN script_usage su2 ON su2.script_id = s.id
--           WHERE su2.used_at >= now() - INTERVAL '7 days'
--           GROUP BY s.id, s.title
--           ORDER BY uses DESC
--           LIMIT 5
--         ) t
--       )
--     )
--     FROM script_usage
--     WHERE used_at >= now() - INTERVAL '7 days'),
--     now() + INTERVAL '1 day'
--   )
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at, updated_at = now();
-- $$);
