import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Portuguese stop words to filter out from search queries
const STOP_WORDS = new Set([
  'a', 'o', 'e', 'é', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na',
  'nos', 'nas', 'que', 'um', 'uma', 'para', 'com', 'por', 'se', 'ao',
  'os', 'as', 'eu', 'ele', 'ela', 'nós', 'me', 'te', 'lhe', 'isso',
  'este', 'esta', 'esse', 'essa', 'está', 'foi', 'ser', 'ter', 'como',
  'mais', 'mas', 'seu', 'sua', 'não', 'sim', 'já', 'só', 'bem', 'muito',
  'disse', 'diz', 'quando', 'onde', 'qual',
]);

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-záàãâéêíóôõúç]/g, ''))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract meaningful keywords from the query
    const keywords = extractKeywords(query);

    // Fallback: if all words were stop words, use the full trimmed query
    if (keywords.length === 0) {
      keywords.push(query.trim().toLowerCase());
    }

    // Build OR conditions: for each keyword, search title and content
    const conditions = keywords
      .flatMap((kw) => [
        `title.ilike.%${kw}%`,
        `content.ilike.%${kw}%`,
      ])
      .join(',');

    const { data: scripts, error } = await supabase
      .from('scripts')
      .select(`
        *,
        category:script_categories(*)
      `)
      .eq('is_active', true)
      .or(conditions)
      .order('global_effectiveness', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[scripts/search] Error searching scripts:', error);
      return NextResponse.json(
        { error: 'Failed to search scripts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      scripts: scripts ?? [],
      total: (scripts ?? []).length,
      query: query.trim(),
    });
  } catch (error) {
    console.error('[scripts/search] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
