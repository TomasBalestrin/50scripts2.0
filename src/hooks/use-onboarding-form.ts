'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  INITIAL_ONBOARDING_DATA,
  ONBOARDING_TOTAL_STEPS,
  getFieldErrors,
  isStepValid,
  type OnboardingField,
  type OnboardingFieldErrors,
  type OnboardingFormData,
} from '@/lib/onboarding/form';

/** Estado e ações do formulário de onboarding. As regras vivem em `lib/onboarding/form`. */
export function useOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = boas-vindas, 1..N = passos
  const [data, setData] = useState<OnboardingFormData>(INITIAL_ONBOARDING_DATA);
  const [touched, setTouched] = useState<ReadonlySet<OnboardingField>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback((fields: Partial<OnboardingFormData>) => {
    setData((prev) => ({ ...prev, ...fields }));
  }, []);

  const touch = useCallback((field: OnboardingField) => {
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  // Só mostra erro de campo que o usuário já tocou.
  const fieldErrors = useMemo(() => {
    const errors: OnboardingFieldErrors = {};
    for (const [field, message] of Object.entries(getFieldErrors(data))) {
      if (touched.has(field as OnboardingField)) errors[field as OnboardingField] = message;
    }
    return errors;
  }, [data, touched]);

  const goTo = useCallback((target: number) => {
    setStep(target);
    setError('');
  }, []);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.status === 401) throw new Error('Sessão expirada. Faça login novamente.');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Erro ao salvar dados');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [data, router]);

  return {
    step,
    totalSteps: ONBOARDING_TOTAL_STEPS,
    isLastStep: step === ONBOARDING_TOTAL_STEPS,
    canGoBack: step > 1,
    progressPercent: Math.round((step / ONBOARDING_TOTAL_STEPS) * 100),
    data,
    fieldErrors,
    error,
    isSubmitting,
    canAdvance: isStepValid(step, data),
    update,
    touch,
    start: () => goTo(1),
    next: () => goTo(Math.min(step + 1, ONBOARDING_TOTAL_STEPS)),
    back: () => goTo(Math.max(step - 1, 1)),
    submit,
  };
}
