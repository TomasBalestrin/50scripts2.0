-- 50 Scripts 2.0 - Fix webhook_logs schema
-- Migration: 006_fix_webhook_logs.sql
--
-- The webhook_logs table schema doesn't match what the code writes.
-- This migration updates the schema to be compatible.

-- 1. Change event_type from enum to TEXT (platforms send many event types)
ALTER TABLE webhook_logs ALTER COLUMN event_type TYPE TEXT USING event_type::text;

-- 2. Drop the restrictive enum type (no longer needed)
DROP TYPE IF EXISTS webhook_event_type;

-- 3. Make email_extracted nullable with default (not always available on errors)
ALTER TABLE webhook_logs ALTER COLUMN email_extracted DROP NOT NULL;
ALTER TABLE webhook_logs ALTER COLUMN email_extracted SET DEFAULT '';

-- 4. Add missing columns the code expects
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. Add source default (some legacy handlers forget to pass it)
ALTER TABLE webhook_logs ALTER COLUMN source SET DEFAULT 'unknown';

-- 6. Make payload default to empty object (error logging sometimes can't capture payload)
ALTER TABLE webhook_logs ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
ALTER TABLE webhook_logs ALTER COLUMN payload DROP NOT NULL;

-- 7. Index on user_id for admin lookups
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
