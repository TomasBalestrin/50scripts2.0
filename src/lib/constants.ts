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
  aprendiz: 'Parabeeeens! Voce saiu da intencao e entrou no movimento. Agora transforme conhecimento em execucao diaria.',
  executor: 'Parabeeeens! Isso sim e consistencia! Voce nao so comecou, voce manteve o ritmo. Quem executa todo dia, colhe resultado todo mes.',
  estrategista: 'Parabeeeens! Seu jogo mudou de nivel. Voce parou de reagir e comecou a planejar cada conversa. E assim que se fecha mais com menos esforco.',
  especialista: 'Poucos chegam aqui. Voce chegou. Sua abordagem ja nao e tentativa, e dominio. O mercado respeita quem domina o processo.',
  referencia: 'Parabeeeens! Seu nome ja tem peso. Voce virou o padrao que outros tentam copiar. Isso se chama autoridade e voce construiu.',
  lenda: 'Parabeeeens! Isso nao se explica. Se sente. Bem-vindo ao nivel que pouquissimos atingem. Agora voce precisa sustentar isso.',
};

// Cyclic XP system (0-100, independent of levels)
export const CYCLIC_XP_VALUES = {
  LOGIN_DAILY: 10,
  COPY_SCRIPT: 5,
  GENERATE_PERSONALIZED: 10,
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

// ============================================================
// Script Go - Onboarding Options
// ============================================================

export const BUSINESS_TYPES = [
  'Saude',
  'Marketing',
  'Estetica',
  'Financas',
  'Loja de roupas',
  'Comercio de produtos',
  'Engenharia e arquitetura',
  'Advocacia',
  'Corretor de imoveis',
  'Fotografia',
  'Mentorias e consultorias',
  'Outros',
] as const;

export const BUSINESS_ROLES = [
  'Dono',
  'Gerente',
  'Autonomo',
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
  'Até R$ 5.000',
  'De R$ 5.000 até R$ 10.000',
  'De R$ 10.000 até R$ 15.000',
  'De R$ 15.000 até R$ 20.000',
  'De R$ 20.000 até R$ 50.000',
  'De R$ 50.000 até R$ 100.000',
  'De R$ 100.000 até R$ 500.000',
  'Acima de R$ 500.000',
] as const;

export const TIME_KNOWING_CLEITON_OPTIONS = [
  'Entre 1 a 3 semanas',
  'Entre 1 a 3 meses',
  'Entre 3 a 6 meses',
  'Entre 6 a 12 meses',
  'Acima de 1 ano',
] as const;

// ============================================================
// Script Go - 30 Tips (Gestao Dashboard)
// ============================================================

export const GESTAO_TIPS = [
  'Nao desista do seu cliente antes de 7 dias de follow up.',
  '30% da sua base ja esta pronta para comprar um produto mais caro.',
  'Um segredo da monetizacao e aumentar seu numero de ofertas.',
  'Um segredo da monetizacao e aumentar sua taxa de conversao.',
  'Um mentor pode aumentar seu resultado anual em 156%.',
  'Quem nao tem processo comercial nao tem previsibilidade — tem sorte.',
  'A maioria dos negocios nao cresce por falta de metodo, nao por falta de esforco.',
  'Cada R$1 investido em mentoria pode retornar ate R$10 em faturamento.',
  'Seu proximo cliente de alto valor ja esta na sua base — ele so precisa de uma oferta certa.',
  'Empreendedor fora de grupos de masterminds evolui 3x mais devagar.',
  '70% das vendas acontecem apos o quinto contato com o cliente.',
  'Processo comercial documentado reduz sua dependencia de talento e aumenta escala.',
  'IA no atendimento pode garantir ate 40% mais vendas.',
  'Quem domina o processo de vendas nunca depende de indicacao para faturar.',
  'O problema nao e o mercado estar dificil — e a sua oferta estar invisivel.',
  'Um mastermind certo custa menos que ficar com seu negocio estagnado.',
  'Previsibilidade de receita comeca com um processo comercial, nao com mais trafego.',
  'Subir o preco da sua oferta pode aumentar a percepcao de valor do cliente.',
  'Mentoria em grupo acelera porque voce aprende com o erro dos outros, nao so com o seu.',
  'O maior inimigo do seu faturamento e a falta de consistencia no processo comercial.',
  'Quem tem uma boa oferta e nao vende tem um problema de comunicacao, nao de produto.',
  'O follow up bem feito transforma silencio em venda.',
  'A maioria dos empreendedores nao tem problema de vendas — tem problema de posicionamento.',
  'Seu processo comercial precisa funcionar sem voce para o negocio escalar de verdade.',
  'Cada lead ignorado e receita que foi parar no concorrente.',
  'A automacao certa no atendimento pode trabalhar por voce 24 horas por dia.',
  'Quem nao mede resultado nao sabe o que melhorar.',
  'O cliente que sumiu nao disse nao — ele esta esperando o contato certo.',
  'Quem nao tem oferta de alto valor esta deixando dinheiro na mesa todo mes.',
  'O segredo do alto ticket nao e o preco — e a transformacao que voce entrega.',
] as const;
