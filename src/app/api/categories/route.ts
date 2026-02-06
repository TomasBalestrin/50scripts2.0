import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: categories, error } = await supabase
      .from('script_categories')
      .select(`
        *,
        scripts_count:scripts(count)
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[categories] Error fetching categories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    // Transform the count from Supabase nested format to flat number
    const transformed = (categories ?? []).map((cat) => ({
      ...cat,
      scripts_count:
        Array.isArray(cat.scripts_count) && cat.scripts_count.length > 0
          ? cat.scripts_count[0].count
          : 0,
    }));

    return NextResponse.json({ categories: transformed });
  } catch (error) {
    console.error('[categories] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
