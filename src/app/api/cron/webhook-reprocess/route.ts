import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { handlePurchase, handleCancellation } from '@/lib/webhooks/shared';
import { getPlatformConfig, buildProductMap } from '@/lib/webhooks/platform-config';

// Cron job to auto-reprocess unhandled/ignored webhooks.
// Runs every 10 minutes via Vercel Cron.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();

    const { data: logs, error: fetchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .in('status', ['unhandled', 'ignored'])
      .order('processed_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('[cron/webhook-reprocess] Query error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ message: 'No pending webhooks', processed: 0, failed: 0 });
    }

    const configCache: Record<string, Awaited<ReturnType<typeof getPlatformConfig>>> = {};
    let processed = 0;
    let failed = 0;

    for (const log of logs) {
      const payload = log.payload as Record<string, unknown>;
      const source = log.source;
      const eventType = log.event_type;

      const data = payload.data as Record<string, unknown> | undefined;
      const buyerData = (data?.buyer as Record<string, unknown>) || (payload.Customer as Record<string, unknown>) || {};
      const buyerName = (buyerData?.name as string) || (buyerData?.full_name as string) || '';

      const email = log.email_extracted
        || (buyerData?.email as string)
        || (payload.email as string)
        || '';

      if (!email) {
        failed++;
        continue;
      }

      try {
        const productData = (data?.product as Record<string, unknown>) || {};
        const subscriptionData = (data?.subscription as Record<string, unknown>) || {};
        const subProduct = (subscriptionData?.product as Record<string, unknown>) || {};
        const kiwifyProduct = (payload.product as Record<string, unknown>) || {};
        const productId = productData?.id?.toString()
          || subProduct?.id?.toString()
          || kiwifyProduct?.product_id?.toString()
          || (payload.product_id as string)
          || '';

        const strippedEvent = eventType.replace(/^(hotmart|pagtrust|kiwify)_/i, '');
        const normalizedEvent = strippedEvent.toLowerCase();

        if (
          normalizedEvent.includes('refund') ||
          normalizedEvent.includes('chargeback') ||
          normalizedEvent.includes('cancel')
        ) {
          const result = await handleCancellation(email, source, eventType, {
            reprocessed: true,
            original_log_id: log.id,
          });

          await supabase
            .from('webhook_logs')
            .update({
              status: 'reprocessed',
              user_id: result.userId || null,
              error_message: null,
            })
            .eq('id', log.id);
        } else {
          // Treat as purchase (most common)
          if (!configCache[source]) {
            configCache[source] = await getPlatformConfig(source);
          }
          const config = configCache[source];
          const productMap = buildProductMap(config);
          const plan = productMap[productId] || 'starter';

          const result = await handlePurchase(email, buyerName, plan, source, {
            product_id: productId,
            reprocessed: true,
            original_log_id: log.id,
            original_event: eventType,
          });

          await supabase
            .from('webhook_logs')
            .update({
              status: 'reprocessed',
              user_id: result.userId,
              plan_granted: result.plan,
              error_message: null,
            })
            .eq('id', log.id);
        }

        processed++;
      } catch {
        failed++;
      }
    }

    console.log(`[cron/webhook-reprocess] Processed: ${processed}, Failed: ${failed}`);

    return NextResponse.json({
      message: `Reprocessed ${processed} webhooks`,
      processed,
      failed,
      total: logs.length,
    });
  } catch (error) {
    console.error('[cron/webhook-reprocess] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
