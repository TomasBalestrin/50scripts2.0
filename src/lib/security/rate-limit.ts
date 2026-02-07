import { Plan } from '@/types/database';
import { RATE_LIMITS } from '@/lib/constants';

interface RateLimitConfig {
  windowMs: number;    // Time window in ms
  maxRequests: number; // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Simple in-memory store (works for single-server, use Redis for multi-server)
const store = new Map<string, RateLimitEntry>();

// Cleanup interval: remove expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Check rate limit for a given key (usually user ID or IP).
 * Returns whether the request is allowed, remaining requests, and reset time.
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt <= now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    store.set(key, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Increment count
  entry.count += 1;

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Plan-based rate limit configurations.
 * All use a 1-minute (60000ms) sliding window.
 */
export const PLAN_RATE_LIMITS: Record<Plan, RateLimitConfig> = {
  starter: {
    windowMs: 60_000,
    maxRequests: RATE_LIMITS.starter, // 30 req/min
  },
  pro: {
    windowMs: 60_000,
    maxRequests: RATE_LIMITS.pro, // 60 req/min
  },
  premium: {
    windowMs: 60_000,
    maxRequests: RATE_LIMITS.premium, // 120 req/min
  },
  copilot: {
    windowMs: 60_000,
    maxRequests: RATE_LIMITS.copilot, // 120 req/min
  },
};

/**
 * Convenience function: check rate limit for a user based on their plan.
 * Key is typically the user ID.
 */
export function checkPlanRateLimit(userId: string, plan: Plan): RateLimitResult {
  const config = PLAN_RATE_LIMITS[plan];
  return rateLimit(`plan:${userId}`, config);
}

/**
 * Rate limit config for webhook endpoints (stricter).
 * 10 requests per minute per source IP.
 */
export const WEBHOOK_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

/**
 * Rate limit config for auth endpoints (very strict to prevent brute force).
 * 5 attempts per 15 minutes per IP.
 */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60_000,
  maxRequests: 5,
};

/**
 * Rate limit config for AI generation endpoints.
 * 5 requests per minute per user (on top of credit limits).
 */
export const AI_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 5,
};

/**
 * Helper to create rate limit headers for API responses.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) }),
  };
}

/**
 * Reset rate limit for a key (useful for testing or admin overrides).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Clear all rate limit entries (useful for testing).
 */
export function clearAllRateLimits(): void {
  store.clear();
}
