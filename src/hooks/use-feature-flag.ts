'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Return type for the useFeatureFlag hook.
 */
interface UseFeatureFlagResult {
  /** Whether the feature is enabled for the current user */
  enabled: boolean;
  /** Whether the flag data is still being fetched */
  loading: boolean;
  /** The variant name assigned to the user ('control' or 'treatment') */
  variant: string;
  /** Re-fetch the feature flag status */
  refetch: () => void;
}

/**
 * Cache for feature flag data to avoid redundant API calls.
 * Shared across all hook instances within the same page lifecycle.
 */
let flagCache: {
  flags: Record<string, boolean>;
  variants: Record<string, string>;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 60_000; // 1 minute cache

/**
 * React hook that resolves a feature flag for the current authenticated user.
 *
 * Fetches from /api/feature-flags which returns both boolean flag states
 * and variant name assignments. Results are cached in memory for 1 minute
 * to prevent redundant network requests when multiple components use the
 * same or different flags.
 *
 * @param flagKey - The feature flag key (e.g., 'ab_onboarding_v2')
 * @returns { enabled, loading, variant, refetch }
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { enabled, loading, variant } = useFeatureFlag('ab_dashboard_layout');
 *
 *   if (loading) return <Skeleton />;
 *
 *   if (enabled && variant === 'treatment') {
 *     return <NewDashboardLayout />;
 *   }
 *
 *   return <OriginalDashboardLayout />;
 * }
 * ```
 */
export function useFeatureFlag(flagKey: string): UseFeatureFlagResult {
  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState('control');
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async (bypassCache = false) => {
    setLoading(true);

    try {
      // Check in-memory cache first
      if (
        !bypassCache &&
        flagCache &&
        Date.now() - flagCache.timestamp < CACHE_TTL_MS
      ) {
        setEnabled(flagCache.flags[flagKey] ?? false);
        setVariant(flagCache.variants[flagKey] ?? 'control');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/feature-flags', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        // Not authenticated or server error — default to disabled/control
        setEnabled(false);
        setVariant('control');
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Update shared cache
      flagCache = {
        flags: data.flags ?? {},
        variants: data.variants ?? {},
        timestamp: Date.now(),
      };

      setEnabled(data.flags?.[flagKey] ?? false);
      setVariant(data.variants?.[flagKey] ?? 'control');
    } catch {
      // Network error — default to disabled/control
      setEnabled(false);
      setVariant('control');
    } finally {
      setLoading(false);
    }
  }, [flagKey]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const refetch = useCallback(() => {
    fetchFlags(true);
  }, [fetchFlags]);

  return { enabled, loading, variant, refetch };
}

/**
 * Invalidate the in-memory feature flag cache.
 * Call this when you know flags have changed (e.g., after an admin updates them).
 */
export function invalidateFeatureFlagCache(): void {
  flagCache = null;
}
