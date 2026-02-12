import { Plan } from '@/types/database';
import { PLAN_HIERARCHY } from '@/lib/constants';

export function hasAccess(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}

/**
 * Check plan access considering expiration date.
 * If plan is expired, treat user as 'starter'.
 */
export function hasValidAccess(
  userPlan: Plan,
  requiredPlan: Plan,
  planExpiresAt?: string | null,
): boolean {
  const effectivePlan = isPlanExpired(planExpiresAt) ? 'starter' : userPlan;
  return PLAN_HIERARCHY[effectivePlan] >= PLAN_HIERARCHY[requiredPlan];
}

/**
 * Returns true if plan has expired.
 */
export function isPlanExpired(planExpiresAt?: string | null): boolean {
  if (!planExpiresAt) return false; // No expiration = permanent plan
  return new Date(planExpiresAt) < new Date();
}

export function canAccessScript(userPlan: Plan, scriptMinPlan: Plan): boolean {
  return hasAccess(userPlan, scriptMinPlan);
}

export function getAvailableFeatures(plan: Plan) {
  const features = {
    // Starter features (all plans)
    scripts: true,
    trails: true,
    copyScript: true,
    onboarding: true,
    emergencyFab: true,
    objectionSearch: true,
    microlearning: true,
    basicDashboard: true,
    textSearch: true,
    profile: true,

    // Starter features (added)
    leadHistory: true, // Histórico de uso available for all plans

    // Pro features
    revenueDashboard: hasAccess(plan, 'pro'),
    savedVariables: hasAccess(plan, 'pro'),
    toneVariations: hasAccess(plan, 'pro'),
    communityMetrics: hasAccess(plan, 'pro'),
    pushNotifications: hasAccess(plan, 'pro'),
    chromeExtension: hasAccess(plan, 'pro'),
    pwaOffline: hasAccess(plan, 'pro'),
    gamification: hasAccess(plan, 'pro'),
    dailyChallenges: hasAccess(plan, 'pro'),
    salesAgenda: hasAccess(plan, 'pro'),
    advancedAnalytics: hasAccess(plan, 'pro'),
    aiGeneration: hasAccess(plan, 'pro'),

    // Premium features
    pipeline: hasAccess(plan, 'premium'),
    realLeadAgenda: hasAccess(plan, 'premium'),
    aiConversational: hasAccess(plan, 'premium'),
    patternAnalysis: hasAccess(plan, 'premium'),
    semanticSearch: hasAccess(plan, 'premium'),
    audioModels: hasAccess(plan, 'premium'),
    resultCards: hasAccess(plan, 'premium'),
    referralSystem: hasAccess(plan, 'premium'),
    collections: hasAccess(plan, 'premium'),

    // Copilot features
    aiUnlimited: hasAccess(plan, 'copilot'),
    smartAgenda: hasAccess(plan, 'copilot'),
    dataExport: hasAccess(plan, 'copilot'),
    earlyAccess: hasAccess(plan, 'copilot'),
  };

  return features;
}

export function getUpgradePlan(currentPlan: Plan): Plan | null {
  const upgrades: Record<Plan, Plan | null> = {
    starter: 'pro',
    pro: 'premium',
    premium: 'copilot',
    copilot: null,
  };
  return upgrades[currentPlan];
}
