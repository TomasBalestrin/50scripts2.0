'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OnboardingFormData } from '@/app/(onboarding)/onboarding/page';

interface StepPersonalProps {
  data: OnboardingFormData;
  onChange: (fields: Partial<OnboardingFormData>) => void;
}

export function StepPersonal({ data, onChange }: StepPersonalProps) {
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
          Telefone (WhatsApp)
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(00) 00000-0000"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-white">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>

      {/* Instagram */}
      <div className="space-y-2">
        <Label htmlFor="instagram" className="text-sm text-white">
          Instagram
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
