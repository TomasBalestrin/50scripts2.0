'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tone } from '@/types/database';

const TOTAL_STEPS = 4;

const STYLE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  {
    value: 'formal',
    label: 'Formal',
    description: 'Linguagem profissional e estruturada',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Tom amigável e descontraído',
  },
  {
    value: 'direct',
    label: 'Direto',
    description: 'Objetivo, sem rodeios',
  },
];

const QUICK_WIN_SCRIPT = `Olá [Nome], tudo bem?

Vi que você [contexto do lead] e acredito que posso te ajudar com [benefício principal].

Temos uma solução que já ajudou [prova social] a [resultado específico].

Posso te mostrar como funciona em uma conversa rápida de 10 minutos?`;

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [preferredTone, setPreferredTone] = useState<Tone | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = (step / TOTAL_STEPS) * 100;

  const canAdvance = () => {
    switch (step) {
      case 1:
        return niche.trim().length >= 2;
      case 2:
        return difficulty.trim().length >= 2;
      case 3:
        return preferredTone !== null;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(QUICK_WIN_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard API not available
    }
  };

  const handleComplete = async () => {
    if (!user || !preferredTone) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          niche,
          preferred_tone: preferredTone,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push('/');
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#94A3B8]">
            Passo {step} de {TOTAL_STEPS}
          </span>
          <span className="text-sm text-[#94A3B8]">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-[#252542] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#E94560] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="border-[#252542] bg-[#1A1A2E] shadow-2xl">
        <CardContent className="p-6">
          {/* Step 1: Niche */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  Qual seu nicho?
                </h2>
                <p className="text-[#94A3B8]">
                  Isso nos ajuda a personalizar os scripts para seu mercado
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="niche" className="text-[#94A3B8]">
                  Seu nicho de atuação
                </Label>
                <Input
                  id="niche"
                  type="text"
                  placeholder="Ex: Imobiliário, SaaS, Seguros, Coaching..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="bg-[#0F0F1A] border-[#252542] text-white placeholder:text-[#4A4A6A] focus-visible:ring-[#E94560]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Difficulty */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  Qual sua maior dificuldade?
                </h2>
                <p className="text-[#94A3B8]">
                  Vamos focar no que mais importa para você
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-[#94A3B8]">
                  Sua maior dificuldade em vendas
                </Label>
                <Input
                  id="difficulty"
                  type="text"
                  placeholder="Ex: Abordagem inicial, contorno de objeções..."
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="bg-[#0F0F1A] border-[#252542] text-white placeholder:text-[#4A4A6A] focus-visible:ring-[#E94560]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Style */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  Qual seu estilo?
                </h2>
                <p className="text-[#94A3B8]">
                  Escolha o tom que mais combina com você
                </p>
              </div>
              <div className="grid gap-3">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPreferredTone(option.value)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      preferredTone === option.value
                        ? 'border-[#E94560] bg-[#E94560]/10'
                        : 'border-[#252542] bg-[#0F0F1A] hover:border-[#4A4A6A]'
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-white">
                      {option.label}
                    </h3>
                    <p className="text-sm text-[#94A3B8] mt-1">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Quick Win */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  Seu Quick Win!
                </h2>
                <p className="text-[#94A3B8]">
                  Aqui está um script recomendado para você começar agora mesmo
                </p>
              </div>
              <div className="bg-[#0F0F1A] border border-[#252542] rounded-lg p-4">
                <p className="text-sm text-[#94A3B8] mb-2 font-medium">
                  Script de Abordagem Inicial
                </p>
                <pre className="text-white text-sm whitespace-pre-wrap font-sans leading-relaxed">
                  {QUICK_WIN_SCRIPT}
                </pre>
              </div>
              <Button
                type="button"
                onClick={handleCopy}
                className="w-full h-14 text-lg font-bold bg-[#E94560] hover:bg-[#E94560]/90 text-white"
              >
                {copied ? 'COPIADO!' : 'COPIAR'}
              </Button>

              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="text-[#94A3B8] hover:text-white hover:bg-[#252542]"
              >
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className="bg-[#E94560] hover:bg-[#E94560]/90 text-white font-semibold disabled:opacity-40"
              >
                Próximo
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleComplete}
                disabled={loading}
                className="bg-[#0F3460] hover:bg-[#0F3460]/90 text-white font-semibold"
              >
                {loading ? 'Finalizando...' : 'Começar a usar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
