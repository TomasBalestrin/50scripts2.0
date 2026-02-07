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

  // Get all active leads (not closed or lost)
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .not('stage', 'in', '("fechado","perdido")')
    .order('next_followup_at', { ascending: true, nullsFirst: false });

  if (!leads || leads.length === 0) {
    return NextResponse.json({ leads: [], message: 'Nenhum lead ativo no pipeline' });
  }

  // Get user's conversion patterns (last 60 days)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: usageData } = await supabase
    .from('script_usage')
    .select('used_at, resulted_in_sale, sale_value, lead_id')
    .eq('user_id', user.id)
    .gte('used_at', sixtyDaysAgo.toISOString());

  // Calculate per-stage conversion rates
  const stageConversion: Record<string, { total: number; sales: number }> = {};
  const hourConversion: Record<number, { total: number; sales: number }> = {};

  usageData?.forEach((u) => {
    const hour = new Date(u.used_at).getHours();
    if (!hourConversion[hour]) hourConversion[hour] = { total: 0, sales: 0 };
    hourConversion[hour].total++;
    if (u.resulted_in_sale) hourConversion[hour].sales++;
  });

  // Find best hours for selling
  const bestHours = Object.entries(hourConversion)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      rate: data.total > 0 ? data.sales / data.total : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  // Score each lead for prioritization
  const scoredLeads = leads.map((lead) => {
    let score = 0;
    let reasons: string[] = [];

    // Overdue follow-up: highest priority
    if (lead.next_followup_at && new Date(lead.next_followup_at) < new Date()) {
      score += 50;
      reasons.push('Follow-up atrasado');
    }

    // Follow-up today
    const today = new Date().toISOString().split('T')[0];
    if (lead.next_followup_at && lead.next_followup_at.startsWith(today)) {
      score += 40;
      reasons.push('Follow-up agendado para hoje');
    }

    // High value leads
    if (lead.expected_value && lead.expected_value > 500) {
      score += 20;
      reasons.push('Alto valor');
    } else if (lead.expected_value && lead.expected_value > 100) {
      score += 10;
      reasons.push('Valor moderado');
    }

    // Stage-based priority (closer to closing = higher priority)
    const stagePriority: Record<string, number> = {
      proposta: 30,
      qualificado: 20,
      abordado: 10,
      novo: 5,
    };
    score += stagePriority[lead.stage] || 0;
    if (lead.stage === 'proposta') reasons.push('Próximo do fechamento');

    // Inactive leads (no contact in 3+ days)
    if (lead.last_contact_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince > 7) {
        score += 15;
        reasons.push(`Sem contato há ${daysSince} dias`);
      } else if (daysSince > 3) {
        score += 8;
        reasons.push(`${daysSince} dias sem contato`);
      }
    } else {
      score += 12;
      reasons.push('Nunca contatado');
    }

    // Closing probability estimate
    const closingProbability = Math.min(Math.round(score * 1.2), 95);

    return {
      ...lead,
      priority_score: score,
      closing_probability: closingProbability,
      reasons,
    };
  });

  // Sort by priority score
  scoredLeads.sort((a, b) => b.priority_score - a.priority_score);

  // Get suggested scripts for top leads
  const topLeads = scoredLeads.slice(0, 10);
  const stageToCategory: Record<string, string> = {
    novo: 'abordagem-inicial',
    abordado: 'qualificacao',
    qualificado: 'apresentacao-oferta',
    proposta: 'fechamento',
  };

  const enrichedLeads = await Promise.all(
    topLeads.map(async (lead) => {
      const categorySlug = stageToCategory[lead.stage] || 'follow-up';
      const { data: category } = await supabase
        .from('script_categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();

      let suggestedScript = null;
      if (category) {
        const { data: scripts } = await supabase
          .from('scripts')
          .select('id, title, content')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('global_effectiveness', { ascending: false })
          .limit(1);

        suggestedScript = scripts?.[0] || null;
      }

      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        stage: lead.stage,
        expected_value: lead.expected_value,
        next_followup_at: lead.next_followup_at,
        last_contact_at: lead.last_contact_at,
        priority_score: lead.priority_score,
        closing_probability: lead.closing_probability,
        reasons: lead.reasons,
        suggested_script: suggestedScript,
      };
    })
  );

  return NextResponse.json({
    leads: enrichedLeads,
    best_hours: bestHours.slice(0, 3).map((h) => ({
      hour: h.hour,
      label: `${h.hour}h`,
      conversion_rate: (h.rate * 100).toFixed(0),
    })),
    total_pipeline_value: leads.reduce((acc, l) => acc + (l.expected_value || 0), 0),
  });
}
