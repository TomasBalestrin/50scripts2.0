// Domínio: onboarding — layout da planilha do Google Sheets.
// Dono ÚNICO das colunas: o append (onboarding novo) e o sync completo (admin)
// montam a linha por aqui, para o layout nunca divergir entre os dois.

import type { UserOnboarding } from '@/types/database';

type SheetSource = Partial<
  Pick<
    UserOnboarding,
    | 'full_name'
    | 'phone'
    | 'email'
    | 'instagram'
    | 'company_name'
    | 'business_type'
    | 'role_in_business'
    | 'faturamento_mensal'
    | 'average_ticket'
    | 'target_audience'
    | 'main_objections'
    | 'main_challenges'
    | 'has_partner'
    | 'time_knowing_cleiton'
  >
>;

/** Colunas entre "Data Cadastro" e as colunas só do sync ("Email da Conta", "Ativo"). */
export const ONBOARDING_SHEET_HEADER = [
  'Nome',
  'Telefone',
  'Email',
  'Instagram',
  'Empresa',
  'Tipo de Negócio',
  'Cargo',
  'Faturamento Mensal',
  'Ticket Médio',
  'Público-Alvo',
  'Principais Objeções',
  'Desafios',
  'Tem Sócio',
  'Tempo conhece Cleiton',
];

export function toOnboardingSheetCells(o: SheetSource): string[] {
  return [
    o.full_name ?? '',
    o.phone ?? '',
    o.email ?? '',
    o.instagram ?? '',
    o.company_name ?? '',
    o.business_type ?? '',
    o.role_in_business ?? '',
    o.faturamento_mensal ?? '',
    o.average_ticket ?? '',
    o.target_audience ?? '',
    o.main_objections ?? '',
    (o.main_challenges ?? []).join(', '),
    o.has_partner ? 'Sim' : 'Não',
    o.time_knowing_cleiton ?? '',
  ];
}
