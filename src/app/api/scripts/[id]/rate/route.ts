import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scriptRatingSchema } from '@/lib/validations/schemas';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scriptId } = await params;
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

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = scriptRatingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { effectiveness_rating, resulted_in_sale, sale_value, feedback_note } = parsed.data;

    // 3. Find the latest script_usage for this user + script
    const { data: latestUsage, error: usageError } = await supabase
      .from('script_usage')
      .select('id')
      .eq('user_id', userId)
      .eq('script_id', scriptId)
      .order('used_at', { ascending: false })
      .limit(1)
      .single();

    if (usageError || !latestUsage) {
      return NextResponse.json(
        { error: 'No usage found for this script. Use the script first.' },
        { status: 404 }
      );
    }

    // 4. Update the usage record with rating data
    const { error: updateError } = await supabase
      .from('script_usage')
      .update({
        effectiveness_rating,
        resulted_in_sale: resulted_in_sale ?? false,
        sale_value: sale_value ?? null,
        feedback_note: feedback_note ?? null,
      })
      .eq('id', latestUsage.id);

    if (updateError) {
      console.error('[scripts/id/rate] Error updating usage:', updateError);
      return NextResponse.json(
        { error: 'Failed to save rating' },
        { status: 500 }
      );
    }

    // 5. Add XP: 5 for rating, 25 if resulted in sale
    let xpGained = 5;
    await supabase.rpc('add_xp', { p_user_id: userId, p_xp: 5 });

    if (resulted_in_sale) {
      await supabase.rpc('add_xp', { p_user_id: userId, p_xp: 25 });
      xpGained += 25;
    }

    // 6. Recalculate script's global_effectiveness as average of all ratings
    const { data: avgData } = await supabase
      .from('script_usage')
      .select('effectiveness_rating')
      .eq('script_id', scriptId)
      .not('effectiveness_rating', 'is', null);

    if (avgData && avgData.length > 0) {
      const sum = avgData.reduce(
        (acc, row) => acc + (row.effectiveness_rating ?? 0),
        0
      );
      const avg = sum / avgData.length;

      await supabase
        .from('scripts')
        .update({ global_effectiveness: Math.round(avg * 100) / 100 })
        .eq('id', scriptId);
    }

    return NextResponse.json({
      message: 'Rating saved successfully',
      xp_gained: xpGained,
    });
  } catch (error) {
    console.error('[scripts/id/rate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
