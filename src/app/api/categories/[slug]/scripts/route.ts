import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import { cachedJson } from '@/lib/api-cache';
import type { Plan } from '@/types/database';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // 1. Get category by slug
    const { data: category, error: catError } = await supabase
      .from('script_categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (catError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // 2. Get user profile for plan check
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

    // 3. Get scripts in this category
    const { data: scripts, error: scriptsError } = await supabase
      .from('scripts')
      .select('*')
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (scriptsError) {
      console.error('[categories/slug/scripts] Error fetching scripts:', scriptsError);
      return NextResponse.json(
        { error: 'Failed to fetch scripts' },
        { status: 500 }
      );
    }

    // 4. Filter by user plan and mark locked scripts
    const filteredScripts = (scripts ?? []).map((script) => ({
      ...script,
      is_locked: !hasAccess(userPlan, script.min_plan as Plan),
    }));

    return cachedJson({
      category,
      scripts: filteredScripts,
    }, { maxAge: 300, staleWhileRevalidate: 600 });
  } catch (error) {
    console.error('[categories/slug/scripts] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
