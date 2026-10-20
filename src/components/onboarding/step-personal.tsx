'use client';

import { formatPhone } from '@/lib/onboarding/form';
import { TextField } from './fields';
import type { StepProps } from './step-props';

export function StepPersonal({ data, errors, onChange, onBlur }: StepProps) {
  return (
    <div className="space-y-4">
      <TextField
        id="full_name"
        label="Nome completo"
        placeholder="Seu nome completo"
        value={data.full_name}
        onChange={(full_name) => onChange({ full_name })}
      />
      <TextField
        id="phone"
        label="Telefone (WhatsApp)"
        type="tel"
        inputMode="numeric"
        placeholder="(00) 00000-0000"
        value={data.phone}
        error={errors.phone}
        onChange={(phone) => onChange({ phone: formatPhone(phone) })}
        onBlur={() => onBlur('phone')}
      />
      <TextField
        id="email"
        label="Email"
        type="email"
        placeholder="seu@email.com"
        value={data.email}
        error={errors.email}
        onChange={(email) => onChange({ email })}
        onBlur={() => onBlur('email')}
      />
      <TextField
        id="instagram"
        label="Instagram"
        placeholder="@seuinsta"
        value={data.instagram}
        onChange={(instagram) => onChange({ instagram })}
      />
    </div>
  );
}
