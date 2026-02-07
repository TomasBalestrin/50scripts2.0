import { describe, it, expect } from 'vitest';
import { hasAccess, canAccessScript, getAvailableFeatures, getUpgradePlan } from '@/lib/plans/gate';
import type { Plan } from '@/types/database';

describe('Plan Gating Logic', () => {
  describe('hasAccess', () => {
    it('should allow starter to access starter features', () => {
      expect(hasAccess('starter', 'starter')).toBe(true);
    });

    it('should not allow starter to access pro features', () => {
      expect(hasAccess('starter', 'pro')).toBe(false);
    });

    it('should not allow starter to access premium features', () => {
      expect(hasAccess('starter', 'premium')).toBe(false);
    });

    it('should not allow starter to access copilot features', () => {
      expect(hasAccess('starter', 'copilot')).toBe(false);
    });

    it('should allow pro to access starter features', () => {
      expect(hasAccess('pro', 'starter')).toBe(true);
    });

    it('should allow pro to access pro features', () => {
      expect(hasAccess('pro', 'pro')).toBe(true);
    });

    it('should not allow pro to access premium features', () => {
      expect(hasAccess('pro', 'premium')).toBe(false);
    });

    it('should not allow pro to access copilot features', () => {
      expect(hasAccess('pro', 'copilot')).toBe(false);
    });

    it('should allow premium to access starter features', () => {
      expect(hasAccess('premium', 'starter')).toBe(true);
    });

    it('should allow premium to access pro features', () => {
      expect(hasAccess('premium', 'pro')).toBe(true);
    });

    it('should allow premium to access premium features', () => {
      expect(hasAccess('premium', 'premium')).toBe(true);
    });

    it('should not allow premium to access copilot features', () => {
      expect(hasAccess('premium', 'copilot')).toBe(false);
    });

    it('should allow copilot to access all features', () => {
      const plans: Plan[] = ['starter', 'pro', 'premium', 'copilot'];
      plans.forEach((requiredPlan) => {
        expect(hasAccess('copilot', requiredPlan)).toBe(true);
      });
    });
  });

  describe('canAccessScript', () => {
    it('should allow starter user to access starter scripts', () => {
      expect(canAccessScript('starter', 'starter')).toBe(true);
    });

    it('should block starter user from pro scripts', () => {
      expect(canAccessScript('starter', 'pro')).toBe(false);
    });

    it('should block pro user from premium scripts', () => {
      expect(canAccessScript('pro', 'premium')).toBe(false);
    });

    it('should allow premium user to access pro scripts', () => {
      expect(canAccessScript('premium', 'pro')).toBe(true);
    });

    it('should allow copilot user to access any script min_plan', () => {
      const scriptPlans: Plan[] = ['starter', 'pro', 'premium', 'copilot'];
      scriptPlans.forEach((minPlan) => {
        expect(canAccessScript('copilot', minPlan)).toBe(true);
      });
    });

    it('should block premium user from copilot-only scripts', () => {
      expect(canAccessScript('premium', 'copilot')).toBe(false);
    });
  });

  describe('getAvailableFeatures', () => {
    it('should give starter plan basic features only', () => {
      const features = getAvailableFeatures('starter');

      // Basic features should be true
      expect(features.scripts).toBe(true);
      expect(features.trails).toBe(true);
      expect(features.copyScript).toBe(true);
      expect(features.onboarding).toBe(true);
      expect(features.emergencyFab).toBe(true);
      expect(features.objectionSearch).toBe(true);
      expect(features.microlearning).toBe(true);
      expect(features.basicDashboard).toBe(true);
      expect(features.textSearch).toBe(true);
      expect(features.profile).toBe(true);

      // Pro features should be false
      expect(features.revenueDashboard).toBe(false);
      expect(features.savedVariables).toBe(false);
      expect(features.toneVariations).toBe(false);
      expect(features.communityMetrics).toBe(false);
      expect(features.pushNotifications).toBe(false);
      expect(features.chromeExtension).toBe(false);
      expect(features.pwaOffline).toBe(false);
      expect(features.gamification).toBe(false);
      expect(features.dailyChallenges).toBe(false);
      expect(features.salesAgenda).toBe(false);
      expect(features.advancedAnalytics).toBe(false);

      // Premium features should be false
      expect(features.pipeline).toBe(false);
      expect(features.leadHistory).toBe(false);
      expect(features.realLeadAgenda).toBe(false);
      expect(features.aiGeneration).toBe(false);
      expect(features.semanticSearch).toBe(false);
      expect(features.audioModels).toBe(false);
      expect(features.resultCards).toBe(false);
      expect(features.referralSystem).toBe(false);
      expect(features.collections).toBe(false);

      // Copilot features should be false
      expect(features.aiConversational).toBe(false);
      expect(features.aiUnlimited).toBe(false);
      expect(features.patternAnalysis).toBe(false);
      expect(features.smartAgenda).toBe(false);
      expect(features.dataExport).toBe(false);
      expect(features.earlyAccess).toBe(false);
    });

    it('should give pro plan pro+starter features', () => {
      const features = getAvailableFeatures('pro');

      // Starter features
      expect(features.scripts).toBe(true);
      expect(features.trails).toBe(true);

      // Pro features should be true
      expect(features.revenueDashboard).toBe(true);
      expect(features.savedVariables).toBe(true);
      expect(features.toneVariations).toBe(true);
      expect(features.communityMetrics).toBe(true);
      expect(features.pushNotifications).toBe(true);
      expect(features.chromeExtension).toBe(true);
      expect(features.pwaOffline).toBe(true);
      expect(features.gamification).toBe(true);
      expect(features.dailyChallenges).toBe(true);
      expect(features.salesAgenda).toBe(true);
      expect(features.advancedAnalytics).toBe(true);

      // Premium features should be false
      expect(features.pipeline).toBe(false);
      expect(features.aiGeneration).toBe(false);
      expect(features.collections).toBe(false);

      // Copilot features should be false
      expect(features.aiConversational).toBe(false);
      expect(features.aiUnlimited).toBe(false);
    });

    it('should give premium plan premium+pro+starter features', () => {
      const features = getAvailableFeatures('premium');

      // Starter features
      expect(features.scripts).toBe(true);

      // Pro features
      expect(features.revenueDashboard).toBe(true);
      expect(features.gamification).toBe(true);

      // Premium features should be true
      expect(features.pipeline).toBe(true);
      expect(features.leadHistory).toBe(true);
      expect(features.realLeadAgenda).toBe(true);
      expect(features.aiGeneration).toBe(true);
      expect(features.semanticSearch).toBe(true);
      expect(features.audioModels).toBe(true);
      expect(features.resultCards).toBe(true);
      expect(features.referralSystem).toBe(true);
      expect(features.collections).toBe(true);

      // Copilot features should be false
      expect(features.aiConversational).toBe(false);
      expect(features.aiUnlimited).toBe(false);
      expect(features.patternAnalysis).toBe(false);
      expect(features.smartAgenda).toBe(false);
      expect(features.dataExport).toBe(false);
      expect(features.earlyAccess).toBe(false);
    });

    it('should give copilot plan all features', () => {
      const features = getAvailableFeatures('copilot');

      // Every single feature should be true
      const allFeatureValues = Object.values(features);
      expect(allFeatureValues.every((v) => v === true)).toBe(true);
    });

    it('should return an object with all known feature keys', () => {
      const features = getAvailableFeatures('starter');
      const expectedKeys = [
        'scripts', 'trails', 'copyScript', 'onboarding', 'emergencyFab',
        'objectionSearch', 'microlearning', 'basicDashboard', 'textSearch', 'profile',
        'revenueDashboard', 'savedVariables', 'toneVariations', 'communityMetrics',
        'pushNotifications', 'chromeExtension', 'pwaOffline', 'gamification',
        'dailyChallenges', 'salesAgenda', 'advancedAnalytics',
        'pipeline', 'leadHistory', 'realLeadAgenda', 'aiGeneration',
        'semanticSearch', 'audioModels', 'resultCards', 'referralSystem', 'collections',
        'aiConversational', 'aiUnlimited', 'patternAnalysis', 'smartAgenda',
        'dataExport', 'earlyAccess',
      ];
      expectedKeys.forEach((key) => {
        expect(features).toHaveProperty(key);
      });
    });
  });

  describe('getUpgradePlan', () => {
    it('should return pro as upgrade for starter', () => {
      expect(getUpgradePlan('starter')).toBe('pro');
    });

    it('should return premium as upgrade for pro', () => {
      expect(getUpgradePlan('pro')).toBe('premium');
    });

    it('should return copilot as upgrade for premium', () => {
      expect(getUpgradePlan('premium')).toBe('copilot');
    });

    it('should return null for copilot (no upgrade available)', () => {
      expect(getUpgradePlan('copilot')).toBeNull();
    });

    it('should return valid Plan type or null for all plans', () => {
      const plans: Plan[] = ['starter', 'pro', 'premium', 'copilot'];
      const validPlans: (Plan | null)[] = ['starter', 'pro', 'premium', 'copilot', null];

      plans.forEach((plan) => {
        const upgrade = getUpgradePlan(plan);
        expect(validPlans).toContain(upgrade);
      });
    });
  });
});
