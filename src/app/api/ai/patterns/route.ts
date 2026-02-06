import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  if (!profile || !hasAccess(profile.plan, 'copilot')) {
    return NextResponse.json({ error: 'Plano Copilot necessário' }, { status: 403 });
  }

  // Aggregate user's usage data for pattern analysis
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Top converting scripts
  const { data: topConverting } = await supabase
    .from('script_usage')
    .select(`
      script_id,
      scripts(title, category_id, script_categories(name)),
      resulted_in_sale,
      sale_value,
      effectiveness_rating
    `)
    .eq('user_id', user.id)
    .gte('used_at', thirtyDaysAgo.toISOString())
    .eq('resulted_in_sale', true)
    .order('sale_value', { ascending: false })
    .limit(10);

  // Usage by hour of day
  const { data: allUsage } = await supabase
    .from('script_usage')
    .select('used_at, resulted_in_sale, sale_value')
    .eq('user_id', user.id)
    .gte('used_at', thirtyDaysAgo.toISOString());

  // Calculate patterns
  const hourlyMap: Record<number, { total: number; sales: number }> = {};
  allUsage?.forEach((u) => {
    const hour = new Date(u.used_at).getHours();
    if (!hourlyMap[hour]) hourlyMap[hour] = { total: 0, sales: 0 };
    hourlyMap[hour].total++;
    if (u.resulted_in_sale) hourlyMap[hour].sales++;
  });

  const bestHours = Object.entries(hourlyMap)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      total: data.total,
      sales: data.sales,
      conversionRate: data.total > 0 ? (data.sales / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 3);

  // Total stats
  const totalUsed = allUsage?.length || 0;
  const totalSales = allUsage?.filter((u) => u.resulted_in_sale).length || 0;
  const totalRevenue = allUsage
    ?.filter((u) => u.resulted_in_sale && u.sale_value)
    .reduce((acc, u) => acc + (u.sale_value || 0), 0) || 0;

  // Most common objections (from rated scripts in objection category)
  const { data: objectionUsage } = await supabase
    .from('script_usage')
    .select('scripts(title, category_id, script_categories(slug))')
    .eq('user_id', user.id)
    .gte('used_at', thirtyDaysAgo.toISOString())
    .not('effectiveness_rating', 'is', null);

  return NextResponse.json({
    period: '30 dias',
    stats: {
      total_scripts_used: totalUsed,
      total_sales: totalSales,
      total_revenue: totalRevenue,
      conversion_rate: totalUsed > 0 ? ((totalSales / totalUsed) * 100).toFixed(1) : '0',
    },
    top_converting: topConverting?.slice(0, 5).map((t) => ({
      title: (t.scripts as unknown as { title: string } | null)?.title || 'Script',
      sale_value: t.sale_value,
      rating: t.effectiveness_rating,
    })) || [],
    best_hours: bestHours,
    insights: generateInsights(totalUsed, totalSales, totalRevenue, bestHours),
  });
}

function generateInsights(
  totalUsed: number,
  totalSales: number,
  totalRevenue: number,
  bestHours: Array<{ hour: number; conversionRate: number }>
): string[] {
  const insights: string[] = [];

  if (totalUsed > 0) {
    const rate = ((totalSales / totalUsed) * 100).toFixed(1);
    insights.push(`Sua taxa de conversão nos últimos 30 dias é de ${rate}%.`);
  }

  if (totalRevenue > 0) {
    const avgTicket = (totalRevenue / totalSales).toFixed(0);
    insights.push(`Seu ticket médio por venda é de R$ ${avgTicket}.`);
  }

  if (bestHours.length > 0) {
    const best = bestHours[0];
    insights.push(
      `Seu melhor horário para vender é às ${best.hour}h, com ${best.conversionRate.toFixed(0)}% de conversão.`
    );
  }

  if (totalUsed < 10) {
    insights.push('Use mais scripts para termos dados suficientes para insights mais profundos.');
  }

  if (totalSales > 0 && totalUsed > 20) {
    insights.push('Você está acima da média! Continue focando nos scripts que convertem.');
  }

  return insights;
}
