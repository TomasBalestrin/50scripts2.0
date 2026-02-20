'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MAIN_CHALLENGES } from '@/lib/constants';
import type { OnboardingFormData } from '@/app/(onboarding)/onboarding/page';

interface StepStrategicProps {
  data: OnboardingFormData;
  onChange: (fields: Partial<OnboardingFormData>) => void;
}

export function StepStrategic({ data, onChange }: StepStrategicProps) {
  const toggleChallenge = (challenge: string) => {
    const current = data.main_challenges;
    if (current.includes(challenge)) {
      const updated = current.filter((c) => c !== challenge);
      onChange({
        main_challenges: updated,
        main_challenges_custom: challenge === 'Outro' ? '' : data.main_challenges_custom,
      });
    } else {
      onChange({ main_challenges: [...current, challenge] });
    }
  };

  return (
    <div className="space-y-5">
      {/* Principais desafios */}
      <div className="space-y-3">
        <Label className="text-sm text-white">Principais desafios</Label>
        <p className="text-xs text-[#94A3B8]">
          Selecione todos que se aplicam
        </p>
        <div className="space-y-2.5">
          {MAIN_CHALLENGES.map((challenge) => (
            <label
              key={challenge}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={data.main_challenges.includes(challenge)}
                onCheckedChange={() => toggleChallenge(challenge)}
                className="border-[#94A3B8]/30 data-[state=checked]:bg-[#1D4ED8] data-[state=checked]:border-[#1D4ED8]"
              />
              <span className="text-sm text-white group-hover:text-[#3B82F6] transition-colors">
                {challenge}
              </span>
            </label>
          ))}
        </div>

        {data.main_challenges.includes('Outro') && (
          <Input
            type="text"
            placeholder="Descreva seu desafio"
            value={data.main_challenges_custom}
            onChange={(e) =>
              onChange({ main_challenges_custom: e.target.value })
            }
            className="mt-2 border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
          />
        )}
      </div>

      {/* Tem socio */}
      <div className="space-y-2">
        <Label className="text-sm text-white">Voce tem socio(a)?</Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange({ has_partner: true })}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              data.has_partner
                ? 'border-[#1D4ED8] bg-[#1D4ED8]/10 text-[#3B82F6]'
                : 'border-[#131B35] bg-[#131B35] text-[#94A3B8] hover:border-[#94A3B8]/30'
            }`}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => onChange({ has_partner: false })}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              !data.has_partner
                ? 'border-[#1D4ED8] bg-[#1D4ED8]/10 text-[#3B82F6]'
                : 'border-[#131B35] bg-[#131B35] text-[#94A3B8] hover:border-[#94A3B8]/30'
            }`}
          >
            Nao
          </button>
        </div>
      </div>

      {/* Tempo conhecendo Cleiton */}
      <div className="space-y-2">
        <Label htmlFor="time_knowing_cleiton" className="text-sm text-white">
          Ha quanto tempo conhece o Cleiton?
        </Label>
        <Input
          id="time_knowing_cleiton"
          type="text"
          placeholder="Ex: 6 meses, 1 ano..."
          value={data.time_knowing_cleiton}
          onChange={(e) =>
            onChange({ time_knowing_cleiton: e.target.value })
          }
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>
    </div>
  );
}
