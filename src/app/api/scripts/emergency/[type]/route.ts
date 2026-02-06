import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const EMERGENCY_CATEGORY_MAP: Record<string, string> = {
  approach: 'abordagem-inicial',
  objection: 'contorno-objecao',
  followup: 'follow-up',
  close: 'fechamento',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const supabase = await createClient();

    // 1. Validate emergency type
    const categorySlug = EMERGENCY_CATEGORY_MAP[type];

    if (!categorySlug) {
      return NextResponse.json(
        {
          error: 'Invalid emergency type',
          valid_types: Object.keys(EMERGENCY_CATEGORY_MAP),
        },
        { status: 400 }
      );
    }

    // 2. Get category by slug
    const { data: category, error: catError } = await supabase
      .from('script_categories')
      .select('id')
      .eq('slug', categorySlug)
      .eq('is_active', true)
      .single();

    if (catError || !category) {
      return NextResponse.json(
        { error: 'Category not found for this emergency type' },
        { status: 404 }
      );
    }

    // 3. Get top script by global_effectiveness from that category
    const { data: script, error: scriptError } = await supabase
      .from('scripts')
      .select(`
        *,
        category:script_categories(*)
      `)
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('global_effectiveness', { ascending: false })
      .limit(1)
      .single();

    if (scriptError || !script) {
      return NextResponse.json(
        { error: 'No script found for this emergency type' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      emergency_type: type,
      script,
    });
  } catch (error) {
    console.error('[scripts/emergency/type] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
