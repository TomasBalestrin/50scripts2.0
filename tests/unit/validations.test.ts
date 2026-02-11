import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  onboardingSchema,
  scriptUsageSchema,
  scriptRatingSchema,
  leadSchema,
  webhookAccessGrantSchema,
  webhookPlanUpgradeSchema,
  objectionSearchSchema,
  aiGenerateSchema,
  aiConversationSchema,
} from '@/lib/validations/schemas';

describe('Zod Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should accept valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: '123456',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: '123456',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 6 characters', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('should accept password with exactly 6 characters', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing email field', () => {
      const result = loginSchema.safeParse({
        password: '123456',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing password field', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('should accept email with subdomains', () => {
      const result = loginSchema.safeParse({
        email: 'user@sub.domain.example.com',
        password: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = loginSchema.safeParse({
        email: 'user+tag@example.com',
        password: '123456',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('onboardingSchema', () => {
    it('should accept valid onboarding data', () => {
      const result = onboardingSchema.safeParse({
        niche: 'SaaS',
        difficulty: 'fechamento',
        preferred_tone: 'formal',
      });
      expect(result.success).toBe(true);
    });

    it('should reject niche shorter than 2 characters', () => {
      const result = onboardingSchema.safeParse({
        niche: 'A',
        difficulty: 'fechamento',
        preferred_tone: 'formal',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid tone', () => {
      const result = onboardingSchema.safeParse({
        niche: 'SaaS',
        difficulty: 'fechamento',
        preferred_tone: 'aggressive',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid tones', () => {
      const tones = ['formal', 'casual', 'direct'] as const;
      tones.forEach((tone) => {
        const result = onboardingSchema.safeParse({
          niche: 'SaaS',
          difficulty: 'fechamento',
          preferred_tone: tone,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('scriptUsageSchema', () => {
    it('should accept valid script usage with UUID', () => {
      const result = scriptUsageSchema.safeParse({
        script_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for script_id', () => {
      const result = scriptUsageSchema.safeParse({
        script_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional lead_id as valid UUID', () => {
      const result = scriptUsageSchema.safeParse({
        script_id: '550e8400-e29b-41d4-a716-446655440000',
        lead_id: '660e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for lead_id', () => {
      const result = scriptUsageSchema.safeParse({
        script_id: '550e8400-e29b-41d4-a716-446655440000',
        lead_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional tone_used field', () => {
      const result = scriptUsageSchema.safeParse({
        script_id: '550e8400-e29b-41d4-a716-446655440000',
        tone_used: 'casual',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid tone_used value', () => {
      const result = scriptUsageSchema.safeParse({
        script_id: '550e8400-e29b-41d4-a716-446655440000',
        tone_used: 'unknown',
      });
      expect(result.success).toBe(false);
    });

    it('should accept usage without optional fields', () => {
      const result = scriptUsageSchema.safeParse({
        script_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('scriptRatingSchema', () => {
    it('should accept valid rating 1-5', () => {
      for (let i = 1; i <= 5; i++) {
        const result = scriptRatingSchema.safeParse({
          effectiveness_rating: i,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject rating below 1', () => {
      const result = scriptRatingSchema.safeParse({
        effectiveness_rating: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject rating above 5', () => {
      const result = scriptRatingSchema.safeParse({
        effectiveness_rating: 6,
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional sale_value as positive number', () => {
      const result = scriptRatingSchema.safeParse({
        effectiveness_rating: 5,
        resulted_in_sale: true,
        sale_value: 1500.50,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-positive sale_value', () => {
      const result = scriptRatingSchema.safeParse({
        effectiveness_rating: 5,
        sale_value: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional feedback_note up to 500 chars', () => {
      const result = scriptRatingSchema.safeParse({
        effectiveness_rating: 4,
        feedback_note: 'Great script, worked well!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject feedback_note longer than 500 chars', () => {
      const result = scriptRatingSchema.safeParse({
        effectiveness_rating: 4,
        feedback_note: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('leadSchema', () => {
    it('should accept valid lead with required name', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
      });
      expect(result.success).toBe(true);
    });

    it('should reject name shorter than 2 characters', () => {
      const result = leadSchema.safeParse({
        name: 'J',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing name', () => {
      const result = leadSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept optional phone', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
        phone: '+5511999999999',
      });
      expect(result.success).toBe(true);
    });

    it('should accept lead without phone', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBeUndefined();
      }
    });

    it('should accept optional expected_value as positive number', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
        expected_value: 5000,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-positive expected_value', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
        expected_value: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should default stage to novo', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stage).toBe('novo');
      }
    });

    it('should accept all valid stages', () => {
      const stages = ['novo', 'abordado', 'qualificado', 'proposta', 'fechado', 'perdido'] as const;
      stages.forEach((stage) => {
        const result = leadSchema.safeParse({
          name: 'John Doe',
          stage,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid stage', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
        stage: 'unknown',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional notes up to 2000 chars', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
        notes: 'Some notes about this lead',
      });
      expect(result.success).toBe(true);
    });

    it('should reject notes longer than 2000 chars', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
        notes: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional next_followup_at as datetime', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
        next_followup_at: '2025-06-15T10:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid datetime for next_followup_at', () => {
      const result = leadSchema.safeParse({
        name: 'John Doe',
        next_followup_at: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should accept full lead object with all fields', () => {
      const result = leadSchema.safeParse({
        name: 'Maria Silva',
        phone: '+5511888888888',
        stage: 'qualificado',
        expected_value: 15000,
        notes: 'Interested in premium plan',
        next_followup_at: '2025-06-20T14:00:00Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('webhookAccessGrantSchema', () => {
    it('should accept valid email', () => {
      const result = webhookAccessGrantSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = webhookAccessGrantSchema.safeParse({
        email: 'not-email',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional name and source', () => {
      const result = webhookAccessGrantSchema.safeParse({
        email: 'user@example.com',
        name: 'John Doe',
        source: 'hotmart',
        referral_code: 'ABC123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('webhookPlanUpgradeSchema', () => {
    it('should accept valid upgrade data', () => {
      const result = webhookPlanUpgradeSchema.safeParse({
        email: 'user@example.com',
        plan: 'pro',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid plan', () => {
      const result = webhookPlanUpgradeSchema.safeParse({
        email: 'user@example.com',
        plan: 'starter',
      });
      expect(result.success).toBe(false);
    });

    it('should accept pro, premium, and copilot plans', () => {
      const plans = ['pro', 'premium', 'copilot'] as const;
      plans.forEach((plan) => {
        const result = webhookPlanUpgradeSchema.safeParse({
          email: 'user@example.com',
          plan,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('objectionSearchSchema', () => {
    it('should accept query with 3+ characters', () => {
      const result = objectionSearchSchema.safeParse({
        query: 'preco muito alto',
      });
      expect(result.success).toBe(true);
    });

    it('should reject query shorter than 3 characters', () => {
      const result = objectionSearchSchema.safeParse({
        query: 'ab',
      });
      expect(result.success).toBe(false);
    });

    it('should reject query longer than 500 characters', () => {
      const result = objectionSearchSchema.safeParse({
        query: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('aiGenerateSchema', () => {
    it('should accept valid generation request', () => {
      const result = aiGenerateSchema.safeParse({
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        context: 'Client is interested in software solutions for their business',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for category_id', () => {
      const result = aiGenerateSchema.safeParse({
        category_id: 'not-uuid',
        context: 'Valid context for generation',
      });
      expect(result.success).toBe(false);
    });

    it('should reject context shorter than 10 characters', () => {
      const result = aiGenerateSchema.safeParse({
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        context: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject context longer than 2000 characters', () => {
      const result = aiGenerateSchema.safeParse({
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        context: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional tone parameter', () => {
      const result = aiGenerateSchema.safeParse({
        category_id: '550e8400-e29b-41d4-a716-446655440000',
        context: 'Generate a formal sales script',
        tone: 'formal',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('aiConversationSchema', () => {
    it('should accept valid conversation data', () => {
      const result = aiConversationSchema.safeParse({
        conversation: 'The customer said they need more time to think about the offer',
      });
      expect(result.success).toBe(true);
    });

    it('should reject conversation shorter than 10 characters', () => {
      const result = aiConversationSchema.safeParse({
        conversation: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject conversation longer than 5000 characters', () => {
      const result = aiConversationSchema.safeParse({
        conversation: 'a'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional lead_id', () => {
      const result = aiConversationSchema.safeParse({
        conversation: 'The customer said they need more time to think',
        lead_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });
});
