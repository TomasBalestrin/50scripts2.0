-- Migration 007: Deduplicate webhook_logs
-- Problem: Multiple log entries per email due to:
--   1) Raw INSERTs in access-grant, plan-upgrade, plan-cancel routes
--   2) Dedup logic matched email+source instead of just email
--   3) Reprocessing created new entries via handlePurchase internal logging
--
-- Fix: Keep only the most recent log per email_extracted, delete the rest.
-- Then add a unique partial index to prevent future duplicates.

-- Step 1: Delete duplicate webhook_logs, keeping only the most recent per email
DELETE FROM webhook_logs
WHERE id NOT IN (
  SELECT DISTINCT ON (email_extracted) id
  FROM webhook_logs
  WHERE email_extracted IS NOT NULL AND email_extracted != ''
  ORDER BY email_extracted, processed_at DESC
)
AND email_extracted IS NOT NULL
AND email_extracted != '';

-- Step 2: Add unique partial index to prevent future duplicates
-- Only applies to non-empty emails; logs without email (error cases) can still have multiples
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_unique_email
  ON webhook_logs (email_extracted)
  WHERE email_extracted IS NOT NULL AND email_extracted != '';
