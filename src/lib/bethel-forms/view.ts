// Domínio: bethel-forms — o que a tela "Configurar Bethel forms" mostra e as transições do RASCUNHO do mapeamento. PURO.
// Dono ÚNICO dos textos de status, cores e formatação de data (horário de Brasília) e de cada edição do rascunho (trocar o
// campo de uma pergunta, ligar uma opção): a tela só renderiza e chama estas funções, nunca monta objeto de configuração.
import {
  completarConfig,
  prioridadePadrao,
  sugerirOpcoes,
} from './mapeamento';
import { perguntaDe } from './perguntas';
import type {
  CampoDoFunil,
  ChavePergunta,
  ConfigBethelForms,
  DestinoForms,
  MapeamentoPergunta,
  StatusEnvio,
} from './tipos';

/** Valor do <Select> que significa "sem campo" (Radix não aceita value vazio). */
export const SEM_CAMPO = '__nenhum__';

export interface Rascunho {
  destino: DestinoForms | null;
  campos: ConfigBethelForms['campos'];
  prioridadeDesafios: string[];
}

export function rascunhoDaConfig(config: ConfigBethelForms): Rascunho {
  return {
    destino: config.destino,
    campos: config.campos,
    prioridadeDesafios: config.prioridadeDesafios.length > 0 ? config.prioridadeDesafios : prioridadePadrao(),
  };
}

/** O rascunho como uma configuração completa (tipo do campo e "tem opções" preenchidos a partir dos campos do funil). */
export function configDoRascunho(base: ConfigBethelForms, r: Rascunho, doFunil: CampoDoFunil[]): ConfigBethelForms {
  return completarConfig({ ...base, destino: r.destino, campos: r.campos, prioridadeDesafios: r.prioridadeDesafios }, doFunil);
}

/** Troca o campo do Forms de uma pergunta. As opções já ligadas são descartadas (eram de outro campo) e as de mesmo nome são sugeridas. */
export function definirAlvo(
  campos: ConfigBethelForms['campos'],
  chave: ChavePergunta,
  alvoId: string | null,
  doFunil: CampoDoFunil[]
): ConfigBethelForms['campos'] {
  const alvo = alvoId ? doFunil.find((c) => c.id === alvoId) : undefined;
  const pergunta = perguntaDe(chave);
  const novo: MapeamentoPergunta = alvo
    ? {
        alvoId: alvo.id,
        alvoTipo: alvo.tipo,
        alvoTemOpcoes: !!alvo.opcoes,
        opcoes: pergunta.tipo === 'escolha' && alvo.opcoes ? sugerirOpcoes(pergunta, alvo) : {},
      }
    : { alvoId: null, alvoTipo: null, alvoTemOpcoes: false, opcoes: {} };
  return { ...campos, [chave]: novo };
}

/** Liga (ou desliga, com ancora null) UMA opção do 50 Scripts a uma opção do campo do Forms. */
export function definirOpcao(
  campos: ConfigBethelForms['campos'],
  chave: ChavePergunta,
  opcao: string,
  ancora: string | null
): ConfigBethelForms['campos'] {
  const atual = campos[chave];
  if (!atual?.alvoId) return campos;
  const opcoes = { ...atual.opcoes };
  if (ancora) opcoes[opcao] = ancora;
  else delete opcoes[opcao];
  return { ...campos, [chave]: { ...atual, opcoes } };
}

/** Quantas opções da pergunta já têm destino, e quantas faltam — "3 de 17 ligadas". */
export function progressoDasOpcoes(chave: ChavePergunta, campos: ConfigBethelForms['campos']): { ligadas: number; total: number } {
  const pergunta = perguntaDe(chave);
  const m = campos[chave];
  return { ligadas: pergunta.opcoes.filter((o) => !!m?.opcoes[o]).length, total: pergunta.opcoes.length };
}

export function corDoStatus(status: StatusEnvio): string {
  switch (status) {
    case 'enviado':
      return 'border-green-800 bg-green-900/30 text-green-400';
    case 'aviso':
      return 'border-yellow-800 bg-yellow-900/30 text-yellow-400';
    case 'erro':
      return 'border-red-800 bg-red-900/30 text-red-400';
    case 'enviando':
      return 'border-blue-800 bg-blue-900/30 text-blue-400';
    default:
      return 'border-gray-700 bg-gray-800/30 text-gray-400';
  }
}

/** Data e hora no horário de Brasília, "20/10/2026 14:52". */
export function formatarDataBR(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d
    .toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(', ', ' ');
}
