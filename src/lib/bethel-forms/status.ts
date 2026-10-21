// Domínio: bethel-forms — vocabulário e classificação do ENVIO: rótulo de status/modo/resultado e, dado o que o Forms
// respondeu, em que status o envio fica. PURO. Dono ÚNICO desses textos (a tela só exibe) e da regra "o que é erro":
//   · erro   — não chegou, ou o Forms recusou (chave, motor pausado, corpo inválido, 5xx, rede): dá pra reenviar;
//   · aviso  — o Forms respondeu 200 mas a resposta NÃO virou lead completo (sem contato, valor sem par, nada mapeado);
//   · enviado — a resposta está no funil (ok) ou foi atualizada (enriquecido).
import type { StatusEnvio, ModoEnvio } from './tipos';

export const ROTULO_STATUS: Record<StatusEnvio, string> = {
  pendente: 'Pendente',
  enviando: 'Enviando',
  enviado: 'Enviado',
  aviso: 'Enviado com aviso',
  erro: 'Erro',
};

export const ROTULO_MODO: Record<ModoEnvio, string> = {
  ao_vivo: 'Ao vivo',
  retroativo: 'Retroativo',
};

const AVISO_POR_RESULTADO: Record<string, string> = {
  no_email: 'A resposta entrou, mas sem e-mail nem telefone utilizável: ficou sem lead.',
  pendente_mapeamento: 'Algum valor não tem par no Forms: a resposta ficou retida e sem lead.',
  no_answers: 'Nenhuma pergunta está ligada a um campo do motor: nada foi gravado.',
  duplicado: 'O Forms já tinha processado este envio.',
  teste: 'O Forms tratou como aviso de teste.',
  fora_do_escopo: 'O Forms ignorou: fora do escopo do motor.',
};

export interface RespostaDoForms {
  /** false = não houve resposta HTTP (rede, timeout). */
  chegou: boolean;
  httpStatus: number;
  corpo: Record<string, unknown> | null;
  /** Mensagem de rede, quando não chegou. */
  falha?: string;
}

export interface Classificacao {
  status: StatusEnvio;
  resultado: string | null;
  erro: string | null;
}

function mensagemDoCorpo(corpo: Record<string, unknown> | null): string | null {
  const e = corpo?.error;
  return typeof e === 'string' && e ? e : null;
}

export function classificarResposta(r: RespostaDoForms): Classificacao {
  if (!r.chegou) {
    return { status: 'erro', resultado: null, erro: `Sem resposta do Forms: ${r.falha ?? 'falha de rede'}` };
  }

  const outcome = typeof r.corpo?.outcome === 'string' ? (r.corpo.outcome as string) : null;

  if (r.httpStatus >= 200 && r.httpStatus < 300) {
    if (outcome === 'ok' || outcome === 'enriquecido') return { status: 'enviado', resultado: outcome, erro: null };
    return {
      status: 'aviso',
      resultado: outcome,
      erro: (outcome && AVISO_POR_RESULTADO[outcome]) || `O Forms respondeu ${r.httpStatus} com resultado inesperado${outcome ? ` (${outcome})` : ''}.`,
    };
  }

  const detalhe = mensagemDoCorpo(r.corpo);
  const porStatus: Record<number, string> = {
    401: 'Chave do Forms recusada (confira BETHEL_FORMS_API_KEY nos dois sistemas).',
    403: 'Motor pausado no Forms: reative a entrada "50 Scripts — Onboarding".',
    404: 'Motor não encontrado no Forms: salve a configuração de novo.',
  };
  const base = porStatus[r.httpStatus] ?? (r.httpStatus >= 500 ? `Forms com erro (${r.httpStatus}).` : `Forms recusou o envio (${r.httpStatus}).`);
  return { status: 'erro', resultado: outcome, erro: detalhe && !porStatus[r.httpStatus] ? `${base} ${detalhe}` : base };
}
