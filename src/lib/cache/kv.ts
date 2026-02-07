/**
 * Cache abstraction with in-memory TTL fallback.
 *
 * When @vercel/kv is available in the environment, it delegates to Vercel KV.
 * Otherwise, uses a simple in-memory Map with TTL expiration.
 *
 * This allows development without Vercel KV while being production-ready
 * when the package is installed and KV_REST_API_URL / KV_REST_API_TOKEN
 * environment variables are configured.
 */

interface CacheOptions {
  /** Time-to-live in seconds. Default: 3600 (1 hour) */
  ttl?: number;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// In-memory cache (development / fallback)
// ---------------------------------------------------------------------------
const memoryCache = new Map<string, CacheEntry>();

function cleanExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
    }
  }
}

// Periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpired, 5 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Vercel KV detection
// ---------------------------------------------------------------------------
let kv: {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, opts?: { ex?: number }) => Promise<void>;
  del: (key: string) => Promise<void>;
} | null = null;

async function getKV() {
  if (kv !== undefined && kv !== null) return kv;

  // Only attempt if env vars are present
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      // @ts-expect-error - @vercel/kv is an optional dependency
      const mod = await import('@vercel/kv');
      kv = mod.kv;
      return kv;
    } catch {
      // @vercel/kv not installed — fall back to memory
    }
  }

  kv = null;
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieve a value from cache.
 * Returns null if not found or expired.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const kvClient = await getKV();

  if (kvClient) {
    try {
      return await kvClient.get<T>(key);
    } catch (err) {
      console.warn('[cache] KV get error, falling back to memory:', err);
    }
  }

  // Memory fallback
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.value as T;
}

/**
 * Set a value in cache with optional TTL.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  options?: CacheOptions
): Promise<void> {
  const ttl = options?.ttl || 3600; // default 1 hour

  const kvClient = await getKV();
  if (kvClient) {
    try {
      await kvClient.set(key, value, { ex: ttl });
      return;
    } catch (err) {
      console.warn('[cache] KV set error, falling back to memory:', err);
    }
  }

  // Memory fallback
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttl * 1000,
  });
}

/**
 * Delete a key from cache.
 */
export async function cacheDelete(key: string): Promise<void> {
  const kvClient = await getKV();
  if (kvClient) {
    try {
      await kvClient.del(key);
    } catch (err) {
      console.warn('[cache] KV del error:', err);
    }
  }

  // Always clean from memory too
  memoryCache.delete(key);
}

/**
 * Wrapper for cached data fetching.
 *
 * If the key exists and is not expired, returns cached value.
 * Otherwise, calls the fetcher, caches the result, and returns it.
 *
 * @example
 * const categories = await cached(
 *   'categories:active',
 *   () => fetchCategoriesFromDB(),
 *   { ttl: 3600 }
 * );
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const existing = await cacheGet<T>(key);
  if (existing !== null) return existing;

  const value = await fetcher();
  await cacheSet(key, value, options);
  return value;
}

/**
 * Invalidate all keys matching a prefix (memory cache only).
 * For Vercel KV, use cacheDelete with specific keys.
 */
export function invalidatePrefix(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
