import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TIME_BLOCKS = [
  { block: 'morning', label: 'Manhã (8h-11h)', action: 'approach', category: 'abordagem-inicial' },
  { block: 'midday', label: 'Meio-dia (11h-14h)', action: 'followup', category: 'qualificacao' },
  { block: 'afternoon', label: 'Tarde (14h-17h)', action: 'proposal', category: 'follow-up' },
  { block: 'evening', label: 'Noite (17h-20h)', action: 'close', category: 'fechamento' },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];

  // Check existing agenda
  let { data: agenda } = await supabase
    .from('sales_agenda')
    .select('*, suggested_script:scripts(id, title, content, context_description)')
    .eq('user_id', user.id)
    .eq('agenda_date', today)
    .order('created_at');

  // Generate agenda if none exists
  if (!agenda || agenda.length === 0) {
    const items = [];

    for (const block of TIME_BLOCKS) {
      // Get top script from suggested category
      const { data: category } = await supabase
        .from('script_categories')
        .select('id')
        .eq('slug', block.category)
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

      items.push({
        user_id: user.id,
        agenda_date: today,
        time_block: block.block,
        action_type: block.action,
        suggested_script_id: scriptId,
      });
    }

    await supabase.from('sales_agenda').insert(items);

    // Re-fetch with joins
    const { data: newAgenda } = await supabase
      .from('sales_agenda')
      .select('*, suggested_script:scripts(id, title, content, context_description)')
      .eq('user_id', user.id)
      .eq('agenda_date', today)
      .order('created_at');

    agenda = newAgenda;
  }

  return NextResponse.json({
    date: today,
    blocks: TIME_BLOCKS.map((block) => ({
      ...block,
      item: agenda?.find((a) => a.time_block === block.block) || null,
    })),
  });
}
