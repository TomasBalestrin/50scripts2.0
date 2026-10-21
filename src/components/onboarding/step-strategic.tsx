'use client';

import { ONBOARDING_LABELS } from '@/lib/onboarding/form';
import { MAIN_CHALLENGES, TIME_KNOWING_CLEITON_OPTIONS } from '@/lib/onboarding/options';
import { SelectField, YesNoField } from './fields';
import type { StepProps } from './step-props';

export function StepStrategic({ data, onChange }: StepProps) {
  return (
    <div className="space-y-5">
      <SelectField
        label={ONBOARDING_LABELS.main_challenges}
        placeholder="Selecione seu principal desafio"
        options={MAIN_CHALLENGES}
        value={data.main_challenges[0] ?? ''}
        onChange={(challenge) => onChange({ main_challenges: [challenge] })}
      />
      <YesNoField
        label={ONBOARDING_LABELS.has_partner}
        value={data.has_partner}
        onChange={(has_partner) => onChange({ has_partner })}
      />
      <SelectField
        label={ONBOARDING_LABELS.time_knowing_cleiton}
        placeholder="Selecione uma opção"
        options={TIME_KNOWING_CLEITON_OPTIONS}
        value={data.time_knowing_cleiton}
        onChange={(time_knowing_cleiton) => onChange({ time_knowing_cleiton })}
      />
    </div>
  );
}
