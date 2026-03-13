import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get category by slug
    const { data: category } = await supabase
      .from('script_categories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get all scripts in this category
    const { data: scripts } = await supabase
      .from('scripts')
      .select('id')
      .eq('category_id', category.id);

    const scriptIds = (scripts ?? []).map((s) => s.id);

    if (scriptIds.length === 0) {
      return NextResponse.json({
        trafficInvestment: 0,
        costPerLead: 0,
        leadsCount: 0,
      });
    }

    // Fetch investments and script usages in parallel
    const [investmentsRes, usageRes] = await Promise.all([
      supabase
        .from('traffic_investments')
        .select('investment_value')
        .eq('user_id', user.id)
        .in('script_id', scriptIds),
      supabase
        .from('script_usage')
        .select('script_id')
        .eq('user_id', user.id)
        .in('script_id', scriptIds),
    ]);

    const investmentTotal = (investmentsRes.data ?? []).reduce(
      (sum, inv) => sum + (inv.investment_value ?? 0),
      0
    );

    const leadsCount = new Set(
      (usageRes.data ?? []).map((u) => u.script_id)
    ).size;

    return NextResponse.json({
      trafficInvestment: investmentTotal,
      costPerLead: leadsCount > 0 ? investmentTotal / leadsCount : 0,
      leadsCount,
    });
  } catch (error) {
    console.error('[categories/slug/stats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
