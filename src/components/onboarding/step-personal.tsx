'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OnboardingFormData } from '@/app/(onboarding)/onboarding/page';

interface StepPersonalProps {
  data: OnboardingFormData;
  onChange: (fields: Partial<OnboardingFormData>) => void;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPhoneDigits(phone: string): number {
  return phone.replace(/\D/g, '').length;
}

export function StepPersonal({ data, onChange }: StepPersonalProps) {
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const phoneDigits = getPhoneDigits(data.phone);
  const phoneError = phoneTouched && phoneDigits < 10;
  const emailError = emailTouched && !isValidEmail(data.email);

  return (
    <div className="space-y-4">
      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-sm text-white">
          Nome completo <span className="text-red-400">*</span>
        </Label>
        <Input
          id="full_name"
          type="text"
          placeholder="Seu nome completo"
          value={data.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>

      {/* Telefone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm text-white">
          Telefone (WhatsApp) <span className="text-red-400">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          placeholder="(00) 00000-0000"
          value={data.phone}
          onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
          onBlur={() => setPhoneTouched(true)}
          className={`border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8] ${phoneError ? 'border-red-500' : ''}`}
        />
        {phoneError && (
          <p className="text-xs text-red-400">Informe um telefone válido com DDD. Ex: (49) 99912-3456</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-white">
          Email <span className="text-red-400">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          onBlur={() => setEmailTouched(true)}
          className={`border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8] ${emailError ? 'border-red-500' : ''}`}
        />
        {emailError && (
          <p className="text-xs text-red-400">Informe um email válido. Ex: nome@email.com</p>
        )}
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <Label htmlFor="instagram" className="text-sm text-white">
          Instagram <span className="text-red-400">*</span>
        </Label>
        <Input
          id="instagram"
          type="text"
          placeholder="@seuinsta"
          value={data.instagram}
          onChange={(e) => onChange({ instagram: e.target.value })}
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>
    </div>
  );
}
