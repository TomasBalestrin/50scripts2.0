import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/scripts/sales-check?ids=id1,id2,id3
 * Returns which script IDs have at least one sale for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ scriptIds: [] });
    }

    const idsParam = request.nextUrl.searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ scriptIds: [] });
    }

    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ scriptIds: [] });
    }

    const { data: sales } = await supabase
      .from('script_sales')
      .select('script_id')
      .eq('user_id', user.id)
      .in('script_id', ids);

    const uniqueIds = [...new Set((sales ?? []).map((s) => s.script_id))];

    return NextResponse.json({ scriptIds: uniqueIds });
  } catch {
    return NextResponse.json({ scriptIds: [] });
  }
}
