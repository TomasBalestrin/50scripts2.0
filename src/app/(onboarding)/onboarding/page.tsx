'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { StepPersonal } from '@/components/onboarding/step-personal';
import { StepBusiness } from '@/components/onboarding/step-business';
import { StepStrategic } from '@/components/onboarding/step-strategic';

export interface OnboardingFormData {
  // Step 1 - Personal
  full_name: string;
  phone: string;
  email: string;
  instagram: string;
  // Step 2 - Business
  company_name: string;
  business_type: string;
  business_type_custom: string;
  role_in_business: string;
  average_ticket: string;
  target_audience: string;
  main_objections: string;
  // Step 3 - Strategic
  main_challenges: string[];
  main_challenges_custom: string;
  has_partner: boolean;
  time_knowing_cleiton: string;
}

const INITIAL_DATA: OnboardingFormData = {
  full_name: '',
  phone: '',
  email: '',
  instagram: '',
  company_name: '',
  business_type: '',
  business_type_custom: '',
  role_in_business: '',
  average_ticket: '',
  target_audience: '',
  main_objections: '',
  main_challenges: [],
  main_challenges_custom: '',
  has_partner: false,
  time_knowing_cleiton: '',
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 3;

  const updateFormData = useCallback(
    (fields: Partial<OnboardingFormData>) => {
      setFormData((prev) => ({ ...prev, ...fields }));
    },
    []
  );

  const canAdvanceStep1 = formData.full_name.trim().length > 0;
  const canAdvanceStep2 = formData.business_type.length > 0;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((s) => s + 1);
      setError('');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Sessao expirada. Faca login novamente.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar dados');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#94A3B8]">
            Passo {step} de {totalSteps}
          </span>
          <span className="text-sm text-[#94A3B8]">
            {Math.round((step / totalSteps) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#131B35]">
          <div
            className="h-2 rounded-full bg-[#1D4ED8] transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-white">
          {step === 1 && 'Dados pessoais'}
          {step === 2 && 'Sobre seu negocio'}
          {step === 3 && 'Estrategia e desafios'}
        </h1>
        <p className="text-sm text-[#94A3B8]">
          Preencha para melhorar seus scripts e adequar a sua realidade
        </p>
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
        {step === 1 && (
          <StepPersonal data={formData} onChange={updateFormData} />
        )}
        {step === 2 && (
          <StepBusiness data={formData} onChange={updateFormData} />
        )}
        {step === 3 && (
          <StepStrategic data={formData} onChange={updateFormData} />
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-[#131B35] bg-transparent text-white hover:bg-[#131B35]"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Voltar
          </Button>
        )}

        {step < totalSteps ? (
          <Button
            type="button"
            className="flex-1 bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-40"
            onClick={handleNext}
            disabled={step === 1 ? !canAdvanceStep1 : !canAdvanceStep2}
          >
            Proximo
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-40"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Finalizar'}
          </Button>
        )}
      </div>
    </div>
  );
}
