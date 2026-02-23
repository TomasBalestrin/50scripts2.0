import type { PushSubscription as WebPushSubscription } from 'web-push';

// Lazy-load web-push to avoid issues if not installed
let webpush: typeof import('web-push') | null = null;

async function getWebPush() {
  if (!webpush) {
    try {
      webpush = await import('web-push');

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;

      if (!publicKey || !privateKey) {
        console.error('[push] VAPID keys not configured');
        return null;
      }

      webpush.setVapidDetails(
        'mailto:contato@scriptgo.com.br',
        publicKey,
        privateKey
      );
    } catch {
      console.error('[push] web-push package not available');
      return null;
    }
  }
  return webpush;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to a single subscription.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendPushToUser(
  subscription: WebPushSubscription | Record<string, unknown>,
  payload: PushPayload
): Promise<boolean> {
  const wp = await getWebPush();
  if (!wp) return false;

  try {
    await wp.sendNotification(
      subscription as WebPushSubscription,
      JSON.stringify(payload)
    );
    return true;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode;
    // 410 Gone or 404 = subscription expired/invalid
    if (statusCode === 410 || statusCode === 404) {
      console.log('[push] Subscription expired, should be removed');
    } else {
      console.error('[push] Failed to send notification:', error);
    }
    return false;
  }
}

/**
 * Send push notifications to multiple users.
 * Takes an array of { subscription, payload } and sends in parallel.
 * Returns { sent, failed, expired } counts.
 */
export async function sendPushBulk(
  notifications: Array<{
    userId: string;
    subscription: WebPushSubscription | Record<string, unknown>;
    payload: PushPayload;
  }>
): Promise<{ sent: number; failed: number; expired: string[] }> {
  const wp = await getWebPush();
  if (!wp) return { sent: 0, failed: notifications.length, expired: [] };

  const expired: string[] = [];
  let sent = 0;
  let failed = 0;

  // Send in batches of 50 to avoid overwhelming
  const BATCH_SIZE = 50;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    const batch = notifications.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (n) => {
        try {
          await wp.sendNotification(
            n.subscription as WebPushSubscription,
            JSON.stringify(n.payload)
          );
          return { success: true, userId: n.userId };
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            return { success: false, userId: n.userId, expired: true };
          }
          return { success: false, userId: n.userId, expired: false };
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          sent++;
        } else {
          failed++;
          if (result.value.expired) {
            expired.push(result.value.userId);
          }
        }
      } else {
        failed++;
      }
    }
  }

  return { sent, failed, expired };
}
