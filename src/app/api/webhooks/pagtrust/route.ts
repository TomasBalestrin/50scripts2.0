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
 * Formato alternativo (sem wrapper "data"):
 * {
 *   "event": "purchase_approved",
 *   "buyer": { "email": "...", "name": "..." },
 *   "product": { "id": "xxx" },
 *   "email": "...",
 *   ...
 * }
 *
 * Autenticacao: Header X-PagTrust-Token (opcional se nao configurado)
 */
export async function POST(request: NextRequest) {
  // Declare outside try so they're available in catch for error logging
  let body: Record<string, unknown> = {};
  let buyerEmail = '';
  let rawEvent = '';

  try {
    const config = await getPlatformConfig(SOURCE);

    // Parse body FIRST so we can always log it
    body = await request.json();

    // Extract event and email early for logging purposes
    rawEvent = (body.event as string)
      || (body.webhook_event_type as string)
      || (body.type as string)
      || '';

    // Extract email from all possible locations
    const dataObj = body.data as Record<string, unknown> | undefined;
    const buyerData = (dataObj?.buyer as Record<string, unknown>)
      || (body.buyer as Record<string, unknown>)
      || (body.Customer as Record<string, unknown>)
      || {};
    buyerEmail = ((buyerData.email as string)
      || (body.email as string)
      || (dataObj?.email as string)
      || '').toLowerCase().trim();

    // Token verification: skip when no token is configured on our side
    const receivedToken = request.headers.get('X-PagTrust-Token')
      || request.headers.get('x-pagtrust-token');
    const hasTokenConfigured = !!config.token;

    if (hasTokenConfigured && !verifyToken(receivedToken, config.token)) {
      // Log the failed auth attempt so it shows in admin panel
      await logWebhookEvent(SOURCE, rawEvent || 'unknown', body, 'error', buyerEmail, undefined, 'Token verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productData = (dataObj?.product as Record<string, unknown>)
      || (body.product as Record<string, unknown>)
      || {};
    const subscriptionData = (dataObj?.subscription as Record<string, unknown>)
      || (body.subscription as Record<string, unknown>)
      || {};
    const subProduct = subscriptionData?.product as Record<string, unknown> | undefined;
    const transactionData = (dataObj?.transaction as Record<string, unknown>)
      || (body.transaction as Record<string, unknown>)
      || {};
    const productId = productData?.id?.toString() || subProduct?.id?.toString() || (body.product_id as string) || '';
    const transactionId = transactionData?.id || (body.transaction_id as string) || '';
    const buyerName = (buyerData.name as string) || (buyerData.full_name as string) || '';

    if (!rawEvent) {
      await logWebhookEvent(SOURCE, 'unknown', body, 'error', buyerEmail, undefined, 'Missing event type');
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    // Normalize event to lowercase and trim whitespace to handle all formats:
    // PagTrust sends: purchase_approved, purchase_refunded, etc.
    // Legacy format:  PAYMENT_APPROVED, PAYMENT_REFUNDED, etc.
    // Also handles: purchase (bare), purchase.approved (dot-separated)
    const event = rawEvent.toLowerCase().trim().replace(/\./g, '_');

    const productMap = buildProductMap(config);

    if (Object.keys(productMap).length === 0) {
      console.warn(`[webhook/pagtrust] No product IDs configured - all purchases will default to 'starter' plan`);
    }

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
        ...body,
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

      const result = await handleCancellation(buyerEmail, SOURCE, event, {
        ...body,
        product_id: productId,
        transaction_id: transactionId,
      });
      return NextResponse.json({ success: true, user_id: result.userId || null });
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
          return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
        }
      }
      await logWebhookEvent(SOURCE, event, body, 'warning', '', undefined, 'No email to process');
      return NextResponse.json({ received: true, event: rawEvent });
    }
  } catch (error) {
    console.error('[webhook/pagtrust] Error:', error);

    try {
      await logWebhookEvent(SOURCE, rawEvent || 'unknown', body, 'error', buyerEmail, undefined,
        error instanceof Error ? error.message : 'Unknown error');
    } catch { /* silent */ }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
