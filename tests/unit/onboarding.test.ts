import { describe, it, expect } from 'vitest';
import {
  INITIAL_ONBOARDING_DATA,
  ONBOARDING_STEPS,
  formatPhone,
  isStepValid,
  type OnboardingFormData,
} from '@/lib/onboarding/form';
import {
  BUSINESS_ROLES,
  BUSINESS_TYPES,
  FATURAMENTO_OPTIONS,
  MAIN_CHALLENGES,
  TIME_KNOWING_CLEITON_OPTIONS,
} from '@/lib/onboarding/options';
import { ONBOARDING_SHEET_HEADER, toOnboardingSheetCells } from '@/lib/onboarding/sheet';
import { onboardingSchema } from '@/lib/validations/schemas';

const VALID: OnboardingFormData = {
  full_name: 'Maria Souza',
  phone: '(49) 99912-3456',
  email: 'maria@email.com',
  instagram: '@maria',
  company_name: 'Clínica Maria',
  business_type: BUSINESS_TYPES[0],
  role_in_business: BUSINESS_ROLES[0],
  faturamento_mensal: FATURAMENTO_OPTIONS[0],
  target_audience: 'Mulheres de 30 a 50 anos',
  main_objections: 'Preço',
  main_challenges: [MAIN_CHALLENGES[0]],
  has_partner: false,
  time_knowing_cleiton: TIME_KNOWING_CLEITON_OPTIONS[0],
};

describe('onboarding — validação por passo', () => {
  it('formulário vazio não avança nenhum passo', () => {
    for (let step = 1; step <= ONBOARDING_STEPS.length; step++) {
      expect(isStepValid(step, INITIAL_ONBOARDING_DATA)).toBe(false);
    }
  });

  it('dados completos passam em todos os passos', () => {
    for (let step = 1; step <= ONBOARDING_STEPS.length; step++) {
      expect(isStepValid(step, VALID)).toBe(true);
    }
  });

  it('cada passo só olha os próprios campos', () => {
    const soPasso1 = { ...INITIAL_ONBOARDING_DATA, ...VALID, company_name: '', main_challenges: [] };
    expect(isStepValid(1, soPasso1)).toBe(true);
    expect(isStepValid(2, soPasso1)).toBe(false);
    expect(isStepValid(3, soPasso1)).toBe(false);
  });

  it('exige telefone com DDD e email válido', () => {
    expect(isStepValid(1, { ...VALID, phone: '(49) 9991' })).toBe(false);
    expect(isStepValid(1, { ...VALID, email: 'maria@' })).toBe(false);
  });

  it('exige um desafio, e só um', () => {
    expect(isStepValid(3, { ...VALID, main_challenges: [] })).toBe(false);
    expect(isStepValid(3, { ...VALID, main_challenges: [MAIN_CHALLENGES[0], MAIN_CHALLENGES[1]] })).toBe(false);
  });
});

describe('onboarding — schema (API)', () => {
  it('aceita só valores das listas novas', () => {
    expect(onboardingSchema.safeParse(VALID).success).toBe(true);
  });

  it.each([
    ['business_type', 'Saúde'],
    ['business_type', 'Outros'],
    ['role_in_business', 'Autônomo'],
    ['faturamento_mensal', 'De R$ 5.000,00 até R$ 10.000,00'],
  ])('rejeita valor do modelo antigo em %s (%s)', (campo, valor) => {
    expect(onboardingSchema.safeParse({ ...VALID, [campo]: valor }).success).toBe(false);
  });

  it('rejeita mais de um desafio', () => {
    expect(onboardingSchema.safeParse({ ...VALID, main_challenges: [MAIN_CHALLENGES[0], MAIN_CHALLENGES[1]] }).success).toBe(false);
  });

  it('rejeita desafio do modelo antigo', () => {
    expect(onboardingSchema.safeParse({ ...VALID, main_challenges: ['Vendas'] }).success).toBe(false);
  });
});

describe('onboarding — helpers', () => {
  it('formatPhone aplica máscara e limita a 11 dígitos', () => {
    expect(formatPhone('49999123456')).toBe('(49) 99912-3456');
    expect(formatPhone('499991234567890')).toBe('(49) 99912-3456');
    expect(formatPhone('')).toBe('');
  });
});

describe('onboarding — layout da planilha', () => {
  it('linha tem uma célula por coluna do cabeçalho', () => {
    expect(toOnboardingSheetCells(VALID)).toHaveLength(ONBOARDING_SHEET_HEADER.length);
  });

  it('tolera campos ausentes (linhas antigas do banco)', () => {
    const cells = toOnboardingSheetCells({ full_name: 'Ana', main_challenges: undefined });
    expect(cells).toHaveLength(ONBOARDING_SHEET_HEADER.length);
    expect(cells[0]).toBe('Ana');
  });
});
