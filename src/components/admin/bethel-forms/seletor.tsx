'use client';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface OpcaoSeletor {
  valor: string;
  rotulo: string;
}

interface Props {
  valor: string;
  opcoes: readonly OpcaoSeletor[];
  onChange: (valor: string) => void;
  placeholder?: string;
  ariaLabel: string;
  desabilitado?: boolean;
  className?: string;
}

/**
 * Select do admin que mostra o RÓTULO escolhido (o Select de components/ui mostra o próprio value, que aqui é um id) e
 * aceita desabilitar. Dono único deste markup nas telas do Bethel Forms.
 */
export function Seletor({ valor, opcoes, onChange, placeholder = 'Escolha', ariaLabel, desabilitado, className }: Props) {
  const escolhida = opcoes.find((o) => o.valor === valor);
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        disabled={desabilitado}
        className={cn('border-[#131B35] bg-[#131B35] text-white', className)}
      >
        <span className={cn('truncate text-left', !escolhida && 'text-gray-500')}>{escolhida?.rotulo ?? placeholder}</span>
      </SelectTrigger>
      <SelectContent className="border-[#131B35] bg-[#0A0F1E] text-white">
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor} className="hover:bg-[#131B35]">
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
