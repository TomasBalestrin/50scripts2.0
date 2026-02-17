-- Migration 008: Deep cleanup of webhook_logs
--
-- Problem: 1407 logs for 360 users. Root causes:
--   1) Stripe webhook had its own logWebhookEvent that didn't set email_extracted
--   2) Error catch blocks logged with empty email, bypassing unique index
--   3) Unique index only covers non-empty emails, so empty-email logs accumulated
--   4) No dedup by user_id, only by email
--
-- Fix strategy:
--   Step 1: Backfill email_extracted from profiles where we have user_id but no email
--   Step 2: For logs with same email, keep only the most recent
--   Step 3: Delete orphan logs (no email AND no user_id) - these are noise
--   Step 4: For logs with same user_id but different/empty emails, merge into one
--   Step 5: Re-create the unique index

-- Step 1: Backfill email_extracted from profiles for logs that have user_id but empty email
UPDATE webhook_logs wl
SET email_extracted = p.email
FROM profiles p
WHERE wl.user_id = p.id
  AND (wl.email_extracted IS NULL OR wl.email_extracted = '')
  AND p.email IS NOT NULL
  AND p.email != '';

-- Step 2: Drop the old unique index to allow dedup
DROP INDEX IF EXISTS idx_webhook_logs_unique_email;

-- Step 3: Delete orphan logs - no email AND no user_id (pure noise, can't attribute to anyone)
DELETE FROM webhook_logs
WHERE (email_extracted IS NULL OR email_extracted = '')
  AND user_id IS NULL;

-- Step 4: For logs with the same user_id, keep only the most recent
DELETE FROM webhook_logs
WHERE user_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM webhook_logs
    WHERE user_id IS NOT NULL
    ORDER BY user_id, processed_at DESC
  );

-- Step 5: For remaining logs that have email but no user_id (shouldn't be many),
-- keep only the most recent per email
DELETE FROM webhook_logs
WHERE user_id IS NULL
  AND email_extracted IS NOT NULL
  AND email_extracted != ''
  AND id NOT IN (
    SELECT DISTINCT ON (email_extracted) id
    FROM webhook_logs
    WHERE user_id IS NULL
      AND email_extracted IS NOT NULL
      AND email_extracted != ''
    ORDER BY email_extracted, processed_at DESC
  );

-- Step 6: Re-create unique index on email (non-empty only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_unique_email
  ON webhook_logs (email_extracted)
  WHERE email_extracted IS NOT NULL AND email_extracted != '';

-- Step 7: Add unique index on user_id to prevent future duplicates per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_unique_user
  ON webhook_logs (user_id)
  WHERE user_id IS NOT NULL;
