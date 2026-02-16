import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { handlePurchase, handleCancellation } from '@/lib/webhooks/shared';
import { getPlatformConfig, buildProductMap } from '@/lib/webhooks/platform-config';

/**
 * POST /api/admin/webhooks/reprocess-all
 * Reprocesses all ignored/error webhook log entries in bulk.
 * Admin-only endpoint.
 */
export async function POST() {
  try {
    const { error } = await getAdminUser();
    if (error) return error;

    const supabase = await createAdminClient();

    // Fetch all ignored/error webhooks that haven't been successfully processed
    const { data: logs, error: fetchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .in('status', ['ignored', 'error'])
      .order('processed_at', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch webhook logs' }, { status: 500 });
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ success: true, total: 0, processed: 0, failed: 0, results: [] });
    }

    // Cache platform configs to avoid repeated DB queries
    const configCache: Record<string, Awaited<ReturnType<typeof getPlatformConfig>>> = {};

    const results: Array<{
      id: string;
      email: string;
      status: 'success' | 'error';
      plan?: string;
      error?: string;
    }> = [];

    // Process webhooks sequentially to avoid overwhelming the DB
    for (const log of logs) {
      const payload = log.payload as Record<string, unknown>;
      const source = log.source;
      const email = log.email_extracted;
      const eventType = log.event_type;

      if (!email) {
        results.push({ id: log.id, email: '', status: 'error', error: 'No email' });
        continue;
      }

      try {
        // Extract buyer name from payload
        const data = payload.data as Record<string, unknown> | undefined;
        const buyerData = data?.buyer as Record<string, unknown> | undefined;
        const buyerName = (buyerData?.name as string) || (buyerData?.full_name as string) || '';

        // Extract product ID from payload
        const productData = data?.product as Record<string, unknown> | undefined;
        const subscriptionData = data?.subscription as Record<string, unknown> | undefined;
        const subProduct = subscriptionData?.product as Record<string, unknown> | undefined;
        const productId = productData?.id?.toString() || subProduct?.id?.toString() ||
          (payload.product as Record<string, unknown>)?.product_id?.toString() || '';

        const normalizedEvent = eventType.toLowerCase();

        if (
          normalizedEvent.includes('approved') ||
          normalizedEvent.includes('complete') ||
          normalizedEvent.includes('paid') ||
          normalizedEvent === 'purchase' ||
          normalizedEvent === 'access_grant'
        ) {
          // Purchase event
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
          });

          await supabase
            .from('webhook_logs')
            .update({
              status: 'reprocessed',
              user_id: result.userId,
              user_created: true,
              plan_granted: result.plan,
              error_message: null,
            })
            .eq('id', log.id);

          results.push({ id: log.id, email, status: 'success', plan: result.plan });
        } else if (
          normalizedEvent.includes('refund') ||
          normalizedEvent.includes('chargeback') ||
          normalizedEvent.includes('cancel')
        ) {
          // Cancellation event
          const result = await handleCancellation(email, source, eventType, {
            reprocessed: true,
            original_log_id: log.id,
          });

          await supabase
            .from('webhook_logs')
            .update({
              status: 'reprocessed',
              user_id: result.userId,
              error_message: null,
            })
            .eq('id', log.id);

          results.push({ id: log.id, email, status: 'success' });
        } else {
          // Treat any unknown event as a purchase (most common webhook type)
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
              user_created: true,
              plan_granted: result.plan,
              error_message: null,
            })
            .eq('id', log.id);

          results.push({ id: log.id, email, status: 'success', plan: result.plan });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ id: log.id, email, status: 'error', error: errorMsg });
      }
    }

    const processed = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      total: logs.length,
      processed,
      failed,
      results,
    });
  } catch (error) {
    console.error('[admin/webhooks/reprocess-all] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
