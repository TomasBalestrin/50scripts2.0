-- 50 Scripts 2.0 - Optimize webhook user lookup
-- Migration: 015_optimize_webhook_user_lookup.sql
--
-- Problem: findOrCreateUser was paginating through ALL auth users (listUsers)
-- when a user already existed in auth but was missing a profile.
-- With 1000+ users on Supabase free tier, this caused timeouts and API rate limit hits.
--
-- Solution: RPC function to lookup auth user ID by email in a single query.

-- 1. Create RPC function to find auth user by email (SECURITY DEFINER = runs with creator's privileges)
CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email TEXT)
RETURNS TABLE(id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id
  FROM auth.users au
  WHERE au.email = lookup_email
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up old webhook_logs to free database space (Supabase free tier = 500MB)
-- Delete logs older than 90 days that were already processed successfully
DELETE FROM webhook_logs
WHERE processed_at < NOW() - INTERVAL '90 days'
  AND status IN ('success', 'reprocessed', 'duplicate');

-- 3. Add index on webhook_logs(processed_at, status) for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_cleanup
ON webhook_logs(processed_at, status);
