import { Plan, Level } from '@/types/database';

export const PLAN_HIERARCHY: Record<Plan, number> = {
  starter: 0,
  pro: 1,
  premium: 2,
  copilot: 3,
};

export const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  premium: 'Premium',
  copilot: 'Copilot',
};

export const PLAN_PRICES: Record<Plan, string> = {
  starter: 'R$ 29,90',
  pro: 'R$ 19,90/mês',
  premium: 'R$ 49,90/mês',
  copilot: 'R$ 97,90/mês',
};

export const PLAN_COLORS: Record<Plan, string> = {
  starter: '#6B7280',
  pro: '#3B82F6',
  premium: '#8B5CF6',
  copilot: '#F59E0B',
};

export const LEVEL_THRESHOLDS: Record<Level, number> = {
  iniciante: 0,
  vendedor: 101,
  closer: 501,
  topseller: 1501,
  elite: 5001,
};

export const LEVEL_LABELS: Record<Level, string> = {
  iniciante: 'Iniciante',
  vendedor: 'Vendedor',
  closer: 'Closer',
  topseller: 'Top Seller',
  elite: 'Elite',
};

export const XP_VALUES = {
  USE_SCRIPT: 10,
  RATE_SCRIPT: 5,
  SALE: 25,
  CHALLENGE: 50,
  STREAK_7D: 100,
} as const;

export const RATE_LIMITS: Record<Plan, number> = {
  starter: 30,
  pro: 60,
  premium: 120,
  copilot: 120,
};

export const AI_CREDITS: Record<Plan, number> = {
  starter: 0,
  pro: 0,
  premium: 15,
  copilot: -1, // unlimited
};

export const REFERRAL_REWARDS = {
  1: { type: 'ai_credits', value: 3, label: '3 créditos IA' },
  3: { type: 'free_month', value: 1, label: '1 mês Pro grátis' },
  10: { type: 'free_month', value: 1, label: '1 mês Premium grátis' },
} as const;

export const COLORS = {
  primary: '#1A1A2E',
  secondary: '#E94560',
  accent: '#0F3460',
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#252542',
  text: '#FFFFFF',
  textMuted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export const DEFAULT_PASSWORD = 'Script@123';

export const EMERGENCY_TYPES = ['approach', 'objection', 'followup', 'close'] as const;

export const EMERGENCY_LABELS: Record<string, string> = {
  approach: 'Abordar',
  objection: 'Objeção',
  followup: 'Follow-up',
  close: 'Fechar',
};

export const EMERGENCY_ICONS: Record<string, string> = {
  approach: '👋',
  objection: '🛡️',
  followup: '🔄',
  close: '🎯',
};

export const TRAIL_SLUGS = [
  'abordagem-inicial',
  'ativacao-base',
  'qualificacao',
  'apresentacao-oferta',
  'follow-up',
  'contorno-objecao',
  'fechamento',
  'pos-venda',
] as const;
