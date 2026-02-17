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
 * Formato JSON esperado (padrão Hotmart):
 * {
 *   "event": "PURCHASE_COMPLETE" | "PURCHASE_CANCELED" | "PURCHASE_REFUNDED" | "SUBSCRIPTION_CANCELLATION",
 *   "data": {
 *     "buyer": { "email": "...", "name": "..." },
 *     "product": { "id": 123456 },
 *     "subscription": { "product": { "id": 123456 } }
 *   }
 * }
 *
 * Autenticação: Header X-Hotmart-Hottok
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  let buyerEmail = '';
  let event = '';

  try {
    // 1. Load config from DB (fallback env vars)
    const config = await getPlatformConfig(SOURCE);

    // 2. Verify Hottok header
    if (!verifyToken(request.headers.get('X-Hotmart-Hottok'), config.token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Parse request body
    body = await request.json();
    event = (body.event as string) || '';
    const dataObj = body.data as Record<string, unknown> | undefined;
    const buyerData = dataObj?.buyer as Record<string, unknown> || {};
    const productData = dataObj?.product as Record<string, unknown> | undefined;
    const subscriptionData = dataObj?.subscription as Record<string, unknown> | undefined;
    const subProduct = subscriptionData?.product as Record<string, unknown> | undefined;
    const productId = productData?.id?.toString() || subProduct?.id?.toString() || '';
    buyerEmail = (buyerData.email as string) || '';
    const buyerName = (buyerData.name as string) || '';

    if (!event) {
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
        product_id: productId,
        original_event: event,
      });

      return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
    } else if (isCancelEvent) {
      if (!buyerEmail) {
        await logWebhookEvent(SOURCE, normalizedEvent, body, 'error', '', undefined, 'Missing buyer email');
        return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
      }

      try {
        const result = await handleCancellation(buyerEmail, SOURCE, normalizedEvent, {
          product_id: productId,
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
