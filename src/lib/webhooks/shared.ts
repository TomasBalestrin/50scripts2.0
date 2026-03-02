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
  // Trim payload to avoid bloating the database (Supabase free tier has 500MB limit)
  const trimmedPayload = trimPayload(payload || {});

  const row = {
    source,
    event_type: eventType,
    payload: trimmedPayload,
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

      // Database full or quota exceeded - log prominently
      if (insertError.message?.includes('quota') || insertError.message?.includes('storage') || insertError.code === '54000') {
        console.error(`[webhook/${source}] DATABASE QUOTA EXCEEDED - webhooks cannot be logged. Consider upgrading Supabase plan.`);
        return;
      }

      // Don't retry on constraint violations - they won't resolve
      if (insertError.code === '23505') return;
    } catch (err) {
      console.error(`[webhook/${source}] Log insert attempt ${attempt + 1} exception:`, eventType, err);
    }
  }
}

/**
 * Trims large payloads to reduce database storage usage.
 * Keeps only essential fields to minimize JSONB size.
 */
function trimPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const serialized = JSON.stringify(payload);
  // If payload is under 2KB, keep it as-is
  if (serialized.length <= 2048) return payload;

  // Extract only essential fields
  const trimmed: Record<string, unknown> = {};
  const essentialKeys = [
    'event', 'webhook_event_type', 'type', 'order_status',
    'email', 'product_id', 'order_id', 'transaction_id',
    'original_event', 'reprocessed', 'original_log_id',
  ];

  for (const key of essentialKeys) {
    if (key in payload) trimmed[key] = payload[key];
  }

  // Extract nested email/product info
  const data = payload.data as Record<string, unknown> | undefined;
  const buyer = (data?.buyer || payload.buyer || payload.Customer) as Record<string, unknown> | undefined;
  const product = (data?.product || payload.product) as Record<string, unknown> | undefined;

  if (buyer?.email) trimmed._buyer_email = buyer.email;
  if (buyer?.name || buyer?.full_name) trimmed._buyer_name = buyer.name || buyer.full_name;
  if (product?.id || product?.product_id) trimmed._product_id = product.id || product.product_id;

  trimmed._trimmed = true;
  trimmed._original_size = serialized.length;

  return trimmed;
}

/**
 * Looks up an auth user ID by email using the RPC function (single DB query).
 * Falls back to paginated listUsers if RPC is not available.
 */
async function lookupAuthUserByEmail(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  email: string,
): Promise<string | undefined> {
  // Strategy 1: RPC function (requires migration 015)
  try {
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_user_id_by_email', { lookup_email: email })
      .maybeSingle();

    if (!rpcError && rpcResult) {
      const userId = (rpcResult as { id?: string })?.id;
      if (userId) return userId;
    }
    if (rpcError) {
      console.warn(`[webhook] RPC get_user_id_by_email failed (run migration 015?): ${rpcError.message}`);
    }
  } catch {
    // RPC function doesn't exist
  }

  // Strategy 2: Paginate through auth users (slower but always works)
  let listPage = 1;
  const listPerPage = 500;
  const maxPages = 20; // Safety limit: 10,000 users max
  while (listPage <= maxPages) {
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers({
        page: listPage,
        perPage: listPerPage,
      });

      if (listError) {
        console.error(`[webhook] listUsers page ${listPage} error: ${listError.message}`);
        break;
      }

      if (!users?.users?.length) break;

      const match = users.users.find((u) => u.email === email);
      if (match) return match.id;

      if (users.users.length < listPerPage) break;
      listPage++;
    } catch (err) {
      console.error(`[webhook] listUsers page ${listPage} exception:`, err);
      break;
    }
  }

  return undefined;
}

/**
 * Creates a profile for an auth user. Uses upsert to handle race conditions.
 */
async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  email: string,
  name: string,
  webhookSource: string,
): Promise<void> {
  const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: name || '',
      plan: 'starter',
      referral_code: referralCode,
      webhook_source: webhookSource,
      onboarding_completed: true,
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(`Failed to create/upsert profile: ${error.message}`);
  }
}

/**
 * Finds an existing user by email or creates a new one.
 * Returns the user ID and whether the user was newly created.
 *
 * Handles these scenarios:
 * 1. User exists in profiles → return immediately
 * 2. User exists in auth but not in profiles → create missing profile
 * 3. User is brand new → create auth user + profile
 * 4. Any createUser error → try to find existing auth user and recover
 */
export async function findOrCreateUser(
  email: string,
  name: string,
  webhookSource: string,
): Promise<{ userId: string; created: boolean }> {
  const supabase = await createAdminClient();

  // Step 1: Check profiles table (fast path)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    return { userId: existingProfile.id, created: false };
  }

  // Step 2: Check if user exists in auth (without creating)
  // This catches the common case where auth user exists but profile is missing
  const existingAuthId = await lookupAuthUserByEmail(supabase, email);
  if (existingAuthId) {
    console.log(`[webhook/${webhookSource}] Auth user exists without profile, creating profile: ${email}`);
    await ensureProfile(supabase, existingAuthId, email, name, webhookSource);
    return { userId: existingAuthId, created: false };
  }

  // Step 3: Create new auth user
  const defaultPassword = await getDefaultPassword();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
  });

  if (authError) {
    const errorMsg = authError.message?.toLowerCase() || '';
    const isDuplicate = errorMsg.includes('already') || errorMsg.includes('duplicate');

    if (isDuplicate) {
      // Race condition: user was created between our check and createUser call
      // Try lookup again
      console.log(`[webhook/${webhookSource}] Race condition: user created concurrently for ${email}, looking up...`);
      const raceAuthId = await lookupAuthUserByEmail(supabase, email);
      if (raceAuthId) {
        await ensureProfile(supabase, raceAuthId, email, name, webhookSource);
        return { userId: raceAuthId, created: false };
      }
    }

    // For ANY error (rate limit, quota, network, etc.), log detailed info
    console.error(`[webhook/${webhookSource}] createUser failed for ${email}: ${authError.message} (code: ${authError.status || 'unknown'})`);
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  // Step 4: Create profile for the new auth user
  const userId = authData.user.id;
  console.log(`[webhook/${webhookSource}] Created new auth user: ${email} (${userId})`);

  await ensureProfile(supabase, userId, email, name, webhookSource);

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
