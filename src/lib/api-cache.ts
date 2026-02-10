import { NextResponse } from 'next/server';

/**
 * Create a cached JSON response with proper Cache-Control headers.
 * All responses are private (per-user data, not CDN-cacheable).
 */
export function cachedJson(
  data: unknown,
  { maxAge = 120, staleWhileRevalidate = 300 }: { maxAge?: number; staleWhileRevalidate?: number } = {}
) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    },
  });
}
