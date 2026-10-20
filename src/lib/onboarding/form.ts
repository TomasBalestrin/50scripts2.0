// Domínio: onboarding — regras do formulário (passos, validação, máscara).
// A UI só exibe; tudo que decide algo mora aqui. Validação vem do onboardingSchema
// (o mesmo que a API usa), então tela e servidor nunca divergem.

import { onboardingSchema } from '@/lib/validations/schemas';

export interface OnboardingFormData {
  full_name: string;
  phone: string;
  email: string;
  instagram: string;
  company_name: string;
  business_type: string;
  role_in_business: string;
  faturamento_mensal: string;
  target_audience: string;
  main_objections: string;
  main_challenges: string[];
  has_partner: boolean;
  time_knowing_cleiton: string;
}

export type OnboardingField = keyof OnboardingFormData;
export type OnboardingFieldErrors = Partial<Record<OnboardingField, string>>;

export const INITIAL_ONBOARDING_DATA: OnboardingFormData = {
  full_name: '',
  phone: '',
  email: '',
  instagram: '',
  company_name: '',
  business_type: '',
  role_in_business: '',
  faturamento_mensal: '',
  target_audience: '',
  main_objections: '',
  main_challenges: [],
  has_partner: false,
  time_knowing_cleiton: '',
};

export const ONBOARDING_STEPS = [
  {
    title: 'Dados pessoais',
    subtitle: 'Informe seus dados de contato',
    summary: 'Seu nome, contato e redes sociais',
    fields: ['full_name', 'phone', 'email', 'instagram'],
  },
  {
    title: 'Sobre seu negócio',
    subtitle: 'Conte-nos sobre sua empresa e mercado',
    summary: 'Tipo de negócio, faturamento e público',
    fields: [
      'company_name',
      'business_type',
      'role_in_business',
      'faturamento_mensal',
      'target_audience',
      'main_objections',
    ],
  },
  {
    title: 'Estratégia e desafios',
    subtitle: 'Seus desafios nos ajudam a personalizar seus scripts',
    summary: 'Seus principais desafios e objetivos',
    fields: ['main_challenges', 'has_partner', 'time_knowing_cleiton'],
  },
] as const satisfies ReadonlyArray<{
  title: string;
  subtitle: string;
  summary: string;
  fields: readonly OnboardingField[];
}>;

export const ONBOARDING_TOTAL_STEPS = ONBOARDING_STEPS.length;

/** Erros de validação por campo (primeira mensagem de cada). */
export function getFieldErrors(data: OnboardingFormData): OnboardingFieldErrors {
  const result = onboardingSchema.safeParse(data);
  if (result.success) return {};

  const errors: OnboardingFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as OnboardingField;
    if (!(field in errors)) errors[field] = issue.message;
  }
  return errors;
}

/** `step` é 1-based (0 é a tela de boas-vindas, que não tem campos). */
export function isStepValid(step: number, data: OnboardingFormData): boolean {
  const fields = ONBOARDING_STEPS[step - 1]?.fields ?? [];
  const errors = getFieldErrors(data);
  return fields.every((field) => !(field in errors));
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function toggleItem<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}
