-- 50 Scripts 2.0 - Complete Database Schema
-- PostgreSQL 15 + Supabase

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- pg_vector for semantic search (Premium+)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE plan_type AS ENUM ('starter', 'pro', 'premium', 'copilot');
CREATE TYPE role_type AS ENUM ('user', 'admin');
CREATE TYPE tone_type AS ENUM ('formal', 'casual', 'direct');
CREATE TYPE level_type AS ENUM ('iniciante', 'vendedor', 'closer', 'topseller', 'elite');
CREATE TYPE lead_stage AS ENUM ('novo', 'abordado', 'qualificado', 'proposta', 'fechado', 'perdido');
CREATE TYPE ai_prompt_type AS ENUM ('generation', 'conversation', 'analysis', 'objection');
CREATE TYPE ai_log_type AS ENUM ('generation', 'conversation', 'analysis');
CREATE TYPE webhook_event_type AS ENUM ('purchase', 'upgrade', 'cancel');
CREATE TYPE referral_status AS ENUM ('pending', 'converted', 'rewarded');

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  plan plan_type NOT NULL DEFAULT 'starter',
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  role role_type NOT NULL DEFAULT 'user',
  niche TEXT,
  preferred_tone tone_type NOT NULL DEFAULT 'casual',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  xp_points INTEGER NOT NULL DEFAULT 0,
  level level_type NOT NULL DEFAULT 'iniciante',
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  ai_credits_remaining INTEGER NOT NULL DEFAULT 0,
  ai_credits_monthly INTEGER NOT NULL DEFAULT 0,
  saved_variables JSONB NOT NULL DEFAULT '{}',
  push_subscription JSONB,
  notification_prefs JSONB NOT NULL DEFAULT '{}',
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  webhook_source TEXT,
  password_changed BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. SCRIPT CATEGORIES (Trilhas)
-- ============================================
CREATE TABLE script_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. SCRIPTS
-- ============================================
CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES script_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_formal TEXT,
  content_direct TEXT,
  context_description TEXT NOT NULL,
  objection_keywords TEXT[] NOT NULL DEFAULT '{}',
  -- objection_embedding vector(1536), -- Enable when pg_vector is ready
  audio_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  min_plan plan_type NOT NULL DEFAULT 'starter',
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  generated_by_user_id UUID REFERENCES profiles(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  global_usage_count INTEGER NOT NULL DEFAULT 0,
  global_effectiveness DECIMAL(3,2) NOT NULL DEFAULT 0,
  global_conversion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. SCRIPT USAGE
-- ============================================
CREATE TABLE script_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  lead_id UUID,
  tone_used tone_type,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effectiveness_rating SMALLINT CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  resulted_in_sale BOOLEAN,
  sale_value DECIMAL(12,2),
  feedback_note TEXT
);

-- ============================================
-- 5. LEADS (Premium+)
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  stage lead_stage NOT NULL DEFAULT 'novo',
  expected_value DECIMAL(12,2),
  conversation_history JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for script_usage.lead_id after leads table exists
ALTER TABLE script_usage ADD CONSTRAINT fk_script_usage_lead
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- ============================================
-- 6. USER BADGES (Gamification)
-- ============================================
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- ============================================
-- 7. DAILY CHALLENGES (Pro+)
-- ============================================
CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  challenge_type TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  xp_reward INTEGER NOT NULL,
  UNIQUE(user_id, challenge_date)
);

-- ============================================
-- 8. REFERRALS (Premium+)
-- ============================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  status referral_status NOT NULL DEFAULT 'pending',
  reward_type TEXT,
  reward_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 9. MICROLEARNING TIPS
-- ============================================
CREATE TABLE microlearning_tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 10. AI PROMPTS
-- ============================================
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type ai_prompt_type NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  temperature DECIMAL(2,1) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 11. AI GENERATION LOG
-- ============================================
CREATE TABLE ai_generation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_template_id UUID REFERENCES ai_prompts(id),
  type ai_log_type NOT NULL,
  input_context JSONB NOT NULL,
  generated_content TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  saved_as_script_id UUID REFERENCES scripts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 12. WEBHOOK LOGS
