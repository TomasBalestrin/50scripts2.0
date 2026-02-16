import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  handlePurchase,
  handleCancellation,
  logWebhookEvent,
} from '@/lib/webhooks/shared';
import { getPlatformConfig, buildProductMap } from '@/lib/webhooks/platform-config';

const SOURCE = 'pagtrust';

/**
 * PagTrust Webhook
 *
 * Formato JSON esperado:
 * {
 *   "event": "purchase_approved" | "purchase_refunded" | "purchase_chargeback" | "subscription_canceled",
 *   "data": {
 *     "buyer": { "email": "...", "name": "..." },
 *     "product": { "id": "xxx", "name": "..." },
 *     "transaction": { "id": "xxx", "status": "approved" | "refunded" },
 *     "subscription": { "id": "xxx", "product": { "id": "xxx" } }
 *   }
 * }
 *
 * Também aceita eventos no formato PAYMENT_APPROVED (legado).
 * Autenticação: Header X-PagTrust-Token
 */
export async function POST(request: NextRequest) {
  try {
    const config = await getPlatformConfig(SOURCE);

    if (!verifyToken(request.headers.get('X-PagTrust-Token'), config.token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rawEvent = body.event;
    const buyerData = body.data?.buyer || {};
    const productId = body.data?.product?.id?.toString() || body.data?.subscription?.product?.id?.toString() || '';
    const transactionId = body.data?.transaction?.id || '';
    const buyerEmail = buyerData.email || '';
    const buyerName = buyerData.name || '';

    if (!rawEvent) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    // Normalize event to lowercase and trim whitespace to handle all formats:
    // PagTrust sends: purchase_approved, purchase_refunded, etc.
    // Legacy format:  PAYMENT_APPROVED, PAYMENT_REFUNDED, etc.
    // Also handles: purchase (bare), purchase.approved (dot-separated)
    const event = rawEvent.toLowerCase().trim().replace(/\./g, '_');

    const productMap = buildProductMap(config);

    // Classify event type using includes() for more robust matching
    const isPurchaseEvent =
      event === 'purchase' ||
      event === 'purchase_approved' ||
      event === 'payment_approved' ||
      event.includes('approved') ||
      event.includes('paid') ||
      event.includes('complete');

    const isCancelEvent =
      event.includes('refund') ||
      event.includes('chargeback') ||
      event.includes('cancel');

    const isWarningEvent =
      event.includes('expired') ||
      event.includes('pending') ||
      event.includes('delayed') ||
      event.includes('protest');

    if (isPurchaseEvent) {
      if (!buyerEmail) {
        await logWebhookEvent(SOURCE, event, body, 'error', '', undefined, 'Missing buyer email');
        return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
      }

      const plan = productMap[productId] || 'starter';
      const result = await handlePurchase(buyerEmail, buyerName, plan, SOURCE, {
        product_id: productId,
        transaction_id: transactionId,
        original_event: rawEvent,
      });

      return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
    } else if (isCancelEvent) {
      if (!buyerEmail) {
        await logWebhookEvent(SOURCE, event, body, 'error', '', undefined, 'Missing buyer email');
        return NextResponse.json({ error: 'Missing buyer email' }, { status: 400 });
      }

      try {
        const result = await handleCancellation(buyerEmail, SOURCE, event, {
          product_id: productId,
          transaction_id: transactionId,
        });
        return NextResponse.json({ success: true, user_id: result.userId });
      } catch (err) {
        if (err instanceof Error && err.message === 'User not found') {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        throw err;
      }
    } else if (isWarningEvent) {
      await logWebhookEvent(SOURCE, event, {
        product_id: productId,
        transaction_id: transactionId,
      }, 'warning', buyerEmail);

      return NextResponse.json({ received: true, event: rawEvent });
    } else {
      // Treat any unrecognized event as a purchase if we have an email
      if (buyerEmail) {
        try {
          const plan = productMap[productId] || 'starter';
          const result = await handlePurchase(buyerEmail, buyerName, plan, SOURCE, {
            product_id: productId,
            transaction_id: transactionId,
            original_event: rawEvent,
          });
          return NextResponse.json({ success: true, user_id: result.userId, plan: result.plan });
        } catch (err) {
          await logWebhookEvent(SOURCE, event, body, 'error', buyerEmail, undefined,
            err instanceof Error ? err.message : 'Failed to process as purchase');
          return NextResponse.json({ received: true, event: rawEvent });
        }
      }
      await logWebhookEvent(SOURCE, event, body, 'warning', '', undefined, 'No email to process');
      return NextResponse.json({ received: true, event: rawEvent });
    }
  } catch (error) {
    console.error('[webhook/pagtrust] Error:', error);

    try {
      await logWebhookEvent(SOURCE, 'purchase', {}, 'error', '', undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
