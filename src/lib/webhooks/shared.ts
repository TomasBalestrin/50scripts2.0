import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { getDefaultPassword } from '@/lib/auth-utils';

/**
 * Returns AI credits configuration for a given plan
 */
export function getAiCreditsForPlan(plan: string): { monthly: number; remaining: number } {
  switch (plan) {
    case 'pro':
      return { monthly: 0, remaining: 0 };
    case 'premium':
      return { monthly: 15, remaining: 15 };
    case 'copilot':
      return { monthly: -1, remaining: -1 }; // unlimited
    default:
      return { monthly: 0, remaining: 0 };
  }
}

/**
 * Logs a webhook event to the webhook_logs table.
 *
 * Schema: source, event_type (TEXT), payload (JSONB), email_extracted,
 * plan_granted, user_created, status, user_id, error_message, processed_at
 */
export async function logWebhookEvent(
  source: string,
  eventType: string,
  payload: Record<string, unknown>,
  status: string,
  email?: string,
  userId?: string,
  errorMessage?: string,
  extra?: { planGranted?: string; userCreated?: boolean },
) {
  try {
    const supabase = await createAdminClient();

    const logData = {
      source,
      event_type: eventType,
      payload: payload || {},
      email_extracted: email || '',
      status,
      user_id: userId || null,
      error_message: errorMessage || null,
      plan_granted: extra?.planGranted || null,
      user_created: extra?.userCreated ?? false,
    };

    // One record per email+source: update existing if found, insert otherwise
    if (email) {
      const { data: existing } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('email_extracted', email)
        .eq('source', source)
        .order('processed_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        await supabase
          .from('webhook_logs')
          .update({ ...logData, processed_at: new Date().toISOString() })
          .eq('id', existing.id);
        return;
      }
    }

    await supabase.from('webhook_logs').insert(logData);
  } catch (err) {
    console.error(`[webhook/${source}] Failed to log event:`, eventType, err);
  }
}

/**
 * Finds an existing user by email or creates a new one.
 * Returns the user ID and whether the user was newly created.
 */
export async function findOrCreateUser(
  email: string,
  name: string,
  webhookSource: string,
): Promise<{ userId: string; created: boolean }> {
  const supabase = await createAdminClient();

  // Try to find existing user by email
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingProfile) {
    return { userId: existingProfile.id, created: false };
  }

  // Create new auth user with default password from app_config
  const defaultPassword = await getDefaultPassword();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
  });

  if (authError) {
    // Handle case where auth user exists but profile doesn't
    if (
      authError.message?.toLowerCase().includes('already') ||
      authError.message?.toLowerCase().includes('duplicate')
    ) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const authUser = users?.users?.find((u) => u.email === email);
      if (authUser) {
        return { userId: authUser.id, created: false };
      }
    }
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Generate unique referral code
  const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    email,
    full_name: name || '',
    plan: 'starter',
    referral_code: referralCode,
    webhook_source: webhookSource,
    onboarding_completed: true,
  });

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  return { userId, created: true };
}

/**
 * Upgrades a user's plan. If user doesn't exist, creates them first.
 */
export async function handlePurchase(
  email: string,
  name: string,
  plan: string,
  source: string,
  payload: Record<string, unknown>,
): Promise<{ userId: string; plan: string }> {
  const { userId, created } = await findOrCreateUser(email, name, source);

  const supabase = await createAdminClient();
  const now = new Date().toISOString();
  const credits = getAiCreditsForPlan(plan);

  // Starter (base product) = permanent access, no expiration
  // Paid plans = 30-day expiration
  const isBaseAccess = plan === 'starter';
  const expiresAt = isBaseAccess ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan,
      plan_started_at: now,
      plan_expires_at: expiresAt,
      ai_credits_remaining: credits.remaining,
      ai_credits_monthly: credits.monthly,
      webhook_source: source,
    })
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to upgrade plan: ${updateError.message}`);
  }

  const originalEvent = (payload.original_event as string) || 'purchase';
  await logWebhookEvent(source, originalEvent, { ...payload }, 'success', email, userId, undefined, {
    planGranted: plan,
    userCreated: created,
  });

  return { userId, plan };
}

/**
 * Downgrades a user's plan to starter on cancellation/refund.
 */
export async function handleCancellation(
  email: string,
  source: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<{ userId: string }> {
  const supabase = await createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!profile) {
    await logWebhookEvent(source, 'cancel', payload, 'error', email, undefined, 'User not found');
    throw new Error('User not found');
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      plan: 'starter',
      plan_started_at: null,
      plan_expires_at: null,
      ai_credits_remaining: 0,
      ai_credits_monthly: 0,
    })
    .eq('id', profile.id);

  if (updateError) {
    throw new Error(`Failed to downgrade plan: ${updateError.message}`);
  }

  await logWebhookEvent(source, 'cancel', { original_event: eventType, ...payload }, 'success', email, profile.id);

  return { userId: profile.id };
}

/**
 * Timing-safe comparison for webhook secrets/tokens
 */
export function verifyToken(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;

  const expectedBuf = Buffer.from(expected, 'utf-8');
  const receivedBuf = Buffer.from(received, 'utf-8');

  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
