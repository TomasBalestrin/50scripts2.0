'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { BUSINESS_TYPES, BUSINESS_ROLES, FATURAMENTO_OPTIONS } from '@/lib/constants';
import type { OnboardingFormData } from '@/app/(onboarding)/onboarding/page';

interface StepBusinessProps {
  data: OnboardingFormData;
  onChange: (fields: Partial<OnboardingFormData>) => void;
}

export function StepBusiness({ data, onChange }: StepBusinessProps) {
  return (
    <div className="space-y-4">
      {/* Nome da empresa */}
      <div className="space-y-2">
        <Label htmlFor="company_name" className="text-sm text-white">
          Nome da empresa
        </Label>
        <Input
          id="company_name"
          type="text"
          placeholder="Nome da sua empresa"
          value={data.company_name}
          onChange={(e) => onChange({ company_name: e.target.value })}
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>

      {/* Tipo de negócio */}
      <div className="space-y-2">
        <Label className="text-sm text-white">
          Qual é o seu negócio? <span className="text-red-400">*</span>
        </Label>
        <Select
          value={data.business_type}
          onValueChange={(value) =>
            onChange({
              business_type: value,
              business_type_custom: value !== 'Outros' ? '' : data.business_type_custom,
            })
          }
        >
          <SelectTrigger className="border-[#131B35] bg-[#131B35] text-white focus:border-[#1D4ED8] focus:ring-[#1D4ED8]">
            <SelectValue placeholder="Selecione seu tipo de negócio" />
          </SelectTrigger>
          <SelectContent className="border-[#131B35] bg-[#0A0F1E]">
            {BUSINESS_TYPES.map((type) => (
              <SelectItem
                key={type}
                value={type}
                className="text-white hover:bg-[#131B35]"
              >
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data.business_type === 'Outros' && (
          <Input
            type="text"
            placeholder="Descreva seu tipo de negócio"
            value={data.business_type_custom}
            onChange={(e) => onChange({ business_type_custom: e.target.value })}
            className="mt-2 border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
          />
        )}
      </div>

      {/* Função */}
      <div className="space-y-2">
        <Label className="text-sm text-white">Função no negócio</Label>
        <Select
          value={data.role_in_business}
          onValueChange={(value) => onChange({ role_in_business: value })}
        >
          <SelectTrigger className="border-[#131B35] bg-[#131B35] text-white focus:border-[#1D4ED8] focus:ring-[#1D4ED8]">
            <SelectValue placeholder="Selecione sua função" />
          </SelectTrigger>
          <SelectContent className="border-[#131B35] bg-[#0A0F1E]">
            {BUSINESS_ROLES.map((role) => (
              <SelectItem
                key={role}
                value={role}
                className="text-white hover:bg-[#131B35]"
              >
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Faturamento mensal */}
      <div className="space-y-2">
        <Label className="text-sm text-white">Faturamento mensal</Label>
        <Select
          value={data.faturamento_mensal}
          onValueChange={(value) => onChange({ faturamento_mensal: value })}
        >
          <SelectTrigger className="border-[#131B35] bg-[#131B35] text-white focus:border-[#1D4ED8] focus:ring-[#1D4ED8]">
            <SelectValue placeholder="Selecione sua faixa de faturamento" />
          </SelectTrigger>
          <SelectContent className="border-[#131B35] bg-[#0A0F1E]">
            {FATURAMENTO_OPTIONS.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className="text-white hover:bg-[#131B35]"
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ticket médio */}
      <div className="space-y-2">
        <Label htmlFor="average_ticket" className="text-sm text-white">
          Ticket médio
        </Label>
        <Input
          id="average_ticket"
          type="text"
          placeholder="Ex: R$ 500"
          value={data.average_ticket}
          onChange={(e) => onChange({ average_ticket: e.target.value })}
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>

      {/* Público-alvo */}
      <div className="space-y-2">
        <Label htmlFor="target_audience" className="text-sm text-white">
          Público-alvo
        </Label>
        <Input
          id="target_audience"
          type="text"
          placeholder="Quem é seu cliente ideal?"
          value={data.target_audience}
          onChange={(e) => onChange({ target_audience: e.target.value })}
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>

      {/* Principais objeções */}
      <div className="space-y-2">
        <Label htmlFor="main_objections" className="text-sm text-white">
          Principais objeções dos clientes
        </Label>
        <Textarea
          id="main_objections"
          placeholder="Quais as objeções mais comuns que você ouve?"
          value={data.main_objections}
          onChange={(e) => onChange({ main_objections: e.target.value })}
          className="border-[#131B35] bg-[#131B35] text-white placeholder:text-[#94A3B8]/50 focus:border-[#1D4ED8] focus:ring-[#1D4ED8] min-h-[80px]"
        />
      </div>
    </div>
  );
}
