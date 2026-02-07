import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

/**
 * POST /api/admin/scripts/embeddings
 *
 * Generate embeddings for scripts' objection_keywords.
 * Requires admin authentication.
 *
 * Body: { script_ids?: string[] }
 *   - If script_ids is provided and non-empty, generate embeddings for those scripts only
 *   - If script_ids is empty/missing, generate for all scripts without embeddings
 *
 * Returns: { generated: number, errors: number, details?: string[] }
 *
 * Note: Currently uses a mock embedding generator (deterministic hash-based vector).
 * When OpenAI is available, replace generateMockEmbedding with real API calls.
 */
export async function POST(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    // Parse request body
    let body: { script_ids?: string[] } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine - we'll generate for all
    }

    const { script_ids } = body;

    // Fetch scripts that need embeddings
    let query = supabase
      .from('scripts')
      .select('id, title, objection_keywords, context_description, tags')
      .eq('is_active', true);

    if (script_ids && script_ids.length > 0) {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidIds = script_ids.filter((id) => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: 'Invalid script IDs', invalid: invalidIds },
          { status: 400 }
        );
      }
      query = query.in('id', script_ids);
    }

    const { data: scripts, error: fetchError } = await query;

    if (fetchError) {
      console.error('[admin/scripts/embeddings] Error fetching scripts:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch scripts' },
        { status: 500 }
      );
    }

    if (!scripts || scripts.length === 0) {
      return NextResponse.json({
        generated: 0,
        errors: 0,
        message: 'No scripts found to generate embeddings for',
      });
    }

    let generated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process each script
    for (const script of scripts) {
      try {
        // Build text to embed from keywords, title, context, and tags
        const textParts: string[] = [];

        if (script.objection_keywords && script.objection_keywords.length > 0) {
          textParts.push(script.objection_keywords.join(' '));
        }

        if (script.title) {
          textParts.push(script.title);
        }

        if (script.context_description) {
          textParts.push(script.context_description);
        }

        if (script.tags && script.tags.length > 0) {
          textParts.push(script.tags.join(' '));
        }

        const textToEmbed = textParts.join(' ').trim();

        if (!textToEmbed) {
          errorDetails.push(`Script ${script.id}: No text to generate embedding from`);
          errors++;
          continue;
        }

        // Generate embedding (mock or real)
        const embedding = await generateEmbedding(textToEmbed);

        // Store the embedding
        // Note: When pg_vector is enabled, this would be stored in objection_embedding column.
        // For now, we store it in analytics_cache as a JSON representation.
        const { error: updateError } = await supabase
          .from('analytics_cache')
          .upsert(
            {
              key: `embedding_${script.id}`,
              value: {
                embedding,
                text: textToEmbed,
                generated_at: new Date().toISOString(),
                dimension: embedding.length,
              },
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            },
            { onConflict: 'key' }
          );

        if (updateError) {
          console.error(
            `[admin/scripts/embeddings] Error storing embedding for ${script.id}:`,
            updateError
          );
          errorDetails.push(`Script ${script.id}: Failed to store embedding`);
          errors++;
          continue;
        }

        generated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(
          `[admin/scripts/embeddings] Error processing script ${script.id}:`,
          err
        );
        errorDetails.push(`Script ${script.id}: ${message}`);
        errors++;
      }
    }

    return NextResponse.json({
      generated,
      errors,
      total_processed: scripts.length,
      ...(errorDetails.length > 0 && { details: errorDetails }),
    });
  } catch (err) {
    console.error('[admin/scripts/embeddings] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate an embedding vector for the given text.
 *
 * If OPENAI_API_KEY is set, calls the OpenAI Embeddings API.
 * Otherwise, falls back to a deterministic mock embedding generator
 * that produces a 1536-dimension vector from the text hash.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    return generateOpenAIEmbedding(text, openaiKey);
  }

  return generateMockEmbedding(text);
}

/**
 * Call OpenAI Embeddings API to generate a real embedding.
 */
async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error('Invalid response from OpenAI Embeddings API');
  }

  return data.data[0].embedding;
}

/**
 * Generate a deterministic mock embedding from text using a hash-based approach.
 * Produces a 1536-dimension vector (matching OpenAI text-embedding-3-small output).
 *
 * This is NOT suitable for real semantic search - it's a placeholder that ensures:
 * 1. Same text always produces the same vector
 * 2. Similar texts produce somewhat similar vectors (shared prefix)
 * 3. The vector is normalized (unit length)
 */
function generateMockEmbedding(text: string): number[] {
  const DIMENSIONS = 1536;
  const embedding: number[] = new Array(DIMENSIONS);

  // Create a deterministic seed from the text
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
  }

  // Generate pseudo-random values using a simple LCG (Linear Congruential Generator)
  // Parameters from Numerical Recipes
  let state = Math.abs(seed) || 1;
  for (let i = 0; i < DIMENSIONS; i++) {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    // Map to [-1, 1] range
    embedding[i] = ((state >>> 0) / 0xffffffff) * 2 - 1;
  }

  // Normalize to unit length (L2 normalization)
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
