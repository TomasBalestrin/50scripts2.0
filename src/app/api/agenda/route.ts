import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';

const TIME_BLOCKS = [
  { key: 'morning', label: 'Manhã (8h-12h)', action: 'approach' },
  { key: 'midday', label: 'Meio-dia (12h-14h)', action: 'followup' },
  { key: 'afternoon', label: 'Tarde (14h-18h)', action: 'proposal' },
  { key: 'evening', label: 'Noite (18h-21h)', action: 'close' },
];

const ACTION_LABELS: Record<string, string> = {
  approach: 'Abordagem',
  followup: 'Follow-up',
  proposal: 'Proposta',
  close: 'Fechamento',
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (!profile || !hasAccess(profile.plan, 'pro')) {
      return NextResponse.json({ error: 'Plano insuficiente' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check for existing agenda
    const { data: existingAgenda } = await supabase
      .from('sales_agenda')
      .select('*, lead:leads(name), script:scripts(title)')
      .eq('user_id', user.id)
      .eq('agenda_date', today)
      .order('time_block');

    if (existingAgenda && existingAgenda.length > 0) {
      return NextResponse.json({ agenda: existingAgenda, date: today });
    }

    // Generate agenda for today
    // For Premium+: use real leads
    const isPremium = hasAccess(profile.plan, 'premium');
    let leads: { id: string; name: string; stage: string }[] = [];

    if (isPremium) {
      const { data: userLeads } = await supabase
        .from('leads')
        .select('id, name, stage')
        .eq('user_id', user.id)
        .in('stage', ['novo', 'abordado', 'qualificado', 'proposta'])
        .order('next_followup_at', { ascending: true })
        .limit(4);
      leads = userLeads || [];
    }

    // Get suggested scripts by category
    const agendaItems = [];
    for (let i = 0; i < TIME_BLOCKS.length; i++) {
      const block = TIME_BLOCKS[i];

      // Find a relevant script for this action
      const slugMap: Record<string, string> = {
        approach: 'abordagem-inicial',
        followup: 'follow-up',
        proposal: 'apresentacao-oferta',
        close: 'fechamento',
      };

      const { data: category } = await supabase
        .from('script_categories')
        .select('id')
        .eq('slug', slugMap[block.action])
        .single();

      let scriptId = null;
      if (category) {
        const { data: scripts } = await supabase
          .from('scripts')
          .select('id')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('global_effectiveness', { ascending: false })
          .limit(1);
        scriptId = scripts?.[0]?.id || null;
      }

      agendaItems.push({
        user_id: user.id,
        agenda_date: today,
        time_block: block.key,
        action_type: block.action,
        lead_id: leads[i]?.id || null,
        suggested_script_id: scriptId,
        completed: false,
      });
    }

    const { data: created } = await supabase
      .from('sales_agenda')
      .insert(agendaItems)
      .select('*, lead:leads(name), script:scripts(title)');

    return NextResponse.json({
      agenda: created || agendaItems,
      date: today,
      action_labels: ACTION_LABELS,
    });
  } catch (err) {
    console.error('[agenda] Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
