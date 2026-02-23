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
  const row = {
    source,
    event_type: eventType,
    payload: payload || {},
    email_extracted: email || '',
    status,
    user_id: userId || null,
    error_message: errorMessage || null,
    plan_granted: extra?.planGranted || null,
    user_created: extra?.userCreated ?? false,
    processed_at: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const supabase = await createAdminClient();
      const { error: insertError } = await supabase.from('webhook_logs').insert(row);

      if (!insertError) return; // success

      console.error(`[webhook/${source}] Log insert attempt ${attempt + 1} failed:`, insertError.message, insertError.code);

      // Don't retry on constraint violations - they won't resolve
      if (insertError.code === '23505') return;
    } catch (err) {
      console.error(`[webhook/${source}] Log insert attempt ${attempt + 1} exception:`, eventType, err);
    }
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
      // Search for the existing auth user by email
      // Use paginated call to avoid loading all users at once
      let authUser: { id: string; email?: string } | undefined;
      let page = 1;
      while (!authUser && page <= 10) {
        const { data: users } = await supabase.auth.admin.listUsers({
          page,
          perPage: 100,
        });
        authUser = users?.users?.find((u) => u.email === email);
        if (!users?.users?.length || users.users.length < 100) break;
        page++;
      }
      if (authUser) {
        // Create missing profile for existing auth user
        const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        await supabase.from('profiles').upsert({
          id: authUser.id,
          email,
          full_name: name || '',
          plan: 'starter',
          referral_code: referralCode,
          webhook_source: webhookSource,
          onboarding_completed: true,
        }, { onConflict: 'id' });
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
  rawEmail: string,
  name: string,
  plan: string,
  source: string,
  payload: Record<string, unknown>,
): Promise<{ userId: string; plan: string }> {
  const email = rawEmail.toLowerCase().trim();
  console.log(`[webhook/${source}] Processing purchase: email=${email}, plan=${plan}, product_id=${payload.product_id || 'none'}`);
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
  rawEmail: string,
  source: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<{ userId: string }> {
  const email = rawEmail.toLowerCase().trim();
  const supabase = await createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!profile) {
    // User not found is normal for cancel webhooks - platforms send cancels
    // for all their users, including those who never registered in our system.
    // Do NOT log these - they generate thousands of useless 'info' rows.
    return { userId: '' };
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
