'use client';

import { Button } from '@/components/ui/button';
import { StepPersonal } from '@/components/onboarding/step-personal';
import { StepBusiness } from '@/components/onboarding/step-business';
import { StepStrategic } from '@/components/onboarding/step-strategic';
import { useOnboardingForm } from '@/hooks/use-onboarding-form';
import { ONBOARDING_STEPS } from '@/lib/onboarding/form';

const STEP_COMPONENTS = [StepPersonal, StepBusiness, StepStrategic];

export default function OnboardingPage() {
  const form = useOnboardingForm();
  const { step, totalSteps } = form;

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
          {ONBOARDING_STEPS.map(({ title, summary }, index) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20 text-xs font-bold text-[#3B82F6]">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-[#94A3B8]">{summary}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#94A3B8] text-center">
          Leva menos de 2 minutos para preencher
        </p>

        <Button
          type="button"
          className="w-full bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
          onClick={form.start}
        >
          Começar
        </Button>
      </div>
    );
  }

  const current = ONBOARDING_STEPS[step - 1];
  const CurrentStep = STEP_COMPONENTS[step - 1];

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#94A3B8]">
            Passo {step} de {totalSteps}
          </span>
          <span className="text-sm text-[#94A3B8]">
            {form.progressPercent}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#131B35]">
          <div
            className="h-2 rounded-full bg-[#1D4ED8] transition-all duration-300"
            style={{ width: `${form.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-white">{current.title}</h1>
        <p className="text-sm text-[#94A3B8]">{current.subtitle}</p>
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5">
        <CurrentStep
          data={form.data}
          errors={form.fieldErrors}
          onChange={form.update}
          onBlur={form.touch}
        />
      </div>

      {/* Error message */}
      {form.error && (
        <p className="text-sm text-red-400 text-center">{form.error}</p>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {form.canGoBack && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-[#131B35] bg-transparent text-white hover:bg-[#131B35]"
            onClick={form.back}
            disabled={form.isSubmitting}
          >
            Voltar
          </Button>
        )}

        {!form.isLastStep ? (
          <Button
            type="button"
            className="flex-1 bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-40"
            onClick={form.next}
            disabled={!form.canAdvance}
          >
            Próximo
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90 disabled:opacity-40"
            onClick={form.submit}
            disabled={form.isSubmitting || !form.canAdvance}
          >
            {form.isSubmitting ? 'Salvando...' : 'Finalizar'}
          </Button>
        )}
      </div>
    </div>
  );
}
