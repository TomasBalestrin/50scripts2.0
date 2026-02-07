import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Experiment {
  /** Unique key matching the feature_flags.key column */
  key: string;
  /** Available variant names (default: ['control', 'treatment']) */
  variants: string[];
  /** Weight distribution per variant (must sum to 100). Default: equal split. */
  weights?: number[];
}

export interface ExperimentAssignment {
  experimentKey: string;
  variant: string;
  isInTreatment: boolean;
}

export interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithCounts {
  flag: FeatureFlag;
  controlCount: number;
  treatmentCount: number;
}

// ---------------------------------------------------------------------------
// Deterministic hash
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic number 0-99 from a userId + experimentKey pair.
 * This ensures the same user always receives the same variant for a given
 * experiment, providing consistency even across sessions and devices.
 *
 * Uses a simple DJB2-like hash that maps to a uniform distribution.
 */
export function hashAssignment(userId: string, experimentKey: string): number {
  let hash = 0;
  const str = userId + experimentKey;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

// ---------------------------------------------------------------------------
// Variant resolution
// ---------------------------------------------------------------------------

/**
 * Determine which variant a user falls into based on experiment weights.
 *
 * For a simple 50/50 experiment:
 *   weights = [50, 50], variants = ['control', 'treatment']
 *   hashValue 0-49 → control, 50-99 → treatment
 *
 * For a 70/30 experiment:
 *   weights = [70, 30], variants = ['control', 'treatment']
 *   hashValue 0-69 → control, 70-99 → treatment
 */
export function resolveVariant(
  hashValue: number,
  variants: string[],
  weights?: number[]
): string {
  if (!variants || variants.length === 0) {
    return 'control';
  }

  // Default to equal distribution
  const effectiveWeights = weights && weights.length === variants.length
    ? weights
    : variants.map(() => Math.floor(100 / variants.length));

  let cumulative = 0;
  for (let i = 0; i < variants.length; i++) {
    cumulative += effectiveWeights[i];
    if (hashValue < cumulative) {
      return variants[i];
    }
  }

  // Fallback to last variant (handles rounding)
  return variants[variants.length - 1];
}

// ---------------------------------------------------------------------------
// Core: get variant for a user
// ---------------------------------------------------------------------------

/**
 * Get the assigned variant for a user in a given experiment.
 *
 * 1. Check for an existing assignment in user_feature_assignments
 * 2. If none exists, deterministically assign based on hash
 * 3. Persist the assignment for future consistency and analytics
 *
 * @param userId        - The user's UUID
 * @param experimentKey - The feature_flags.key to resolve
 * @param supabaseOverride - Optional: pass an existing client (avoids creating a new one)
 * @returns The variant string (e.g., 'control' or 'treatment')
 */
export async function getVariant(
  userId: string,
  experimentKey: string,
  supabaseOverride?: SupabaseClient
): Promise<string> {
  const supabase = supabaseOverride || await createClient();

  try {
    // 1. Fetch the feature flag
    const { data: flag, error: flagError } = await supabase
      .from('feature_flags')
      .select('id, key, enabled, rollout_percentage')
      .eq('key', experimentKey)
      .single();

    if (flagError || !flag) {
      // Experiment does not exist — default to control
      return 'control';
    }

    // 2. If the flag is disabled, everyone is in control
    if (!flag.enabled) {
      return 'control';
    }

    // 3. If 100% rollout, everyone is in treatment
    if (flag.rollout_percentage === 100) {
      return 'treatment';
    }

    // 4. If 0% rollout, everyone is in control
    if (flag.rollout_percentage === 0) {
      return 'control';
    }

    // 5. Check for existing assignment
    const { data: existing, error: existingError } = await supabase
      .from('user_feature_assignments')
      .select('variant')
      .eq('user_id', userId)
      .eq('feature_flag_id', flag.id)
      .single();

    if (!existingError && existing) {
      return existing.variant;
    }

    // 6. Deterministic assignment
    const hash = hashAssignment(userId, experimentKey);
    const variant = hash < flag.rollout_percentage ? 'treatment' : 'control';

    // 7. Persist assignment (ignore conflicts from race conditions)
    const { error: insertError } = await supabase
      .from('user_feature_assignments')
      .insert({
        user_id: userId,
        feature_flag_id: flag.id,
        variant,
      });

    if (insertError) {
      // Race condition: another request may have inserted first — re-read
      const { data: raceResult } = await supabase
        .from('user_feature_assignments')
        .select('variant')
        .eq('user_id', userId)
        .eq('feature_flag_id', flag.id)
        .single();

      if (raceResult) {
        return raceResult.variant;
      }
    }

    return variant;
  } catch (error) {
    console.error(`[ab-testing] Error getting variant for "${experimentKey}":`, error);
    return 'control';
  }
}

// ---------------------------------------------------------------------------
// Bulk: get all variants for a user
// ---------------------------------------------------------------------------

/**
 * Get all experiment variants for a user in a single call.
 * Returns a record of experimentKey → variant.
 *
 * This is more efficient than calling getVariant() per experiment
 * because it batches the DB queries.
 */
export async function getAllVariants(
  userId: string,
  supabaseOverride?: SupabaseClient
): Promise<Record<string, string>> {
  const supabase = supabaseOverride || await createClient();

  try {
    // 1. Fetch all feature flags
    const { data: flags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('id, key, enabled, rollout_percentage');

    if (flagsError || !flags) {
      return {};
    }

    // 2. Fetch all existing assignments for this user
    const flagIds = flags.map((f) => f.id);
    const { data: assignments } = await supabase
      .from('user_feature_assignments')
      .select('feature_flag_id, variant')
      .eq('user_id', userId)
      .in('feature_flag_id', flagIds);

    const assignmentMap = new Map<string, string>();
    if (assignments) {
      for (const a of assignments) {
        assignmentMap.set(a.feature_flag_id, a.variant);
      }
    }

    // 3. Resolve each flag
    const result: Record<string, string> = {};
    const newAssignments: Array<{
      user_id: string;
      feature_flag_id: string;
      variant: string;
    }> = [];

    for (const flag of flags) {
      if (!flag.enabled) {
        result[flag.key] = 'control';
        continue;
      }

      if (flag.rollout_percentage === 100) {
        result[flag.key] = 'treatment';
        continue;
      }

      if (flag.rollout_percentage === 0) {
        result[flag.key] = 'control';
        continue;
      }

      // Check existing assignment
      const existingVariant = assignmentMap.get(flag.id);
      if (existingVariant) {
        result[flag.key] = existingVariant;
        continue;
      }

      // Create new deterministic assignment
      const hash = hashAssignment(userId, flag.key);
      const variant = hash < flag.rollout_percentage ? 'treatment' : 'control';
      result[flag.key] = variant;

      newAssignments.push({
        user_id: userId,
        feature_flag_id: flag.id,
        variant,
      });
    }

    // 4. Batch-insert new assignments
    if (newAssignments.length > 0) {
      await supabase
        .from('user_feature_assignments')
        .insert(newAssignments);
      // Ignore insert errors (race conditions handled by unique constraint)
    }

    return result;
  } catch (error) {
    console.error('[ab-testing] Error getting all variants:', error);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

/**
 * Get all feature flags with their assignment counts.
 * Used by the admin experiments page.
 */
export async function getExperimentsWithCounts(
  supabaseOverride?: SupabaseClient
): Promise<AssignmentWithCounts[]> {
  const supabase = supabaseOverride || await createClient();

  try {
    // 1. Get all flags
    const { data: flags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (flagsError || !flags) {
      return [];
    }

    // 2. Get assignment counts per flag
    const results: AssignmentWithCounts[] = [];

    for (const flag of flags) {
      // Count control assignments
      const { count: controlCount } = await supabase
        .from('user_feature_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('feature_flag_id', flag.id)
        .eq('variant', 'control');

      // Count treatment assignments
      const { count: treatmentCount } = await supabase
        .from('user_feature_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('feature_flag_id', flag.id)
        .eq('variant', 'treatment');

      results.push({
        flag,
        controlCount: controlCount ?? 0,
        treatmentCount: treatmentCount ?? 0,
      });
    }

    return results;
  } catch (error) {
    console.error('[ab-testing] Error getting experiments with counts:', error);
    return [];
  }
}

/**
 * Update a feature flag's rollout percentage.
 */
export async function updateRolloutPercentage(
  flagId: string,
  percentage: number,
  supabaseOverride?: SupabaseClient
): Promise<boolean> {
  const supabase = supabaseOverride || await createClient();

  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  const { error } = await supabase
    .from('feature_flags')
    .update({
      rollout_percentage: clamped,
      updated_at: new Date().toISOString(),
    })
    .eq('id', flagId);

  if (error) {
    console.error('[ab-testing] Error updating rollout percentage:', error);
    return false;
  }

  return true;
}

/**
 * Toggle a feature flag on/off.
 */
export async function toggleFeatureFlag(
  flagId: string,
  enabled: boolean,
  supabaseOverride?: SupabaseClient
): Promise<boolean> {
  const supabase = supabaseOverride || await createClient();

  const { error } = await supabase
    .from('feature_flags')
    .update({
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', flagId);

  if (error) {
    console.error('[ab-testing] Error toggling feature flag:', error);
    return false;
  }

  return true;
}

/**
 * Reset all assignments for an experiment (useful when changing rollout %).
 * This forces all users to be re-assigned on their next visit.
 */
export async function resetAssignments(
  flagId: string,
  supabaseOverride?: SupabaseClient
): Promise<boolean> {
  const supabase = supabaseOverride || await createClient();

  const { error } = await supabase
    .from('user_feature_assignments')
    .delete()
    .eq('feature_flag_id', flagId);

  if (error) {
    console.error('[ab-testing] Error resetting assignments:', error);
    return false;
  }

  return true;
}
