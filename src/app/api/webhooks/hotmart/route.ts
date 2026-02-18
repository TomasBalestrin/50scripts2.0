import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  handlePurchase,
  handleCancellation,
  logWebhookEvent,
} from '@/lib/webhooks/shared';
import { getPlatformConfig, buildProductMap } from '@/lib/webhooks/platform-config';

const SOURCE = 'hotmart';

/**
 * Hotmart Webhook
 *
 * Formato JSON esperado (padrao Hotmart):
 * {
 *   "event": "PURCHASE_COMPLETE" | "PURCHASE_CANCELED" | "PURCHASE_REFUNDED" | "SUBSCRIPTION_CANCELLATION",
 *   "data": {
 *     "buyer": { "email": "...", "name": "..." },
 *     "product": { "id": 123456 },
 *     "subscription": { "product": { "id": 123456 } }
 *   }
 * }
 *
 * Autenticacao: Header X-Hotmart-Hottok (opcional se nao configurado)
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  let buyerEmail = '';
  let event = '';

  try {
    // 1. Load config from DB (fallback env vars)
    const config = await getPlatformConfig(SOURCE);

    // 2. Parse body FIRST so we can always log it
    body = await request.json();
    event = (body.event as string) || '';

    // Extract email early for logging
    const dataObj = body.data as Record<string, unknown> | undefined;
    const buyerData = (dataObj?.buyer as Record<string, unknown>)
      || (body.buyer as Record<string, unknown>)
      || {};
    buyerEmail = ((buyerData.email as string) || (body.email as string) || '').toLowerCase().trim();
    const buyerName = (buyerData.name as string) || (buyerData.full_name as string) || '';

    // 3. Token verification: skip when no token is configured
    const receivedToken = request.headers.get('X-Hotmart-Hottok');
    const hasTokenConfigured = !!config.token;

    if (hasTokenConfigured && !verifyToken(receivedToken, config.token)) {
      await logWebhookEvent(SOURCE, event || 'unknown', body, 'error', buyerEmail, undefined, 'Token verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productData = (dataObj?.product as Record<string, unknown>)
      || (body.product as Record<string, unknown>)
      || {};
    const subscriptionData = (dataObj?.subscription as Record<string, unknown>)
      || (body.subscription as Record<string, unknown>)
      || {};
    const subProduct = subscriptionData?.product as Record<string, unknown> | undefined;
    const productId = productData?.id?.toString() || subProduct?.id?.toString() || (body.product_id as string) || '';

    if (!event) {
      await logWebhookEvent(SOURCE, 'unknown', body, 'error', buyerEmail, undefined, 'Missing event type');
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    const productMap = buildProductMap(config);

    // 4. Normalize and classify event
    const normalizedEvent = event.toLowerCase().trim().replace(/\./g, '_');

    const isPurchaseEvent =
      normalizedEvent === 'purchase' ||
      normalizedEvent.includes('approved') ||
      normalizedEvent.includes('complete') ||
      normalizedEvent.includes('paid');

    const isCancelEvent =
      normalizedEvent.includes('refund') ||
      normalizedEvent.includes('chargeback') ||
      normalizedEvent.includes('cancel');

    const isWarningEvent =
      normalizedEvent.includes('delayed') ||
      normalizedEvent.includes('protest') ||
      normalizedEvent.includes('pending');

    if (isPurchaseEvent) {
      if (!buyerEmail) {
        await logWebhookEvent(SOURCE, normalizedEvent, body, 'error', '', undefined, 'Missing buyer email');
        return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
      }

      const plan = productMap[productId] || 'starter';
      const result = await handlePurchase(buyerEmail, buyerName, plan, SOURCE, {
        ...body,
        product_id: productId,
        original_event: event,
      });

      return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
    } else if (isCancelEvent) {
      if (!buyerEmail) {
        await logWebhookEvent(SOURCE, normalizedEvent, body, 'error', '', undefined, 'Missing buyer email');
        return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
      }

      const result = await handleCancellation(buyerEmail, SOURCE, normalizedEvent, {
        ...body,
        product_id: productId,
      });
      return NextResponse.json({ success: true, user_id: result.userId || null });
    } else if (isWarningEvent) {
      await logWebhookEvent(SOURCE, normalizedEvent, {
        product_id: productId,
        buyer_name: buyerName,
      }, 'warning', buyerEmail);

      return NextResponse.json({ received: true, event });
    } else {
      // Treat any unrecognized event as a purchase if we have an email
      if (buyerEmail) {
        try {
          const plan = productMap[productId] || 'starter';
          const result = await handlePurchase(buyerEmail, buyerName, plan, SOURCE, {
            product_id: productId,
            original_event: event,
          });
          return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
        } catch (err) {
          await logWebhookEvent(SOURCE, normalizedEvent, body, 'error', buyerEmail, undefined,
            err instanceof Error ? err.message : 'Failed to process as purchase');
          return NextResponse.json({ received: true, event });
        }
      }
      await logWebhookEvent(SOURCE, normalizedEvent, body, 'warning', '', undefined, 'No email to process');
      return NextResponse.json({ received: true, event });
    }
  } catch (error) {
    console.error('[webhook/hotmart] Error:', error);

    try {
      await logWebhookEvent(SOURCE, event || 'unknown', body, 'error', buyerEmail, undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
