// Domínio: bethel-forms — catálogo das perguntas do onboarding que podem ser relacionadas a um campo do Forms.
// Dono ÚNICO de "quais perguntas existem, de que TIPO são e quais opções têm": rótulos vêm de ONBOARDING_LABELS e as
// listas de opções de @/lib/onboarding/options (fontes da tela do lead) — mudou lá, muda aqui sem copiar texto.
// A chave de cada pergunta é o nome da coluna em user_onboarding, e vira o inboundKey do motor no Forms.
import { ONBOARDING_LABELS } from '@/lib/onboarding/form';
import {
  BUSINESS_ROLES,
  BUSINESS_TYPES,
  FATURAMENTO_OPTIONS,
  MAIN_CHALLENGES,
  TIME_KNOWING_CLEITON_OPTIONS,
} from '@/lib/onboarding/options';
import type { ChavePergunta } from './tipos';

export const SIM_NAO = ['Sim', 'Não'] as const;

export interface PerguntaDef {
  chave: ChavePergunta;
  rotulo: string;
  tipo: 'texto' | 'escolha';
  /** Opções que o lead pode marcar (vazio em pergunta de texto). */
  opcoes: readonly string[];
  /** Tipos de campo do Forms que a tela sugere como destino. */
  tiposSugeridos: readonly string[];
}

const texto = (chave: ChavePergunta, tiposSugeridos: readonly string[] = []): PerguntaDef => ({
  chave,
  rotulo: ONBOARDING_LABELS[chave],
  tipo: 'texto',
  opcoes: [],
  tiposSugeridos,
});

const escolha = (chave: ChavePergunta, opcoes: readonly string[], tiposSugeridos: readonly string[] = []): PerguntaDef => ({
  chave,
  rotulo: ONBOARDING_LABELS[chave],
  tipo: 'escolha',
  opcoes,
  tiposSugeridos,
});

export const PERGUNTAS: readonly PerguntaDef[] = [
  texto('full_name', ['full_name']),
  texto('phone', ['phone']),
  texto('email', ['email']),
  texto('instagram', ['instagram']),
  texto('company_name'),
  escolha('business_type', BUSINESS_TYPES, ['nicho']),
  escolha('role_in_business', BUSINESS_ROLES, ['posicao']),
  escolha('faturamento_mensal', FATURAMENTO_OPTIONS, ['faturamento']),
  texto('target_audience'),
  texto('main_objections'),
  escolha('main_challenges', MAIN_CHALLENGES, ['dor']),
  escolha('has_partner', SIM_NAO),
  escolha('time_knowing_cleiton', TIME_KNOWING_CLEITON_OPTIONS),
];

export function perguntaDe(chave: ChavePergunta): PerguntaDef {
  return PERGUNTAS.find((p) => p.chave === chave) as PerguntaDef;
}

/** Pergunta EXTRA que o motor do Forms sempre recebe (nunca é mapeada a um campo do funil): todos os desafios marcados,
 *  quando uma resposta antiga trouxe mais de um — só um deles vai pra Dor. */
export const CHAVE_DESAFIOS_MARCADOS = 'main_challenges_todos';
export const ROTULO_DESAFIOS_MARCADOS = 'Desafios marcados';

/** Lista que o PUT do motor recebe: as perguntas + a extra, cada uma com o alvo configurado. */
export function camposDoMotor(
  campos: Partial<Record<ChavePergunta, { alvoId: string | null }>>
): { chave: string; titulo: string; alvoId: string | null }[] {
  return [
    ...PERGUNTAS.map((p) => ({ chave: p.chave as string, titulo: p.rotulo, alvoId: campos[p.chave]?.alvoId ?? null })),
    { chave: CHAVE_DESAFIOS_MARCADOS, titulo: ROTULO_DESAFIOS_MARCADOS, alvoId: null },
  ];
}
