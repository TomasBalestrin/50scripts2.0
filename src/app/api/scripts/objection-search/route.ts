import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { objectionSearchSchema } from '@/lib/validations/schemas';
import { hasAccess } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

export async function POST(request: NextRequest) {
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

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = objectionSearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query } = parsed.data;

    // 3. Get user plan
    let userPlan: Plan = 'starter';
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile) {
      userPlan = profile.plan as Plan;
    }

    // 4. Extract words from query for keyword matching
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 3);

    if (words.length === 0) {
      return NextResponse.json({
        scripts: [],
        total: 0,
        query,
      });
    }

    // 5. Get all active scripts that have objection_keywords
    const { data: scripts, error } = await supabase
      .from('scripts')
      .select(`
        *,
        category:script_categories(*)
      `)
      .eq('is_active', true)
      .not('objection_keywords', 'eq', '{}')
      .order('global_effectiveness', { ascending: false });

    if (error) {
      console.error('[scripts/objection-search] Error:', error);
      return NextResponse.json(
        { error: 'Failed to search scripts' },
        { status: 500 }
      );
    }

    // 6. Filter scripts where any keyword in objection_keywords matches the query
    const matchedScripts = (scripts ?? [])
      .filter((script) => {
        const keywords: string[] = script.objection_keywords ?? [];
        return keywords.some((keyword: string) => {
          const lowerKeyword = keyword.toLowerCase();
          // Check if any word from the query appears in the keyword
          // or if the keyword appears in the query
          return (
            words.some((word) => lowerKeyword.includes(word)) ||
            query.toLowerCase().includes(lowerKeyword)
          );
        });
      })
      .slice(0, 10)
      .map((script) => ({
        ...script,
        is_locked: !hasAccess(userPlan, script.min_plan as Plan),
      }));

    return NextResponse.json({
      scripts: matchedScripts,
      total: matchedScripts.length,
      query,
    });
  } catch (error) {
    console.error('[scripts/objection-search] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
