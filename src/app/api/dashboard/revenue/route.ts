import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

export async function GET() {
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

    const userId = user.id;

    // 2. Check plan >= pro
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    const userPlan = (profile?.plan as Plan) ?? 'starter';

    if (!hasAccess(userPlan, 'pro')) {
      return NextResponse.json(
        {
          error: 'Pro plan or higher required for revenue dashboard',
          required_plan: 'pro',
          current_plan: userPlan,
        },
        { status: 403 }
      );
    }

    // 3. Get all sales data for this user
    const { data: salesData } = await supabase
      .from('script_usage')
      .select(`
        sale_value,
        used_at,
        script_id,
        scripts!inner(
          id,
          title,
          category_id,
          category:script_categories(id, name, slug)
        )
      `)
      .eq('user_id', userId)
      .eq('resulted_in_sale', true)
      .not('sale_value', 'is', null);

    const sales = salesData ?? [];

    // 4. Calculate total revenue
    const totalRevenue = sales.reduce(
      (sum, row) => sum + (row.sale_value ?? 0),
      0
    );

    // 5. Revenue by trail (category)
    const revenueByTrail: Record<string, { name: string; slug: string; total: number; count: number }> = {};
    sales.forEach((row) => {
      const script = row.scripts as unknown as Record<string, unknown>;
      const category = (script?.category as unknown as Record<string, unknown>[])
        ?.[0] ?? null;
      if (category) {
        const slug = category.slug as string;
        if (!revenueByTrail[slug]) {
          revenueByTrail[slug] = {
            name: category.name as string,
            slug,
            total: 0,
            count: 0,
          };
        }
        revenueByTrail[slug].total += row.sale_value ?? 0;
        revenueByTrail[slug].count += 1;
      }
    });

    // 6. Revenue by script
    const revenueByScript: Record<string, { title: string; total: number; count: number }> = {};
    sales.forEach((row) => {
      const script = row.scripts as unknown as Record<string, unknown>;
      const scriptId = script?.id as string;
      if (scriptId) {
        if (!revenueByScript[scriptId]) {
          revenueByScript[scriptId] = {
            title: script.title as string,
            total: 0,
            count: 0,
          };
        }
        revenueByScript[scriptId].total += row.sale_value ?? 0;
        revenueByScript[scriptId].count += 1;
      }
    });

    // 7. Weekly revenue (last 4 weeks)
    const weeklyRevenue: Array<{ week_start: string; total: number; sales_count: number }> = [];
    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weekSales = sales.filter((row) => {
        const usedAt = new Date(row.used_at);
        return usedAt >= weekStart && usedAt <= weekEnd;
      });

      const weekTotal = weekSales.reduce(
        (sum, row) => sum + (row.sale_value ?? 0),
        0
      );

      weeklyRevenue.push({
        week_start: weekStart.toISOString().split('T')[0],
        total: weekTotal,
        sales_count: weekSales.length,
      });
    }

    return NextResponse.json({
      total_revenue: totalRevenue,
      total_sales: sales.length,
      revenue_by_trail: Object.values(revenueByTrail).sort((a, b) => b.total - a.total),
      revenue_by_script: Object.values(revenueByScript).sort((a, b) => b.total - a.total),
      weekly_revenue: weeklyRevenue,
    });
  } catch (error) {
    console.error('[dashboard/revenue] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
