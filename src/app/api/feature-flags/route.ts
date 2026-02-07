import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllFeatureFlags } from '@/lib/features/flags';
import { getAllVariants } from '@/lib/ab-testing';

/**
 * GET /api/feature-flags
 *
 * Returns all feature flags resolved for the current authenticated user.
 *
 * Response: {
 *   flags: Record<string, boolean>,       // key → enabled (true = treatment)
 *   variants: Record<string, string>      // key → variant name ('control' | 'treatment')
 * }
 *
 * For flags with rollout_percentage < 100:
 *   - Checks user_feature_assignments for existing assignment
 *   - If no assignment exists: creates one based on rollout_percentage
 *   - Returns whether user is in 'treatment' variant
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Require authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get all resolved flags for this user (boolean values)
    const flags = await getAllFeatureFlags(user.id, supabase);

    // 3. Get all variant assignments (variant names for A/B tests)
    const variants = await getAllVariants(user.id, supabase);

    return NextResponse.json({ flags, variants });
  } catch (error) {
    console.error('[feature-flags] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
