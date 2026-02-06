export type Plan = 'starter' | 'pro' | 'premium' | 'copilot';
export type Role = 'user' | 'admin';
export type Tone = 'formal' | 'casual' | 'direct';
export type Level = 'iniciante' | 'vendedor' | 'closer' | 'topseller' | 'elite';
export type LeadStage = 'novo' | 'abordado' | 'qualificado' | 'proposta' | 'fechado' | 'perdido';
export type AIPromptType = 'generation' | 'conversation' | 'analysis' | 'objection';
export type AILogType = 'generation' | 'conversation' | 'analysis';
export type WebhookEventType = 'purchase' | 'upgrade' | 'cancel';
export type TimeBlock = 'morning' | 'midday' | 'afternoon' | 'evening';
export type ActionType = 'approach' | 'followup' | 'proposal' | 'close';
export type ReferralStatus = 'pending' | 'converted' | 'rewarded';
export type RewardType = 'ai_credits' | 'free_month' | 'xp_bonus';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  plan: Plan;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  stripe_customer_id: string | null;
  is_active: boolean;
  role: Role;
  niche: string | null;
  preferred_tone: Tone;
  onboarding_completed: boolean;
  xp_points: number;
  level: Level;
  current_streak: number;
  longest_streak: number;
  ai_credits_remaining: number;
  ai_credits_monthly: number;
  saved_variables: Record<string, string>;
  push_subscription: Record<string, unknown> | null;
  notification_prefs: Record<string, boolean>;
  referral_code: string;
  referred_by: string | null;
  webhook_source: string | null;
  password_changed: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScriptCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  scripts_count?: number;
}

export interface Script {
  id: string;
  category_id: string;
  title: string;
  content: string;
  content_formal: string | null;
  content_direct: string | null;
  context_description: string;
  objection_keywords: string[];
  objection_embedding: number[] | null;
  audio_url: string | null;
  tags: string[];
  min_plan: Plan;
  is_ai_generated: boolean;
  generated_by_user_id: string | null;
  display_order: number;
  is_active: boolean;
  global_usage_count: number;
  global_effectiveness: number;
  global_conversion_rate: number;
  created_at: string;
  updated_at: string;
  category?: ScriptCategory;
}

export interface ScriptUsage {
  id: string;
  user_id: string;
  script_id: string;
  lead_id: string | null;
  tone_used: Tone | null;
  used_at: string;
  effectiveness_rating: number | null;
  resulted_in_sale: boolean | null;
  sale_value: number | null;
  feedback_note: string | null;
}

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  stage: LeadStage;
  expected_value: number | null;
  conversation_history: Array<{ date: string; text: string }>;
  notes: string | null;
  last_contact_at: string | null;
  next_followup_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  earned_at: string;
}

export interface DailyChallenge {
  id: string;
  user_id: string;
  challenge_date: string;
  challenge_type: string;
  target_count: number;
  current_count: number;
  completed: boolean;
  xp_reward: number;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code_used: string;
  status: ReferralStatus;
  reward_type: RewardType | null;
  reward_granted_at: string | null;
  created_at: string;
}

export interface MicrolearningTip {
  id: string;
  content: string;
  category: string | null;
  is_active: boolean;
  display_count: number;
  created_by: string;
  created_at: string;
}

export interface AIPrompt {
  id: string;
  name: string;
  type: AIPromptType;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AIGenerationLog {
  id: string;
  user_id: string;
  prompt_template_id: string;
  type: AILogType;
  input_context: Record<string, unknown>;
  generated_content: string;
  model_used: string;
  tokens_used: number;
  saved_as_script_id: string | null;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  source: string;
  event_type: WebhookEventType;
  payload: Record<string, unknown>;
  email_extracted: string;
  plan_granted: string | null;
  user_created: boolean;
  error_message: string | null;
  processed_at: string;
}

export interface UserCollection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface CollectionScript {
  collection_id: string;
  script_id: string;
  added_at: string;
}

export interface SalesAgenda {
  id: string;
  user_id: string;
  agenda_date: string;
  time_block: TimeBlock;
  action_type: ActionType;
  lead_id: string | null;
  suggested_script_id: string | null;
  completed: boolean;
  created_at: string;
}
