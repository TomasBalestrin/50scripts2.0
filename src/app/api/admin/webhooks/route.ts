import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const source = searchParams.get('source');
    const eventType = searchParams.get('event_type');
    const status = searchParams.get('status');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('webhook_logs')
      .select('*', { count: 'exact' })
      .order('processed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (source) {
      query = query.eq('source', source);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (status === 'success') {
      query = query.is('error_message', null);
    } else if (status === 'error') {
      query = query.not('error_message', 'is', null);
    }

    const { data: logs, error: queryError, count } = await query;

    if (queryError) {
      console.error('[admin/webhooks] Error fetching webhook logs:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch webhook logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      logs: logs ?? [],
      total: count ?? 0,
      page,
    });
  } catch (err) {
    console.error('[admin/webhooks] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
