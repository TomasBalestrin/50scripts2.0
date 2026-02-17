import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  handlePurchase,
  handleCancellation,
  logWebhookEvent,
} from '@/lib/webhooks/shared';
import { getPlatformConfig, buildProductMap } from '@/lib/webhooks/platform-config';

const SOURCE = 'kiwify';

/**
 * Kiwify Webhook
 *
 * Formato JSON esperado (padrao Kiwify):
 * {
 *   "webhook_event_type": "order_paid" | "order_refunded" | "subscription_canceled" | "chargeback",
 *   "order_id": "xxx",
 *   "order_status": "paid" | "refunded" | "chargedback",
 *   "product": { "product_id": "xxx", "product_name": "..." },
 *   "Customer": { "full_name": "...", "email": "..." },
 *   "Subscription": { "id": "xxx", "status": "active" | "canceled", "plan": { "id": "xxx" } }
 * }
 *
 * Autenticacao: Header X-Kiwify-Token (opcional se nao configurado)
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  let customerEmail = '';
  let event = '';

  try {
    const config = await getPlatformConfig(SOURCE);

    // Parse body FIRST so we can always log it
    body = await request.json();
    event = (body.webhook_event_type as string) || (body.order_status as string) || (body.event as string) || '';

    // Extract email early for logging
    const customerData = (body.Customer as Record<string, unknown>)
      || (body.customer as Record<string, unknown>)
      || {};
    customerEmail = (customerData.email as string) || (body.email as string) || '';
    const customerName = (customerData.full_name as string) || (customerData.name as string) || '';

    // Token verification: skip when no token is configured
    const receivedToken = request.headers.get('X-Kiwify-Token')
      || request.headers.get('x-kiwify-token');
    const hasTokenConfigured = !!config.token;

    if (hasTokenConfigured && !verifyToken(receivedToken, config.token)) {
      await logWebhookEvent(SOURCE, event || 'unknown', body, 'error', customerEmail, undefined, 'Token verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const kiwifyProduct = body.product as Record<string, unknown> | undefined;
    const kiwifySubscription = body.Subscription as Record<string, unknown> | undefined;
    const kiwifyPlan = kiwifySubscription?.plan as Record<string, unknown> | undefined;
    const productId = kiwifyProduct?.product_id?.toString() || kiwifyPlan?.id?.toString() || (body.product_id as string) || '';

    if (!event) {
      await logWebhookEvent(SOURCE, 'unknown', body, 'error', customerEmail, undefined, 'Missing event type');
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    const productMap = buildProductMap(config);

    // Normalize and classify event
    const normalizedEvent = event.toLowerCase().trim().replace(/\./g, '_');

    const isPurchaseEvent =
      normalizedEvent === 'purchase' ||
      normalizedEvent.includes('paid') ||
      normalizedEvent.includes('approved') ||
      normalizedEvent.includes('complete');

    const isCancelEvent =
      normalizedEvent.includes('refund') ||
      normalizedEvent.includes('chargeback') ||
      normalizedEvent.includes('cancel');

    const isWarningEvent =
      normalizedEvent.includes('waiting') ||
      normalizedEvent.includes('expired') ||
      normalizedEvent.includes('pending');

    if (isPurchaseEvent) {
      if (!customerEmail) {
        await logWebhookEvent(SOURCE, normalizedEvent, body, 'error', '', undefined, 'Missing customer email');
        return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
      }

      const plan = productMap[productId] || 'starter';
      const result = await handlePurchase(customerEmail, customerName, plan, SOURCE, {
        product_id: productId,
        order_id: body.order_id,
        original_event: event,
      });

      return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
    } else if (isCancelEvent) {
      if (!customerEmail) {
        await logWebhookEvent(SOURCE, normalizedEvent, body, 'error', '', undefined, 'Missing customer email');
        return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
      }

      try {
        const result = await handleCancellation(customerEmail, SOURCE, normalizedEvent, {
          product_id: productId,
          order_id: body.order_id,
        });
        return NextResponse.json({ success: true, user_id: result.userId });
      } catch (err) {
        if (err instanceof Error && err.message === 'User not found') {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        throw err;
      }
    } else if (isWarningEvent) {
      await logWebhookEvent(SOURCE, normalizedEvent, {
        product_id: productId,
        order_id: body.order_id,
      }, 'warning', customerEmail);

      return NextResponse.json({ received: true, event });
    } else {
      // Treat any unrecognized event as a purchase if we have an email
      if (customerEmail) {
        try {
          const plan = productMap[productId] || 'starter';
          const result = await handlePurchase(customerEmail, customerName, plan, SOURCE, {
            product_id: productId,
            order_id: body.order_id,
            original_event: event,
          });
          return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
        } catch (err) {
          await logWebhookEvent(SOURCE, normalizedEvent, body, 'error', customerEmail, undefined,
            err instanceof Error ? err.message : 'Failed to process as purchase');
          return NextResponse.json({ received: true, event });
        }
      }
      await logWebhookEvent(SOURCE, normalizedEvent, body, 'warning', '', undefined, 'No email to process');
      return NextResponse.json({ received: true, event });
    }
  } catch (error) {
    console.error('[webhook/kiwify] Error:', error);

    try {
      await logWebhookEvent(SOURCE, event || 'unknown', body, 'error', customerEmail, undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
