'use client';

import { toggleItem } from '@/lib/onboarding/form';
import { MAIN_CHALLENGES, TIME_KNOWING_CLEITON_OPTIONS } from '@/lib/onboarding/options';
import { CheckboxGroupField, SelectField, YesNoField } from './fields';
import type { StepProps } from './step-props';

export function StepStrategic({ data, onChange }: StepProps) {
  return (
    <div className="space-y-5">
      <CheckboxGroupField
        label="Principais desafios"
        hint="Selecione todos que se aplicam"
        options={MAIN_CHALLENGES}
        value={data.main_challenges}
        onToggle={(challenge) =>
          onChange({ main_challenges: toggleItem(data.main_challenges, challenge) })
        }
      />
      <YesNoField
        label="Você tem sócio(a)?"
        value={data.has_partner}
        onChange={(has_partner) => onChange({ has_partner })}
      />
      <SelectField
        label="Há quanto tempo conhece o Cleiton?"
        placeholder="Selecione uma opção"
        options={TIME_KNOWING_CLEITON_OPTIONS}
        value={data.time_knowing_cleiton}
        onChange={(time_knowing_cleiton) => onChange({ time_knowing_cleiton })}
      />
    </div>
  );
}
