import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/activity/track
 * Lightweight endpoint to track user activity events.
 * Accepts batched events for efficiency.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const events: Array<{
      event_type: string;
      page_path?: string;
      metadata?: Record<string, unknown>;
    }> = Array.isArray(body) ? body : [body];

    // Validate and limit batch size
    const validEvents = events.slice(0, 20).filter(
      (e) => e.event_type && typeof e.event_type === 'string'
    );

    if (validEvents.length === 0) {
      return NextResponse.json({ error: 'No valid events' }, { status: 400 });
    }

    const rows = validEvents.map((e) => ({
      user_id: user.id,
      event_type: e.event_type,
      page_path: e.page_path || null,
      metadata: e.metadata || {},
    }));

    // Fire and forget - don't block the response on DB write
    await supabase.from('user_activity').insert(rows);

    return NextResponse.json({ ok: true, count: rows.length });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
