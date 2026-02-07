// Sentry error tracking
// Requires: npm install @sentry/nextjs
// Gracefully degrades when not installed

let Sentry: any = null;

try {
  Sentry = require('@sentry/nextjs');
} catch {
  // Sentry not installed
}

export function initSentry() {
  if (!Sentry || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
  console.error('[Error]', error.message, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

export function setUser(userId: string, email?: string) {
  if (Sentry) {
    Sentry.setUser({ id: userId, email });
  }
}
