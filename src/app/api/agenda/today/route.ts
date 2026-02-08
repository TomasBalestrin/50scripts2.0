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
    // Load ALL categories and top scripts in 2 parallel queries (replaces 8 sequential queries)
    const categorySlugs = TIME_BLOCKS.map(b => b.category);

    const [categoriesRes, scriptsRes] = await Promise.all([
      supabase
        .from('script_categories')
        .select('id, slug')
        .in('slug', categorySlugs),
      supabase
        .from('scripts')
        .select('id, category_id, global_effectiveness')
        .eq('is_active', true)
        .order('global_effectiveness', { ascending: false }),
    ]);

    const categories = categoriesRes.data ?? [];
    const scripts = scriptsRes.data ?? [];

    // Build lookup maps in memory
    const categoryBySlug = new Map(categories.map(c => [c.slug, c.id]));
    const topScriptByCategory = new Map<string, string>();
    for (const s of scripts) {
      if (!topScriptByCategory.has(s.category_id)) {
        topScriptByCategory.set(s.category_id, s.id);
      }
    }

    const items = TIME_BLOCKS.map(block => {
      const catId = categoryBySlug.get(block.category);
      const scriptId = catId ? topScriptByCategory.get(catId) ?? null : null;
      return {
        user_id: user.id,
        agenda_date: today,
        time_block: block.block,
        action_type: block.action,
        suggested_script_id: scriptId,
      };
    });

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

  const response = NextResponse.json({
    date: today,
    blocks: TIME_BLOCKS.map((block) => ({
      ...block,
      item: agenda?.find((a) => a.time_block === block.block) || null,
    })),
  });

  response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
  return response;
}
