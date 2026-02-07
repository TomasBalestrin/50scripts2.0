import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { objectionSearchSchema } from '@/lib/validations/schemas';
import { hasAccess } from '@/lib/plans/gate';
import { isFeatureEnabled } from '@/lib/features/flags';
import type { Plan } from '@/types/database';

/**
 * POST /api/scripts/objection-search
 *
 * Search for scripts that handle specific objections.
 *
 * Supports two modes:
 * 1. Semantic search (if 'semantic_search' feature flag is enabled and pg_vector is available)
 *    - Generates an embedding from the query text
 *    - Performs cosine similarity search against script objection_embeddings
 *    - Falls back to keyword search if embedding generation fails
 *
 * 2. Keyword search (default fallback)
 *    - Matches query words against script objection_keywords
 *    - Current production behavior
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth required
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = objectionSearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query } = parsed.data;

    // 3. Get user plan
    let userPlan: Plan = 'starter';
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile) {
      userPlan = profile.plan as Plan;
    }

    // 4. Check if semantic search is enabled for this user
    const semanticEnabled = await isFeatureEnabled(
      'semantic_search',
      user.id,
      supabase
    );

    // 5. Try semantic search first, fall back to keyword search
    if (semanticEnabled) {
      const semanticResult = await performSemanticSearch(
        query,
        userPlan,
        supabase
      );

      if (semanticResult !== null) {
        return NextResponse.json({
          scripts: semanticResult,
          total: semanticResult.length,
          query,
          search_mode: 'semantic',
        });
      }
      // If semantic search failed, fall through to keyword search
      console.warn(
        '[scripts/objection-search] Semantic search failed, falling back to keyword search'
      );
    }

    // 6. Keyword search (default/fallback)
    const keywordResult = await performKeywordSearch(query, userPlan, supabase);

    return NextResponse.json({
      scripts: keywordResult,
      total: keywordResult.length,
      query,
      search_mode: 'keyword',
    });
  } catch (error) {
    console.error('[scripts/objection-search] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Perform semantic search using pg_vector cosine similarity.
 * Returns null if semantic search is not available or fails.
 */
async function performSemanticSearch(
  query: string,
  userPlan: Plan,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<Array<Record<string, unknown>> | null> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);

    if (!queryEmbedding) {
      return null;
    }

    // Try to use pg_vector RPC function for similarity search.
    // This requires a Supabase function like:
    //   CREATE OR REPLACE FUNCTION match_scripts_by_objection(
    //     query_embedding vector(1536),
    //     match_threshold float DEFAULT 0.7,
    //     match_count int DEFAULT 10
    //   )
    // If the function doesn't exist, fall back to cached embeddings approach.
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'match_scripts_by_objection',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 10,
      }
    );

    if (!rpcError && rpcResult && rpcResult.length > 0) {
      // RPC function exists and returned results
      return rpcResult.map((script: Record<string, unknown>) => ({
        ...script,
        is_locked: !hasAccess(userPlan, (script.min_plan as Plan) ?? 'starter'),
        similarity_score: script.similarity,
      }));
    }

    // Fallback: If pg_vector RPC is not available, try cached embeddings
    return await performCachedEmbeddingSearch(
      query,
      queryEmbedding,
      userPlan,
      supabase
    );
  } catch (error) {
    console.error('[scripts/objection-search] Semantic search error:', error);
    return null;
  }
}

/**
 * Perform similarity search using cached embeddings in analytics_cache.
 * This is the fallback when pg_vector extension is not available.
 */
