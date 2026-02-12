import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FALLBACK_TIP = {
  content: 'Mensagens personalizadas convertem 3x mais que mensagens genéricas. Use o nome do lead!',
  category: 'vendas',
};

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Get all active tips
    const { data: tips, error } = await supabase
      .from('microlearning_tips')
      .select('id, content, category, display_count')
      .eq('is_active', true);

    if (error || !tips || tips.length === 0) {
      // Return fallback tip instead of failing
      return NextResponse.json(FALLBACK_TIP);
    }

    // 2. Pick a random tip
    const randomIndex = Math.floor(Math.random() * tips.length);
    const tip = tips[randomIndex];

    // 3. Increment display_count (fire and forget)
    supabase
      .from('microlearning_tips')
      .update({ display_count: (tip.display_count ?? 0) + 1 })
      .eq('id', tip.id)
      .then(() => {});

    // Return tip object directly (dashboard expects { content, category })
    const response = NextResponse.json(tip);
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return response;
  } catch {
    return NextResponse.json(FALLBACK_TIP);
  }
}
