-- Migration 010: User activity tracking
--
-- Tracks page views, logins, and session heartbeats for analytics.
-- Enables: DAU/WAU/MAU, session duration, feature usage, user behavior.

CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'page_view', 'login', 'heartbeat'
  page_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX idx_user_activity_created ON user_activity (created_at DESC);
CREATE INDEX idx_user_activity_user ON user_activity (user_id, created_at DESC);
CREATE INDEX idx_user_activity_event ON user_activity (event_type, created_at DESC);
CREATE INDEX idx_user_activity_page ON user_activity (page_path, created_at DESC)
  WHERE page_path IS NOT NULL;

-- RLS: users insert own, admins read all
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own activity"
  ON user_activity FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all activity"
  ON user_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
