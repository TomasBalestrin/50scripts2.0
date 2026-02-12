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

    // 1. Fetch category and auth user in parallel
    const [categoryResult, userResult] = await Promise.all([
      supabase
        .from('script_categories')
        .select('id, name, slug, description, icon, color, display_order')
        .eq('slug', slug)
        .eq('is_active', true)
        .single(),
      supabase.auth.getUser(),
    ]);

    const { data: category, error: catError } = categoryResult;
    if (catError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const user = userResult.data?.user;

    // 2. Fetch user profile and scripts in parallel
    const [profileResult, scriptsResult] = await Promise.all([
      user
        ? supabase.from('profiles').select('plan').eq('id', user.id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from('scripts')
        .select('id, title, content, content_formal, content_direct, context_description, min_plan, display_order, global_effectiveness, global_usage_count, global_conversion_rate, audio_url, category_id')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);

    const userPlan: Plan = (profileResult.data?.plan as Plan) ?? 'starter';

    const { data: scripts, error: scriptsError } = scriptsResult;
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
