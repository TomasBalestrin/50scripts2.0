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
  try {
    // 1. Load config from DB (fallback env vars)
    const config = await getPlatformConfig(SOURCE);

    // 2. Verify Hottok header
    if (!verifyToken(request.headers.get('X-Hotmart-Hottok'), config.token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Parse request body
    const body = await request.json();
    const event = body.event;
    const buyerData = body.data?.buyer || {};
    const productId = body.data?.product?.id?.toString() || body.data?.subscription?.product?.id?.toString() || '';
    const buyerEmail = buyerData.email || '';
    const buyerName = buyerData.name || '';

    if (!event) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    const productMap = buildProductMap(config);

    // 4. Handle events
    switch (event) {
      case 'PURCHASE_COMPLETE': {
        if (!buyerEmail) {
          await logWebhookEvent(SOURCE, 'purchase_complete', body, 'error', undefined, 'Missing buyer email');
          return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
        }

        const plan = productMap[productId] || 'pro';
        const result = await handlePurchase(buyerEmail, buyerName, plan, SOURCE, {
          product_id: productId,
        });

        return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
      }

      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'SUBSCRIPTION_CANCELLATION': {
        if (!buyerEmail) {
          await logWebhookEvent(SOURCE, event.toLowerCase(), body, 'error', undefined, 'Missing buyer email');
          return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
        }

        try {
          const result = await handleCancellation(buyerEmail, SOURCE, event.toLowerCase(), {
            product_id: productId,
          });
          return NextResponse.json({ success: true, user_id: result.userId });
        } catch (err) {
          if (err instanceof Error && err.message === 'User not found') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }
          throw err;
        }
      }

      case 'PURCHASE_DELAYED':
      case 'PURCHASE_PROTEST': {
        await logWebhookEvent(SOURCE, event.toLowerCase(), {
          email: buyerEmail,
          product_id: productId,
          buyer_name: buyerName,
        }, 'warning');

        return NextResponse.json({ received: true, event });
      }

      default: {
        await logWebhookEvent(SOURCE, event.toLowerCase(), body, 'unhandled');
        return NextResponse.json({ received: true, event });
      }
    }
  } catch (error) {
    console.error('[webhook/hotmart] Error:', error);

    try {
      await logWebhookEvent(SOURCE, 'processing_error', {}, 'error', undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
