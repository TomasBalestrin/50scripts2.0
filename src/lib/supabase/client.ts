import { createBrowserClient } from '@supabase/ssr';

// Singleton: reuse same client instance across the entire app.
// Without this, every hook render creates a new reference,
// which invalidates useCallback/useEffect dependency arrays → infinite loops.
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!cachedClient) {
    cachedClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return cachedClient;
}
