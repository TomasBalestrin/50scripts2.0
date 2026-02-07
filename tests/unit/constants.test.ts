import { describe, it, expect } from 'vitest';
import {
  PLAN_HIERARCHY,
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_COLORS,
  LEVEL_THRESHOLDS,
  LEVEL_LABELS,
  XP_VALUES,
  RATE_LIMITS,
  AI_CREDITS,
  REFERRAL_REWARDS,
  COLORS,
  DEFAULT_PASSWORD,
  EMERGENCY_TYPES,
  EMERGENCY_LABELS,
  TRAIL_SLUGS,
} from '@/lib/constants';

describe('Constants Integrity', () => {
  describe('PLAN_HIERARCHY', () => {
    it('should have all four plans defined', () => {
      expect(PLAN_HIERARCHY).toHaveProperty('starter');
      expect(PLAN_HIERARCHY).toHaveProperty('pro');
      expect(PLAN_HIERARCHY).toHaveProperty('premium');
      expect(PLAN_HIERARCHY).toHaveProperty('copilot');
    });

    it('should have plans in ascending order', () => {
      expect(PLAN_HIERARCHY.starter).toBeLessThan(PLAN_HIERARCHY.pro);
      expect(PLAN_HIERARCHY.pro).toBeLessThan(PLAN_HIERARCHY.premium);
      expect(PLAN_HIERARCHY.premium).toBeLessThan(PLAN_HIERARCHY.copilot);
    });

    it('should have starter as the lowest tier (0)', () => {
      expect(PLAN_HIERARCHY.starter).toBe(0);
    });

    it('should have copilot as the highest tier', () => {
      const maxValue = Math.max(...Object.values(PLAN_HIERARCHY));
      expect(PLAN_HIERARCHY.copilot).toBe(maxValue);
    });

    it('should have exactly 4 plans', () => {
      expect(Object.keys(PLAN_HIERARCHY)).toHaveLength(4);
    });
  });

  describe('PLAN_LABELS', () => {
    it('should have labels for all plans', () => {
      expect(Object.keys(PLAN_LABELS)).toEqual(Object.keys(PLAN_HIERARCHY));
    });

    it('should have non-empty string labels', () => {
      Object.values(PLAN_LABELS).forEach((label) => {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PLAN_PRICES', () => {
    it('should have prices for all plans', () => {
      expect(Object.keys(PLAN_PRICES)).toEqual(Object.keys(PLAN_HIERARCHY));
    });

    it('should have prices in R$ format', () => {
      Object.values(PLAN_PRICES).forEach((price) => {
        expect(price).toMatch(/^R\$/);
      });
    });
  });

  describe('PLAN_COLORS', () => {
    it('should have colors for all plans', () => {
      expect(Object.keys(PLAN_COLORS)).toEqual(Object.keys(PLAN_HIERARCHY));
    });

    it('should have valid hex color codes', () => {
      Object.values(PLAN_COLORS).forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('LEVEL_THRESHOLDS', () => {
    it('should have all five levels defined', () => {
      expect(LEVEL_THRESHOLDS).toHaveProperty('iniciante');
      expect(LEVEL_THRESHOLDS).toHaveProperty('vendedor');
      expect(LEVEL_THRESHOLDS).toHaveProperty('closer');
      expect(LEVEL_THRESHOLDS).toHaveProperty('topseller');
      expect(LEVEL_THRESHOLDS).toHaveProperty('elite');
    });

    it('should have thresholds in ascending order', () => {
      const thresholds = Object.values(LEVEL_THRESHOLDS);
      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
      }
    });

    it('should start at 0 for iniciante', () => {
      expect(LEVEL_THRESHOLDS.iniciante).toBe(0);
    });

    it('should have all thresholds as non-negative numbers', () => {
      Object.values(LEVEL_THRESHOLDS).forEach((threshold) => {
        expect(typeof threshold).toBe('number');
        expect(threshold).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have specific threshold values', () => {
      expect(LEVEL_THRESHOLDS.vendedor).toBe(101);
      expect(LEVEL_THRESHOLDS.closer).toBe(501);
      expect(LEVEL_THRESHOLDS.topseller).toBe(1501);
      expect(LEVEL_THRESHOLDS.elite).toBe(5001);
    });
  });

  describe('LEVEL_LABELS', () => {
    it('should have labels for all levels', () => {
      expect(Object.keys(LEVEL_LABELS)).toEqual(Object.keys(LEVEL_THRESHOLDS));
    });

    it('should have non-empty string labels', () => {
      Object.values(LEVEL_LABELS).forEach((label) => {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('XP_VALUES', () => {
    it('should have all XP action types defined', () => {
      expect(XP_VALUES).toHaveProperty('USE_SCRIPT');
      expect(XP_VALUES).toHaveProperty('RATE_SCRIPT');
      expect(XP_VALUES).toHaveProperty('SALE');
      expect(XP_VALUES).toHaveProperty('CHALLENGE');
      expect(XP_VALUES).toHaveProperty('STREAK_7D');
    });

    it('should have all positive XP values', () => {
      Object.values(XP_VALUES).forEach((value) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should have USE_SCRIPT at 10 XP', () => {
      expect(XP_VALUES.USE_SCRIPT).toBe(10);
    });

    it('should have CHALLENGE worth more than basic actions', () => {
      expect(XP_VALUES.CHALLENGE).toBeGreaterThan(XP_VALUES.USE_SCRIPT);
      expect(XP_VALUES.CHALLENGE).toBeGreaterThan(XP_VALUES.RATE_SCRIPT);
    });

    it('should have STREAK_7D as the highest XP reward', () => {
      const maxXP = Math.max(...Object.values(XP_VALUES));
      expect(XP_VALUES.STREAK_7D).toBe(maxXP);
    });
  });

  describe('RATE_LIMITS', () => {
    it('should have rate limits for all plans', () => {
      expect(Object.keys(RATE_LIMITS)).toEqual(Object.keys(PLAN_HIERARCHY));
    });

    it('should have all positive rate limits', () => {
      Object.values(RATE_LIMITS).forEach((limit) => {
        expect(limit).toBeGreaterThan(0);
      });
    });

    it('should have higher limits for higher plans', () => {
      expect(RATE_LIMITS.pro).toBeGreaterThanOrEqual(RATE_LIMITS.starter);
      expect(RATE_LIMITS.premium).toBeGreaterThanOrEqual(RATE_LIMITS.pro);
      expect(RATE_LIMITS.copilot).toBeGreaterThanOrEqual(RATE_LIMITS.premium);
    });

    it('should have specific rate limit values', () => {
      expect(RATE_LIMITS.starter).toBe(30);
      expect(RATE_LIMITS.pro).toBe(60);
      expect(RATE_LIMITS.premium).toBe(120);
      expect(RATE_LIMITS.copilot).toBe(120);
    });
  });

  describe('AI_CREDITS', () => {
    it('should have credits for all plans', () => {
      expect(Object.keys(AI_CREDITS)).toEqual(Object.keys(PLAN_HIERARCHY));
    });

    it('should give no AI credits to starter and pro', () => {
      expect(AI_CREDITS.starter).toBe(0);
      expect(AI_CREDITS.pro).toBe(0);
    });

    it('should give 15 credits to premium', () => {
      expect(AI_CREDITS.premium).toBe(15);
    });

    it('should give unlimited (-1) credits to copilot', () => {
      expect(AI_CREDITS.copilot).toBe(-1);
    });
  });

  describe('TRAIL_SLUGS', () => {
    it('should have 8 trail slugs', () => {
      expect(TRAIL_SLUGS).toHaveLength(8);
    });

    it('should have all slugs in lowercase', () => {
      TRAIL_SLUGS.forEach((slug) => {
        expect(slug).toBe(slug.toLowerCase());
      });
    });

    it('should have valid slug format (lowercase letters and hyphens only)', () => {
      const slugPattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;
      TRAIL_SLUGS.forEach((slug) => {
        expect(slug).toMatch(slugPattern);
      });
    });

    it('should not have consecutive hyphens', () => {
      TRAIL_SLUGS.forEach((slug) => {
        expect(slug).not.toMatch(/--/);
      });
    });

    it('should contain expected trail slugs', () => {
      expect(TRAIL_SLUGS).toContain('abordagem-inicial');
      expect(TRAIL_SLUGS).toContain('fechamento');
      expect(TRAIL_SLUGS).toContain('follow-up');
      expect(TRAIL_SLUGS).toContain('pos-venda');
    });

    it('should have unique slugs (no duplicates)', () => {
      const uniqueSlugs = new Set(TRAIL_SLUGS);
      expect(uniqueSlugs.size).toBe(TRAIL_SLUGS.length);
    });
  });

  describe('EMERGENCY_TYPES', () => {
    it('should have 4 emergency types', () => {
      expect(EMERGENCY_TYPES).toHaveLength(4);
    });

    it('should include expected types', () => {
      expect(EMERGENCY_TYPES).toContain('approach');
      expect(EMERGENCY_TYPES).toContain('objection');
      expect(EMERGENCY_TYPES).toContain('followup');
      expect(EMERGENCY_TYPES).toContain('close');
    });

    it('should have labels for all emergency types', () => {
      EMERGENCY_TYPES.forEach((type) => {
        expect(EMERGENCY_LABELS).toHaveProperty(type);
        expect(typeof EMERGENCY_LABELS[type]).toBe('string');
      });
    });
  });

  describe('DEFAULT_PASSWORD', () => {
    it('should be defined and non-empty', () => {
      expect(DEFAULT_PASSWORD).toBeDefined();
      expect(DEFAULT_PASSWORD.length).toBeGreaterThan(0);
    });

    it('should meet minimum security requirements (8+ chars)', () => {
      expect(DEFAULT_PASSWORD.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('COLORS', () => {
    it('should have all theme colors defined', () => {
      const expectedKeys = [
        'primary', 'secondary', 'accent', 'background', 'surface',
        'surfaceLight', 'text', 'textMuted', 'success', 'warning', 'error',
      ];
      expectedKeys.forEach((key) => {
        expect(COLORS).toHaveProperty(key);
      });
    });

    it('should have valid hex color codes', () => {
      Object.values(COLORS).forEach((color) => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('REFERRAL_REWARDS', () => {
    it('should have rewards at milestones 1, 3, and 10', () => {
      expect(REFERRAL_REWARDS).toHaveProperty('1');
      expect(REFERRAL_REWARDS).toHaveProperty('3');
      expect(REFERRAL_REWARDS).toHaveProperty('10');
    });

    it('should have reward objects with type, value, and label', () => {
      Object.values(REFERRAL_REWARDS).forEach((reward) => {
        expect(reward).toHaveProperty('type');
        expect(reward).toHaveProperty('value');
        expect(reward).toHaveProperty('label');
      });
    });

    it('should give ai_credits as first reward', () => {
      expect(REFERRAL_REWARDS[1].type).toBe('ai_credits');
    });
  });
});
