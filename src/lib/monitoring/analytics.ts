// Vercel Analytics event tracking
// Requires: npm install @vercel/analytics
// Gracefully degrades when not installed

let trackFn: ((name: string, props?: Record<string, string | number | boolean>) => void) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@vercel/analytics');
  trackFn = mod.track;
} catch {
  // @vercel/analytics not installed
}

export function trackEvent(name: string, properties?: Record<string, string | number | boolean>) {
  try {
    if (trackFn) {
      trackFn(name, properties);
    }
  } catch {
    // Analytics not available
  }
}

// Pre-defined events
export const events = {
  scriptCopied: (scriptId: string, category: string) =>
    trackEvent('script_copied', { scriptId, category }),
  scriptRated: (scriptId: string, rating: number) =>
    trackEvent('script_rated', { scriptId, rating }),
  saleRegistered: (value: number, scriptId: string) =>
    trackEvent('sale_registered', { value, scriptId }),
  planUpgraded: (from: string, to: string) =>
    trackEvent('plan_upgraded', { from, to }),
  aiGenerated: (type: string) =>
    trackEvent('ai_generated', { type }),
  leadCreated: () => trackEvent('lead_created'),
  emergencyUsed: (type: string) => trackEvent('emergency_used', { type }),
  referralShared: () => trackEvent('referral_shared'),
};
