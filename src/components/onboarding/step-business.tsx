'use client';

import {
  BUSINESS_ROLES,
  BUSINESS_TYPES,
  FATURAMENTO_OPTIONS,
} from '@/lib/onboarding/options';
import { SelectField, TextAreaField, TextField } from './fields';
import type { StepProps } from './step-props';

export function StepBusiness({ data, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <TextField
        id="company_name"
        label="Nome da empresa"
        placeholder="Nome da sua empresa"
        value={data.company_name}
        onChange={(company_name) => onChange({ company_name })}
      />
      <SelectField
        label="Qual é o seu negócio?"
        placeholder="Selecione seu tipo de negócio"
        options={BUSINESS_TYPES}
        value={data.business_type}
        onChange={(business_type) => onChange({ business_type })}
      />
      <SelectField
        label="Função no negócio"
        placeholder="Selecione sua função"
        options={BUSINESS_ROLES}
        value={data.role_in_business}
        onChange={(role_in_business) => onChange({ role_in_business })}
      />
      <SelectField
        label="Faturamento mensal"
        placeholder="Selecione sua faixa de faturamento"
        options={FATURAMENTO_OPTIONS}
        value={data.faturamento_mensal}
        onChange={(faturamento_mensal) => onChange({ faturamento_mensal })}
      />
      <TextField
        id="target_audience"
        label="Público-alvo"
        placeholder="Quem é seu cliente ideal?"
        value={data.target_audience}
        onChange={(target_audience) => onChange({ target_audience })}
      />
      <TextAreaField
        id="main_objections"
        label="Principais objeções dos clientes"
        placeholder="Quais as objeções mais comuns que você ouve?"
        value={data.main_objections}
        onChange={(main_objections) => onChange({ main_objections })}
      />
    </div>
  );
}
