import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { stripe, PLAN_FROM_PRICE } from '@/lib/payments/stripe';
import { logWebhookEvent, getAiCreditsForPlan } from '@/lib/webhooks/shared';

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

// Common informational events that don't need action or logging
const IGNORED_EVENT_PREFIXES = [
  'charge.',
  'payment_intent.',
  'payment_method.',
  'customer.created',
  'customer.updated',
  'customer.source.',
  'customer.tax_id.',
  'invoice.created',
  'invoice.finalized',
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.updated',
  'invoiceitem.',
  'setup_intent.',
  'mandate.',
  'source.',
  'tax_rate.',
  'billing_portal.',
  'price.',
  'product.',
  'subscription_schedule.',
];

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
          await logWebhookEvent('stripe', 'checkout_completed', { session_id: session.id }, 'error', undefined, undefined, 'Missing user_id or plan in metadata');
          break;
        }

        // Fetch email for proper logging
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();
        const userEmail = (userProfile as { email?: string })?.email;

        // Save Stripe customer ID to profile
        if (session.customer) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: session.customer })
            .eq('id', userId);
        }

        // Upgrade user plan
        await upgradePlan(supabase, userId, plan);
        await logWebhookEvent('stripe', 'checkout_completed', {
          session_id: session.id,
          plan,
          customer: session.customer,
        }, 'success', userEmail, userId, undefined, { planGranted: plan });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as StripeSubscription;
        const customerId = subscription.customer;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          await logWebhookEvent('stripe', 'subscription_updated', {
            subscription_id: subscription.id,
            customer: customerId,
          }, 'error', undefined, undefined, 'User not found for customer');
          break;
        }

        const profileEmail = (profile as { id: string; email?: string }).email;

        // Determine the new plan from the subscription's price
        const priceId = subscription.items.data[0]?.price?.id;
        const newPlan = priceId ? PLAN_FROM_PRICE[priceId] : null;

        if (newPlan && subscription.status === 'active') {
          await upgradePlan(supabase, profile.id, newPlan);
          await logWebhookEvent('stripe', 'subscription_updated', {
            subscription_id: subscription.id,
            plan: newPlan,
            status: subscription.status,
          }, 'success', profileEmail, profile.id, undefined, { planGranted: newPlan });
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await downgradeToStarter(supabase, profile.id);
          await logWebhookEvent('stripe', 'subscription_updated', {
            subscription_id: subscription.id,
            status: subscription.status,
          }, 'success', profileEmail, profile.id);
        } else {
          await logWebhookEvent('stripe', 'subscription_updated', {
            subscription_id: subscription.id,
            status: subscription.status,
            price_id: priceId,
          }, 'info', profileEmail, profile.id);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as unknown as StripeSubscription;
        const customerId = subscription.customer;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) {
          await logWebhookEvent('stripe', 'subscription_deleted', {
            subscription_id: subscription.id,
            customer: customerId,
          }, 'error', undefined, undefined, 'User not found for customer');
          break;
        }

        const profileEmail = (profile as { id: string; email?: string }).email;

        // Downgrade to starter
        await downgradeToStarter(supabase, profile.id);
        await logWebhookEvent('stripe', 'subscription_deleted', {
          subscription_id: subscription.id,
          customer: customerId,
        }, 'success', profileEmail, profile.id);

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

        const profileEmail = (profile as { id: string; email?: string } | null)?.email;

        console.warn(
          '[webhook/stripe] Payment failed for customer:',
          customerId,
          'email:',
          profileEmail || 'unknown'
        );

        await logWebhookEvent('stripe', 'payment_failed', {
          invoice_id: invoice.id,
          customer: customerId,
          amount_due: invoice.amount_due,
          attempt_count: invoice.attempt_count,
        }, 'warning', profileEmail, profile?.id);

        // TODO: Send email notification about failed payment
        break;
      }

      default: {
        const isExpectedEvent = IGNORED_EVENT_PREFIXES.some((prefix) =>
          event.type.startsWith(prefix)
        );

        if (!isExpectedEvent) {
          // Only log truly unexpected events for monitoring
          await logWebhookEvent('stripe', event.type, { event_id: event.id }, 'info', undefined, undefined, `Evento Stripe nao mapeado: ${event.type}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[webhook/stripe] Error:', error);

    try {
      await logWebhookEvent(
        'stripe',
        'processing_error',
        {},
        'error',
        undefined,
        undefined,
        error instanceof Error ? error.message : 'Unknown error',
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