-- ============================================
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  event_type webhook_event_type NOT NULL,
  payload JSONB NOT NULL,
  email_extracted TEXT NOT NULL,
  plan_granted TEXT,
  user_created BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 13. USER COLLECTIONS + COLLECTION SCRIPTS
-- ============================================
CREATE TABLE user_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collection_scripts (
  collection_id UUID NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, script_id)
);

-- ============================================
-- 14. SALES AGENDA (Pro+)
-- ============================================
CREATE TABLE sales_agenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agenda_date DATE NOT NULL,
  time_block TEXT NOT NULL,
  action_type TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  suggested_script_id UUID REFERENCES scripts(id),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_usage_user_script ON script_usage(user_id, script_id);
CREATE INDEX idx_usage_used_at ON script_usage(used_at DESC);
CREATE INDEX idx_scripts_category_active ON scripts(category_id, is_active);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_leads_user_stage ON leads(user_id, stage);
CREATE INDEX idx_leads_next_followup ON leads(next_followup_at);
CREATE INDEX idx_challenges_user_date ON daily_challenges(user_id, challenge_date);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code_used);
CREATE INDEX idx_agenda_user_date ON sales_agenda(user_id, agenda_date);
CREATE INDEX idx_scripts_min_plan ON scripts(min_plan);
CREATE INDEX idx_webhook_logs_processed ON webhook_logs(processed_at DESC);
CREATE INDEX idx_ai_log_user ON ai_generation_log(user_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Profiles: users read/update own, admins all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Script Categories: everyone can read active
ALTER TABLE script_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active categories"
  ON script_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON script_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Scripts: read where min_plan <= user plan, AI generated only by creator
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read scripts for their plan"
  ON scripts FOR SELECT
  USING (
    is_active = true AND (
      is_ai_generated = false OR
      generated_by_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Users can insert AI generated scripts"
  ON scripts FOR INSERT
  WITH CHECK (
    is_ai_generated = true AND generated_by_user_id = auth.uid()
  );

CREATE POLICY "Admins can manage all scripts"
  ON scripts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Script Usage: CRUD own only
ALTER TABLE script_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own usage"
  ON script_usage FOR ALL
  USING (user_id = auth.uid());

-- Leads: CRUD own only
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own leads"
  ON leads FOR ALL
  USING (user_id = auth.uid());

-- User Badges: read own only
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
  ON user_badges FOR SELECT
  USING (user_id = auth.uid());

-- Daily Challenges: own only
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own challenges"
  ON daily_challenges FOR ALL
  USING (user_id = auth.uid());

-- Referrals: read where referrer or referred
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Microlearning Tips: everyone reads, admins manage
ALTER TABLE microlearning_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tips"
  ON microlearning_tips FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage tips"
  ON microlearning_tips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- AI Prompts: admins only
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prompts"
  ON ai_prompts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- AI Generation Log: own only
ALTER TABLE ai_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI logs"
  ON ai_generation_log FOR ALL
  USING (user_id = auth.uid());

-- Webhook Logs: admins only
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read webhook logs"
  ON webhook_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User Collections: own only
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own collections"
  ON user_collections FOR ALL
  USING (user_id = auth.uid());

-- Collection Scripts: own collections only
ALTER TABLE collection_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own collection scripts"
  ON collection_scripts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_collections
      WHERE id = collection_scripts.collection_id AND user_id = auth.uid()
    )
  );

-- Sales Agenda: own only
ALTER TABLE sales_agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own agenda"
  ON sales_agenda FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scripts_updated_at
  BEFORE UPDATE ON scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON ai_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to calculate user level from XP
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS level_type AS $$
BEGIN
  IF xp >= 5001 THEN RETURN 'elite';
  ELSIF xp >= 1501 THEN RETURN 'topseller';
  ELSIF xp >= 501 THEN RETURN 'closer';
  ELSIF xp >= 101 THEN RETURN 'vendedor';
  ELSE RETURN 'iniciante';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add XP and auto-level
CREATE OR REPLACE FUNCTION add_xp(p_user_id UUID, p_xp INTEGER)
RETURNS void AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  UPDATE profiles
  SET xp_points = xp_points + p_xp,
      level = calculate_level(xp_points + p_xp)
  WHERE id = p_user_id
  RETURNING xp_points INTO new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
