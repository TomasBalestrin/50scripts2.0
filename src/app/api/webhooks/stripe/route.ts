import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { stripe, PLAN_FROM_PRICE } from '@/lib/payments/stripe';

// ---------------------------------------------------------------------------
// Stripe Webhook Event Types (minimal interfaces for safety)
// ---------------------------------------------------------------------------

interface StripeCheckoutSession {
  id: string;
  customer?: string;
  metadata?: Record<string, string>;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  items: {
    data: Array<{
      price?: { id: string };
    }>;
  };
}

interface StripeInvoice {
  id: string;
  customer: string;
  amount_due?: number;
  attempt_count?: number;
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAiCreditsForPlan(plan: string): { monthly: number; remaining: number } {
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

async function upgradePlan(supabase: Awaited<ReturnType<typeof createAdminClient>>, userId: string, plan: string) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const credits = getAiCreditsForPlan(plan);

  const { error } = await supabase
    .from('profiles')
    .update({
      plan,
      plan_started_at: now,
      plan_expires_at: expiresAt,
      ai_credits_remaining: credits.remaining,
      ai_credits_monthly: credits.monthly,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to upgrade plan: ${error.message}`);
  }
}

async function downgradeToStarter(supabase: Awaited<ReturnType<typeof createAdminClient>>, userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'starter',
      plan_started_at: null,
      plan_expires_at: null,
      ai_credits_remaining: 0,
      ai_credits_monthly: 0,
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to downgrade plan: ${error.message}`);
  }
}

async function logWebhookEvent(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  eventType: string,
  payload: Record<string, unknown>,
  status: string,
  userId?: string,
  errorMessage?: string,
  email?: string,
) {
  try {
    const logData = {
      source: 'stripe' as const,
      event_type: `stripe_${eventType}`,
      payload,
      email_extracted: email || '',
      status,
      user_id: userId || null,
      error_message: errorMessage || null,
    };

    // One record per user+source: update existing if found, insert otherwise
    if (userId) {
      const { data: existing } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('source', 'stripe')
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
    } else if (email) {
      const { data: existing } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('email_extracted', email)
        .eq('source', 'stripe')
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
  } catch {
    console.error('[webhook/stripe] Failed to log event:', eventType);
  }
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('[webhook/stripe] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // 2. Verify Stripe signature
    let event: StripeEvent;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      ) as unknown as StripeEvent;
    } catch (err) {
      console.error('[webhook/stripe] Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // 3. Create a single admin client for all operations
    const supabase = await createAdminClient();

    // 4. Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as StripeCheckoutSession;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          await logWebhookEvent(supabase, 'checkout_completed', { session_id: session.id }, 'error', undefined, 'Missing user_id or plan in metadata');
          break;
        }

        // Save Stripe customer ID to profile
        if (session.customer) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: session.customer })
            .eq('id', userId);
        }

        // Upgrade user plan
        await upgradePlan(supabase, userId, plan);
        await logWebhookEvent(supabase, 'checkout_completed', {
          session_id: session.id,
          plan,
          customer: session.customer,
        }, 'success', userId);

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as StripeSubscription;
        const customerId = subscription.customer;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          await logWebhookEvent(supabase, 'subscription_updated', {
            subscription_id: subscription.id,
            customer: customerId,
          }, 'error', undefined, 'User not found for customer');
          break;
        }

        // Determine the new plan from the subscription's price
        const priceId = subscription.items.data[0]?.price?.id;
        const newPlan = priceId ? PLAN_FROM_PRICE[priceId] : null;

        if (newPlan && subscription.status === 'active') {
          await upgradePlan(supabase, profile.id, newPlan);
          await logWebhookEvent(supabase, 'subscription_updated', {
            subscription_id: subscription.id,
            plan: newPlan,
            status: subscription.status,
          }, 'success', profile.id);
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await downgradeToStarter(supabase, profile.id);
          await logWebhookEvent(supabase, 'subscription_updated', {
            subscription_id: subscription.id,
            status: subscription.status,
          }, 'success', profile.id);
        } else {
          await logWebhookEvent(supabase, 'subscription_updated', {
            subscription_id: subscription.id,
            status: subscription.status,
            price_id: priceId,
          }, 'info', profile.id);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as unknown as StripeSubscription;
        const customerId = subscription.customer;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          await logWebhookEvent(supabase, 'subscription_deleted', {
            subscription_id: subscription.id,
            customer: customerId,
          }, 'error', undefined, 'User not found for customer');
          break;
        }

        // Downgrade to starter
        await downgradeToStarter(supabase, profile.id);
        await logWebhookEvent(supabase, 'subscription_deleted', {
          subscription_id: subscription.id,
          customer: customerId,
        }, 'success', profile.id);

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as StripeInvoice;
        const customerId = invoice.customer;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single();

        console.warn(
          '[webhook/stripe] Payment failed for customer:',
          customerId,
          'email:',
          (profile as { email?: string })?.email || 'unknown'
        );

        await logWebhookEvent(supabase, 'payment_failed', {
          invoice_id: invoice.id,
          customer: customerId,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count,
        }, 'warning', profile?.id);

        // TODO: Send email notification about failed payment
        break;
      }

      default: {
        // Log unhandled events for monitoring
        await logWebhookEvent(supabase, event.type, { event_id: event.id }, 'unhandled');
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[webhook/stripe] Error:', error);

    try {
      const supabase = await createAdminClient();
      await logWebhookEvent(
        supabase,
        'processing_error',
        {},
        'error',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch {
      // Logging failed silently
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
