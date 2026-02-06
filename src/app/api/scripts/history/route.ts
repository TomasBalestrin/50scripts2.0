import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth required
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const trail = searchParams.get('trail');
    const result = searchParams.get('result');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // 3. Build base query for count
    let countQuery = supabase
      .from('script_usage')
      .select('*, scripts!inner(id, title, category_id, category:script_categories(id, name, slug, icon, color))', { count: 'exact', head: true })
      .eq('user_id', userId);

    // 4. Build base query for data
    let dataQuery = supabase
      .from('script_usage')
      .select(`
        id,
        script_id,
        tone_used,
        used_at,
        effectiveness_rating,
        resulted_in_sale,
        sale_value,
        feedback_note,
        scripts!inner(
          id,
          title,
          category_id,
          category:script_categories(id, name, slug, icon, color)
        )
      `)
      .eq('user_id', userId);

    // 5. Apply trail filter
    if (trail) {
      countQuery = countQuery.eq('scripts.category.slug', trail);
      dataQuery = dataQuery.eq('scripts.category.slug', trail);
    }

    // 6. Apply result filter
    if (result === 'sale') {
      countQuery = countQuery.eq('resulted_in_sale', true);
      dataQuery = dataQuery.eq('resulted_in_sale', true);
    } else if (result === 'no-sale') {
      countQuery = countQuery.or('resulted_in_sale.is.null,resulted_in_sale.eq.false');
      dataQuery = dataQuery.or('resulted_in_sale.is.null,resulted_in_sale.eq.false');
    }

    // 7. Get total count
    const { count: total } = await countQuery;

    // 8. Get paginated data
    const { data: usages, error } = await dataQuery
      .order('used_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[scripts/history] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      usages: usages ?? [],
      total: total ?? 0,
      page,
      limit,
      totalPages: Math.ceil((total ?? 0) / limit),
    });
  } catch (error) {
    console.error('[scripts/history] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
