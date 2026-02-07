import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Plan check - requires Copilot
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (!profile || !hasAccess(profile.plan as Plan, 'copilot')) {
      return NextResponse.json(
        { error: 'This feature requires the Copilot plan' },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const format = searchParams.get('format') ?? 'csv';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Only CSV format is currently supported' },
        { status: 400 }
      );
    }

    // Build query for script_usage within the date range for this user
    let usageQuery = supabase
      .from('script_usage')
      .select('used_at, resulted_in_sale, sale_value')
      .eq('user_id', user.id)
      .order('used_at', { ascending: true });

    if (from) {
      usageQuery = usageQuery.gte('used_at', `${from}T00:00:00.000Z`);
    }
    if (to) {
      usageQuery = usageQuery.lte('used_at', `${to}T23:59:59.999Z`);
    }

    const { data: usageData, error: usageError } = await usageQuery;

    if (usageError) {
      console.error('[export/analytics] Error fetching usage data:', usageError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      );
    }

    // Aggregate by date
    const dailyMap: Record<
      string,
      { scripts_used: number; sales: number; revenue: number }
    > = {};

    for (const row of usageData ?? []) {
      const date = row.used_at.split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { scripts_used: 0, sales: 0, revenue: 0 };
      }
      dailyMap[date].scripts_used++;
      if (row.resulted_in_sale) {
        dailyMap[date].sales++;
        dailyMap[date].revenue += row.sale_value ?? 0;
      }
    }

    // Build CSV
    const csvHeaders = 'date,scripts_used,sales,revenue,conversion_rate';
    const csvRows = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const conversionRate =
          data.scripts_used > 0
            ? ((data.sales / data.scripts_used) * 100).toFixed(2)
            : '0.00';
        return `${date},${data.scripts_used},${data.sales},${data.revenue.toFixed(2)},${conversionRate}`;
      });

    const csv = [csvHeaders, ...csvRows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics_${from ?? 'start'}_${to ?? 'end'}.csv"`,
      },
    });
  } catch (err) {
    console.error('[export/analytics] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
