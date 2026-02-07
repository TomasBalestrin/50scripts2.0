import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a feature flag is enabled for a specific user.
 *
 * - If the flag does not exist or is not enabled: returns false
 * - If rollout_percentage is 100: returns true (fully rolled out)
 * - If rollout_percentage is 0: returns false
 * - Otherwise: checks user_feature_assignments for an existing assignment,
 *   or creates a new assignment based on the rollout percentage.
 */
export async function isFeatureEnabled(
  flagKey: string,
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    // 1. Fetch the feature flag
    const { data: flag, error: flagError } = await supabase
      .from('feature_flags')
      .select('id, enabled, rollout_percentage')
      .eq('key', flagKey)
      .single();

    if (flagError || !flag) {
      // Flag does not exist - treat as disabled
      return false;
    }

    // 2. If the flag is globally disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // 3. If 100% rollout, everyone gets it
    if (flag.rollout_percentage === 100) {
      return true;
    }

    // 4. If 0% rollout, nobody gets it
    if (flag.rollout_percentage === 0) {
      return false;
    }

    // 5. Check for existing user assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_feature_assignments')
      .select('variant')
      .eq('user_id', userId)
      .eq('feature_flag_id', flag.id)
      .single();

    if (!assignmentError && assignment) {
      return assignment.variant === 'treatment';
    }

    // 6. No assignment exists - create one based on rollout percentage
    // Use a deterministic-ish approach: hash the user ID + flag key
    // to get a consistent assignment for the same user/flag combo
    const assignmentValue = deterministicRandom(userId, flagKey);
    const variant = assignmentValue < flag.rollout_percentage ? 'treatment' : 'control';

    // Insert the assignment (ignore errors from race conditions)
    const { error: insertError } = await supabase
      .from('user_feature_assignments')
      .insert({
        user_id: userId,
        feature_flag_id: flag.id,
        variant,
      });

    if (insertError) {
      // If insert failed due to conflict (race condition), re-read the assignment
      const { data: existingAssignment } = await supabase
        .from('user_feature_assignments')
        .select('variant')
        .eq('user_id', userId)
        .eq('feature_flag_id', flag.id)
        .single();

      if (existingAssignment) {
        return existingAssignment.variant === 'treatment';
      }

      // If we still can't read it, default to control
      return false;
    }

    return variant === 'treatment';
  } catch (error) {
    console.error(`[features/flags] Error checking flag "${flagKey}":`, error);
    return false;
  }
}

/**
 * Get all feature flags resolved for a specific user.
 * Returns a Record<string, boolean> where keys are flag keys and values are
 * whether the flag is enabled for this user.
 */
export async function getAllFeatureFlags(
  userId: string,
  supabase: SupabaseClient
): Promise<Record<string, boolean>> {
  try {
    // 1. Fetch all feature flags
    const { data: flags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('id, key, enabled, rollout_percentage');

    if (flagsError || !flags) {
      console.error('[features/flags] Error fetching flags:', flagsError);
      return {};
    }

    // 2. Fetch all existing user assignments in one query
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
    const result: Record<string, boolean> = {};
    const newAssignments: Array<{
      user_id: string;
      feature_flag_id: string;
      variant: string;
    }> = [];

    for (const flag of flags) {
      // If globally disabled
      if (!flag.enabled) {
        result[flag.key] = false;
        continue;
      }

      // If 100% rollout
      if (flag.rollout_percentage === 100) {
        result[flag.key] = true;
        continue;
      }

      // If 0% rollout
      if (flag.rollout_percentage === 0) {
        result[flag.key] = false;
        continue;
      }

      // Check existing assignment
      const existingVariant = assignmentMap.get(flag.id);
      if (existingVariant) {
        result[flag.key] = existingVariant === 'treatment';
        continue;
      }

      // Create new assignment
      const assignmentValue = deterministicRandom(userId, flag.key);
      const variant = assignmentValue < flag.rollout_percentage ? 'treatment' : 'control';
      result[flag.key] = variant === 'treatment';

      newAssignments.push({
        user_id: userId,
        feature_flag_id: flag.id,
        variant,
      });
    }

    // 4. Batch-insert new assignments (ignore conflicts from race conditions)
    if (newAssignments.length > 0) {
      const { error: insertError } = await supabase
        .from('user_feature_assignments')
        .insert(newAssignments);

      if (insertError) {
        // Log but don't fail - assignments will be created on next check
        console.warn('[features/flags] Error batch-inserting assignments:', insertError);
      }
    }

    return result;
  } catch (error) {
    console.error('[features/flags] Error getting all flags:', error);
    return {};
  }
}

/**
 * Generate a deterministic number 0-99 from user ID + flag key.
 * This ensures the same user always gets the same assignment for a given flag,
 * even if there is a race condition on insert.
 */
function deterministicRandom(userId: string, flagKey: string): number {
  const combined = `${userId}:${flagKey}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit integer
  }
  // Ensure positive and map to 0-99
  return Math.abs(hash) % 100;
}
