-- Migration 009: Fix webhook_logs unique constraints
--
-- Problem: Unique indexes on email_extracted and user_id prevent multiple
-- webhook events per user. A webhook log table should record EVERY event.
-- This caused new webhooks to silently fail logging (23505 constraint violation),
-- leaving old records with stale 'unhandled' status even when processing succeeded.
--
-- Fix: Replace unique indexes with regular indexes (keep query performance).

-- Step 1: Drop the unique indexes
DROP INDEX IF EXISTS idx_webhook_logs_unique_email;
DROP INDEX IF EXISTS idx_webhook_logs_unique_user;

-- Step 2: Create regular (non-unique) indexes for query performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_email ON webhook_logs (email_extracted)
  WHERE email_extracted IS NOT NULL AND email_extracted != '';

CREATE INDEX IF NOT EXISTS idx_webhook_logs_user ON webhook_logs (user_id)
  WHERE user_id IS NOT NULL;

-- Step 3: Update any remaining 'unhandled'/'ignored' records that have a valid
-- user_id and plan_granted to 'success' (they were processed but log wasn't updated)
UPDATE webhook_logs
SET status = 'success'
WHERE status IN ('unhandled', 'ignored')
  AND user_id IS NOT NULL
  AND plan_granted IS NOT NULL;
