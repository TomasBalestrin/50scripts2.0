import { Plan, Level } from '@/types/database';

export const PLAN_HIERARCHY: Record<Plan, number> = {
  starter: 0,
  pro: 1,
  premium: 2,
  copilot: 3,
};

export const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  pro: 'Plus',
  premium: 'Pro',
  copilot: 'Premium',
};

export const PLAN_PRICES: Record<Plan, string> = {
  starter: 'Grátis',
  pro: 'R$ 19,90/mês',
  premium: 'R$ 39,90/mês',
  copilot: 'R$ 99,90/mês',
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
  3: { type: 'free_month', value: 1, label: '1 mês Plus grátis' },
  10: { type: 'free_month', value: 1, label: '1 mês Pro grátis' },
} as const;

export const COLORS = {
  primary: '#0A0F1E',
  secondary: '#1D4ED8',
  accent: '#3B82F6',
  background: '#020617',
  surface: '#0A0F1E',
  surfaceLight: '#131B35',
  text: '#FFFFFF',
  textMuted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// Generated passwords use crypto.randomBytes - see generateSecurePassword() in lib/auth-utils.ts

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

export const ALL_BADGES = [
  { type: 'first_script', name: 'Primeiro Script', icon: 'ScrollText', description: 'Use seu primeiro script' },
  { type: 'first_sale', name: 'Primeira Venda', icon: 'DollarSign', description: 'Registre sua primeira venda' },
  { type: 'streak_7', name: 'Semana de Fogo', icon: 'Flame', description: '7 dias seguidos de uso' },
  { type: 'streak_30', name: 'Mes Imparavel', icon: 'CalendarCheck', description: '30 dias seguidos de uso' },
  { type: 'scripts_50', name: 'Mestre dos Scripts', icon: 'BookOpen', description: 'Use 50 scripts diferentes' },
  { type: 'revenue_10k', name: 'Top 10K', icon: 'TrendingUp', description: 'Gere R$ 10.000 em vendas' },
  { type: 'all_trails', name: 'Explorador', icon: 'Map', description: 'Complete todas as trilhas' },
  { type: 'ai_10', name: 'AI Expert', icon: 'Bot', description: 'Gere 10 scripts com IA' },
  { type: 'referrals_5', name: 'Influenciador', icon: 'Users', description: 'Indique 5 amigos' },
] as const;

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
