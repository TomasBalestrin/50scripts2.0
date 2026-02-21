import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const scriptUsageSchema = z.object({
  script_id: z.string().uuid(),
  lead_id: z.string().uuid().optional(),
  tone_used: z.enum(['formal', 'casual', 'direct']).optional(),
});

export const scriptRatingSchema = z.object({
  effectiveness_rating: z.number().min(1).max(5),
  resulted_in_sale: z.boolean().optional(),
  sale_value: z.number().positive().max(1_000_000).optional(), // Cap at R$1M to prevent abuse
  feedback_note: z.string().max(500).optional(),
});

export const leadSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  phone: z.string().optional(),
  stage: z.enum(['novo', 'abordado', 'qualificado', 'proposta', 'fechado', 'perdido']).default('novo'),
  expected_value: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  next_followup_at: z.string().datetime().optional(),
});

export const webhookAccessGrantSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  source: z.string().optional(),
  referral_code: z.string().optional(),
});

export const webhookPlanUpgradeSchema = z.object({
  email: z.string().email(),
  plan: z.enum(['pro', 'premium', 'copilot']),
  source: z.string().optional(),
});

export const objectionSearchSchema = z.object({
  query: z.string().min(3, 'Mínimo 3 caracteres').max(500),
});

export const aiGenerateSchema = z.object({
  category_id: z.string().uuid(),
  context: z.string().min(10).max(2000),
  tone: z.enum(['formal', 'casual', 'direct']).optional(),
});

export const aiConversationSchema = z.object({
  conversation: z.string().min(10).max(5000),
  lead_id: z.string().uuid().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ScriptUsageInput = z.infer<typeof scriptUsageSchema>;
export type ScriptRatingInput = z.infer<typeof scriptRatingSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type WebhookAccessGrantInput = z.infer<typeof webhookAccessGrantSchema>;
export type WebhookPlanUpgradeInput = z.infer<typeof webhookPlanUpgradeSchema>;
export type ObjectionSearchInput = z.infer<typeof objectionSearchSchema>;
export type AIGenerateInput = z.infer<typeof aiGenerateSchema>;
export type AIConversationInput = z.infer<typeof aiConversationSchema>;

// ============================================================
// Script Go - New Schemas
// ============================================================

export const onboardingSchema = z.object({
  full_name: z.string().min(2, 'Nome obrigatorio'),
  phone: z.string().min(10, 'Telefone obrigatorio'),
  email: z.string().email('Email invalido'),
  instagram: z.string().optional(),
  company_name: z.string().optional(),
  business_type: z.string().min(1, 'Selecione seu tipo de negocio'),
  business_type_custom: z.string().optional(),
  role_in_business: z.string().optional(),
  average_ticket: z.string().optional(),
  target_audience: z.string().optional(),
  main_objections: z.string().optional(),
  main_challenges: z.array(z.string()).min(1, 'Selecione pelo menos um desafio'),
  main_challenges_custom: z.string().optional(),
  has_partner: z.boolean().default(false),
  time_knowing_cleiton: z.string().optional(),
});

export const scriptSaleSchema = z.object({
  product_name: z.string().min(1, 'Informe o que foi vendido').max(200),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida'),
  sale_value: z.number().positive('Valor deve ser positivo').max(10_000_000),
});

export const personalizedGenerateSchema = z.object({
  situation: z.string().min(5, 'Descreva a situacao').max(1000),
  description: z.string().max(2000).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ScriptSaleInput = z.infer<typeof scriptSaleSchema>;
export type PersonalizedGenerateInput = z.infer<typeof personalizedGenerateSchema>;