async function performCachedEmbeddingSearch(
  _query: string,
  queryEmbedding: number[],
  userPlan: Plan,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<Array<Record<string, unknown>> | null> {
  try {
    // 1. Fetch all cached embeddings
    const { data: cachedEmbeddings, error: cacheError } = await supabase
      .from('analytics_cache')
      .select('key, value')
      .like('key', 'embedding_%');

    if (cacheError || !cachedEmbeddings || cachedEmbeddings.length === 0) {
      return null;
    }

    // 2. Calculate cosine similarity for each
    const similarities: Array<{ script_id: string; similarity: number }> = [];

    for (const cached of cachedEmbeddings) {
      const scriptId = cached.key.replace('embedding_', '');
      const storedEmbedding = cached.value?.embedding as number[] | undefined;

      if (!storedEmbedding || storedEmbedding.length !== queryEmbedding.length) {
        continue;
      }

      const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
      if (similarity >= 0.3) {
        similarities.push({ script_id: scriptId, similarity });
      }
    }

    if (similarities.length === 0) {
      return null;
    }

    // 3. Sort by similarity descending and take top 10
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topMatches = similarities.slice(0, 10);

    // 4. Fetch the actual script data
    const scriptIds = topMatches.map((m) => m.script_id);
    const { data: scripts, error: scriptsError } = await supabase
      .from('scripts')
      .select(`
        *,
        category:script_categories(*)
      `)
      .eq('is_active', true)
      .in('id', scriptIds);

    if (scriptsError || !scripts) {
      return null;
    }

    // 5. Merge similarity scores and sort
    const similarityMap = new Map(
      topMatches.map((m) => [m.script_id, m.similarity])
    );

    return scripts
      .map((script) => ({
        ...script,
        is_locked: !hasAccess(userPlan, script.min_plan as Plan),
        similarity_score: similarityMap.get(script.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          (b.similarity_score as number) - (a.similarity_score as number)
      );
  } catch (error) {
    console.error(
      '[scripts/objection-search] Cached embedding search error:',
      error
    );
    return null;
  }
}

/**
 * Perform keyword-based search (original behavior).
 * Matches query words against script objection_keywords.
 */
async function performKeywordSearch(
  query: string,
  userPlan: Plan,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never
): Promise<Array<Record<string, unknown>>> {
  // Extract words from query for keyword matching
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 3);

  if (words.length === 0) {
    return [];
  }

  // Get all active scripts that have objection_keywords
  const { data: scripts, error } = await supabase
    .from('scripts')
    .select(`
      *,
      category:script_categories(*)
    `)
    .eq('is_active', true)
    .not('objection_keywords', 'eq', '{}')
    .order('global_effectiveness', { ascending: false });

  if (error) {
    console.error('[scripts/objection-search] Keyword search error:', error);
    return [];
  }

  // Filter scripts where any keyword matches the query
  const matchedScripts = (scripts ?? [])
    .map((script) => {
      const keywords: string[] = script.objection_keywords ?? [];
      let matchScore = 0;

      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();

        // Check if any word from the query appears in the keyword
        for (const word of words) {
          if (lowerKeyword.includes(word)) {
            matchScore++;
          }
        }

        // Check if the full keyword appears in the query
        if (query.toLowerCase().includes(lowerKeyword)) {
          matchScore += 2; // Full keyword match is worth more
        }
      }

      return { script, matchScore };
    })
    .filter(({ matchScore }) => matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10)
    .map(({ script, matchScore }) => ({
      ...script,
      is_locked: !hasAccess(userPlan, script.min_plan as Plan),
      match_score: matchScore,
    }));

  return matchedScripts;
}

/**
 * Generate a query embedding using OpenAI API or mock.
 * Returns null if embedding generation fails.
 */
async function generateQueryEmbedding(
  text: string
): Promise<number[] | null> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-3-small',
        }),
      });

      if (!response.ok) {
        console.error(
          '[scripts/objection-search] OpenAI embedding error:',
          response.status
        );
        return null;
      }

      const data = await response.json();
      return data.data?.[0]?.embedding ?? null;
    }

    // Mock embedding for development/testing
    return generateMockEmbedding(text);
  } catch (error) {
    console.error(
      '[scripts/objection-search] Error generating query embedding:',
      error
    );
    return null;
  }
}

/**
 * Generate a deterministic mock embedding from text.
 * Same algorithm as in the embeddings admin endpoint.
 */
function generateMockEmbedding(text: string): number[] {
  const DIMENSIONS = 1536;
  const embedding: number[] = new Array(DIMENSIONS);

  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
  }

  let state = Math.abs(seed) || 1;
  for (let i = 0; i < DIMENSIONS; i++) {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    embedding[i] = ((state >>> 0) / 0xffffffff) * 2 - 1;
  }

  let magnitude = 0;
  for (let i = 0; i < DIMENSIONS; i++) {
    magnitude += embedding[i] * embedding[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    for (let i = 0; i < DIMENSIONS; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }

  return embedding;
}

/**
 * Calculate cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
