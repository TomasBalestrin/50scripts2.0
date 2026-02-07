import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cached, cacheDelete } from '@/lib/cache/kv';

const CACHE_KEY = 'categories:active:v1';
const CACHE_TTL = 3600; // 1 hour

export async function GET() {
  try {
    const categories = await cached(
      CACHE_KEY,
      async () => {
        const supabase = await createClient();

        const { data, error } = await supabase
          .from('script_categories')
          .select(`
            *,
            scripts_count:scripts(count)
          `)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          throw error;
        }

        // Transform the count from Supabase nested format to flat number
        return (data ?? []).map((cat) => ({
          ...cat,
          scripts_count:
            Array.isArray(cat.scripts_count) && cat.scripts_count.length > 0
              ? cat.scripts_count[0].count
              : 0,
        }));
      },
      { ttl: CACHE_TTL }
    );

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[categories] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories?action=invalidate
 * Invalidates the categories cache. Used after admin creates/updates categories.
 */
export async function POST() {
  try {
    await cacheDelete(CACHE_KEY);
    return NextResponse.json({ success: true, message: 'Cache invalidado' });
  } catch (error) {
    console.error('[categories] Cache invalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
