import { Plan, Level, NewLevel } from '@/types/database';

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
  pro: 15,
  premium: 30,
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

// ============================================================
// Script Go - New Gamification System
// ============================================================

// Levels based on active days (not XP)
export const NEW_LEVEL_THRESHOLDS: Record<NewLevel, number> = {
  iniciante: 0,
  aprendiz: 3,
  executor: 7,
  estrategista: 14,
  especialista: 21,
  referencia: 30,
  lenda: 60,
};

export const NEW_LEVEL_LABELS: Record<NewLevel, string> = {
  iniciante: 'Iniciante',
  aprendiz: 'Aprendiz',
  executor: 'Executor',
  estrategista: 'Estrategista',
  especialista: 'Especialista',
  referencia: 'Referencia',
  lenda: 'LENDA',
};

export const NEW_LEVEL_ORDER: NewLevel[] = [
  'iniciante', 'aprendiz', 'executor', 'estrategista', 'especialista', 'referencia', 'lenda',
];

export const LEVEL_MOTIVATIONAL_MESSAGES: Partial<Record<NewLevel, string>> = {
  aprendiz: 'Parabeeeens! Você saiu da intenção e entrou no movimento. Agora transforme conhecimento em execução diária.',
  executor: 'Parabeeeens! Isso sim é consistência! Você não só começou, você manteve o ritmo. Quem executa todo dia, colhe resultado todo mês.',
  estrategista: 'Parabeeeens! Seu jogo mudou de nível. Você parou de reagir e começou a planejar cada conversa. É assim que se fecha mais com menos esforço.',
  especialista: 'Poucos chegam aqui. Você chegou. Sua abordagem já não é tentativa, é domínio. O mercado respeita quem domina o processo.',
  referencia: 'Parabeeeens! Seu nome já tem peso. Você virou o padrão que outros tentam copiar. Isso se chama autoridade e você construiu.',
  lenda: 'Parabeeeens! Isso não se explica. Se sente. Bem-vindo ao nível que pouquíssimos atingem. Agora você precisa sustentar isso.',
};

// Cyclic XP system (0-100, independent of levels)
export const CYCLIC_XP_VALUES = {
  LOGIN_DAILY: 10,
  COPY_SCRIPT: 2,
  GENERATE_PERSONALIZED: 5,
  REGISTER_SALE: 10,
} as const;

export const CYCLIC_XP_MAX = 100;
export const CYCLIC_XP_REWARD_SCRIPTS = 5;

// Streak system
export const STREAK_REWARD_INTERVAL = 2; // every 2 consecutive days
export const STREAK_REWARD_SCRIPTS = 5;

// Level up bonus
export const LEVEL_UP_BONUS_SCRIPTS = 10;

// Personalized scripts monthly base
export const BASE_MONTHLY_SCRIPTS = 20;

// Script copy cooldown (milliseconds)
export const SCRIPT_COPY_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

// Daily Missions
export const DAILY_MISSIONS_COUNT = 2;
export const MISSION_XP_REWARD = 20;

// ============================================================
// Script Go - Onboarding Options
// ============================================================

export const BUSINESS_TYPES = [
  'Saúde',
  'Marketing',
  'Estética',
  'Finanças',
  'Loja de roupas',
  'Comércio de produtos',
  'Engenharia e arquitetura',
  'Advocacia',
  'Corretor de imóveis',
  'Fotografia',
  'Mentorias e consultorias',
  'Outros',
] as const;

export const BUSINESS_ROLES = [
  'Dono',
  'Gerente',
  'Autônomo',
  'Colaborador',
  'Vendedor',
] as const;

export const MAIN_CHALLENGES = [
  'Atração de clientes',
  'Vendas',
  'Liderança',
  'Pensamento estratégico',
  'Processo comercial',
  'Outro',
] as const;

export const FATURAMENTO_OPTIONS = [
  'Até R$ 5.000,00',
  'De R$ 5.000,00 até R$ 10.000,00',
  'De R$ 10.000,00 até R$ 20.000,00',
  'De R$ 20.000,00 até R$ 50.000,00',
  'De R$ 50.000,00 até R$ 100.000,00',
  'De R$ 100.000,00 até R$ 250.000,00',
  'De R$ 250.000,00 até R$ 500.000,00',
  'De R$ 500.000,00 até R$ 1.000.000,00',
  'Acima de R$ 1.000.000,00',
] as const;

export const TIME_KNOWING_CLEITON_OPTIONS = [
  'Entre 1 a 3 semanas',
  'Entre 1 a 3 meses',
  'Entre 3 a 6 meses',
  'Entre 6 a 12 meses',
  'Acima de 1 ano',
] as const;

