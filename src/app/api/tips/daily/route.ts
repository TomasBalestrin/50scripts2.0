import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Get all active tips
    const { data: tips, error } = await supabase
      .from('microlearning_tips')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('[tips/daily] Error fetching tips:', error);
      return NextResponse.json(
        { error: 'Failed to fetch daily tip' },
        { status: 500 }
      );
    }

    if (!tips || tips.length === 0) {
      return NextResponse.json(
        { error: 'No tips available' },
        { status: 404 }
      );
    }

    // 2. Pick a random tip
    const randomIndex = Math.floor(Math.random() * tips.length);
    const tip = tips[randomIndex];

    // 3. Increment display_count
    await supabase
      .from('microlearning_tips')
      .update({ display_count: (tip.display_count ?? 0) + 1 })
      .eq('id', tip.id);

    return NextResponse.json({ tip });
  } catch (error) {
    console.error('[tips/daily] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
