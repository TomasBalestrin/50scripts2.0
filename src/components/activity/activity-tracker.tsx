'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Invisible component that tracks user activity:
 * - Page views on navigation
 * - Periodic heartbeats for session duration
 * Batches events and sends via beacon API for reliability.
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const lastPath = useRef('');
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Track page view on route change
    if (pathname !== lastPath.current) {
      lastPath.current = pathname;
      sendEvent({ event_type: 'page_view', page_path: pathname });
    }
  }, [pathname]);

  useEffect(() => {
    // Heartbeat for session duration tracking
    heartbeatRef.current = setInterval(() => {
      sendEvent({ event_type: 'heartbeat', page_path: lastPath.current });
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  return null;
}

function sendEvent(event: { event_type: string; page_path?: string }) {
  // Use fetch with keepalive for reliability (works like sendBeacon)
  try {
    fetch('/api/activity/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silent - activity tracking should never break the app
  }
}
