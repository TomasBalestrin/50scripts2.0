import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Get script with category info
    const { data: script, error } = await supabase
      .from('scripts')
      .select(`
        *,
        category:script_categories(*)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    // 2. Check plan access
    const { data: { user } } = await supabase.auth.getUser();

    let userPlan: Plan = 'starter';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (profile) {
        userPlan = profile.plan as Plan;
      }
    }

    const canAccess = hasAccess(userPlan, script.min_plan as Plan);

    if (!canAccess) {
      return NextResponse.json(
        {
          error: 'Plan upgrade required',
          required_plan: script.min_plan,
          current_plan: userPlan,
          script: {
            id: script.id,
            title: script.title,
            context_description: script.context_description,
            min_plan: script.min_plan,
            category: script.category,
            is_locked: true,
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      script: {
        ...script,
        is_locked: false,
      },
    });
  } catch (error) {
    console.error('[scripts/id] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
