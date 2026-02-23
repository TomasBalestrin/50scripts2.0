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
  faturamento_mensal: string;
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
  faturamento_mensal: '',
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
  const [step, setStep] = useState(0); // 0 = intro, 1-3 = form steps
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

  const phoneDigits = formData.phone.replace(/\D/g, '').length;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const phoneValid = phoneDigits >= 10;
  const canAdvanceStep1 =
    formData.full_name.trim().length > 0 &&
    emailValid &&
    phoneValid &&
    formData.instagram.trim().length > 0;
  const canAdvanceStep2 =
    formData.company_name.trim().length > 0 &&
    formData.business_type.length > 0 &&
    formData.role_in_business.length > 0 &&
    formData.faturamento_mensal.length > 0 &&
    formData.target_audience.trim().length > 0 &&
    formData.main_objections.trim().length > 0;
  const canAdvanceStep3 =
    formData.main_challenges.length > 0 &&
    formData.time_knowing_cleiton.length > 0;

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
        setError('Sessão expirada. Faça login novamente.');
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

      router.push('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Intro screen
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1D4ED8]/10 border border-[#1D4ED8]/20">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">
            Bem-vindo ao Script Go!
          </h1>
          <p className="text-[#94A3B8] leading-relaxed">
            Antes de começar, precisamos conhecer um pouco sobre você e seu negócio.
            Essas informações são essenciais para personalizar seus scripts
            e oferecer a melhor experiência possível.
          </p>
        </div>

        <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20 text-xs font-bold text-[#3B82F6]">1</div>
            <div>
              <p className="text-sm font-medium text-white">Dados pessoais</p>
              <p className="text-xs text-[#94A3B8]">Seu nome, contato e redes sociais</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20 text-xs font-bold text-[#3B82F6]">2</div>
            <div>
              <p className="text-sm font-medium text-white">Sobre seu negócio</p>
              <p className="text-xs text-[#94A3B8]">Tipo de negócio, faturamento e público</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20 text-xs font-bold text-[#3B82F6]">3</div>
            <div>
              <p className="text-sm font-medium text-white">Estratégia e desafios</p>
              <p className="text-xs text-[#94A3B8]">Seus principais desafios e objetivos</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#94A3B8] text-center">
          Leva menos de 2 minutos para preencher
        </p>

        <Button
          type="button"
          className="w-full bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
          onClick={() => setStep(1)}
        >
          Começar
        </Button>
      </div>
    );
  }

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
          {step === 2 && 'Sobre seu negócio'}
          {step === 3 && 'Estratégia e desafios'}
        </h1>
        <p className="text-sm text-[#94A3B8]">
          {step === 1 && 'Informe seus dados de contato'}
          {step === 2 && 'Conte-nos sobre sua empresa e mercado'}
          {step === 3 && 'Seus desafios nos ajudam a personalizar seus scripts'}
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
            Próximo
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-40"
            onClick={handleSubmit}
            disabled={isSubmitting || !canAdvanceStep3}
          >
            {isSubmitting ? 'Salvando...' : 'Finalizar'}
          </Button>
        )}
      </div>
    </div>
  );
}
