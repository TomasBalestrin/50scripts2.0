// Domínio: bethel-forms — cliente HTTP do Bethel Forms. Dono ÚNICO das chamadas que saem deste sistema para o Forms
// (catálogo, campos do funil, "garantir motor" e o POST de respostas): o único arquivo que conhece a URL, a chave
// (BETHEL_FORMS_URL + BETHEL_FORMS_API_KEY — segredo de conta, vai em env; a escolha de funil e o mapeamento vão pro banco)
// e os caminhos /api/ingest/scripts50/*. NUNCA lança: rede caindo ou resposta torta viram { chegou:false } / { corpo:null },
// e quem chama (a fila, as rotas do admin) decide o que mostrar. Sem retry aqui — quem retenta é a fila.
import type { RespostaDoForms } from './status';
import type {
  CampoDoFunil,
  CatalogoEspecialista,
  CamposDoFunil,
  EnvelopeEnvio,
} from './tipos';

const TIMEOUT_MS = 25_000;

export function formsConfigurado(): boolean {
  return !!process.env.BETHEL_FORMS_URL && !!process.env.BETHEL_FORMS_API_KEY;
}

async function chamar(caminho: string, init: { method: 'GET' | 'PUT' | 'POST'; body?: unknown } = { method: 'GET' }): Promise<RespostaDoForms> {
  const base = (process.env.BETHEL_FORMS_URL ?? '').replace(/\/+$/, '');
  const chave = process.env.BETHEL_FORMS_API_KEY;
  if (!base || !chave) {
    return { chegou: false, httpStatus: 0, corpo: null, falha: 'BETHEL_FORMS_URL / BETHEL_FORMS_API_KEY não configuradas' };
  }
  try {
    const res = await fetch(`${base}/api/ingest/scripts50${caminho}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${chave}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    const corpo = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { chegou: true, httpStatus: res.status, corpo: corpo && typeof corpo === 'object' ? corpo : null };
  } catch (err) {
    return { chegou: false, httpStatus: 0, corpo: null, falha: err instanceof Error ? err.message : 'falha de rede' };
  }
}

/** Mensagem curta pro admin quando uma chamada de leitura/configuração não deu certo. */
export function mensagemDeFalha(r: RespostaDoForms): string {
  if (!r.chegou) return `Sem resposta do Forms: ${r.falha ?? 'falha de rede'}`;
  if (r.httpStatus === 401) return 'O Forms recusou a chave (confira BETHEL_FORMS_API_KEY nos dois sistemas).';
  const detalhe = typeof r.corpo?.error === 'string' ? r.corpo.error : null;
  return detalhe ?? `O Forms respondeu ${r.httpStatus}.`;
}

export type Leitura<T> = ({ ok: true } & T) | { ok: false; erro: string; httpStatus: number };

export async function buscarCatalogo(): Promise<Leitura<{ especialistas: CatalogoEspecialista[] }>> {
  const r = await chamar('/catalogo');
  if (r.httpStatus !== 200 || !Array.isArray(r.corpo?.especialistas)) return { ok: false, erro: mensagemDeFalha(r), httpStatus: r.httpStatus };
  return { ok: true, especialistas: r.corpo.especialistas as CatalogoEspecialista[] };
}

export async function buscarCampos(funnelId: string): Promise<Leitura<CamposDoFunil>> {
  const r = await chamar(`/funis/${encodeURIComponent(funnelId)}/campos`);
  if (r.httpStatus !== 200 || !Array.isArray(r.corpo?.campos)) return { ok: false, erro: mensagemDeFalha(r), httpStatus: r.httpStatus };
  return { ok: true, funnelId, formId: String(r.corpo.formId ?? ''), campos: r.corpo.campos as CampoDoFunil[] };
}

export interface MotorNoForms {
  motorId: string;
  /** 'published' = recebendo; outro valor = pausado no Forms. */
  status: string;
  criado: boolean;
}

export async function garantirMotorNoForms(
  funnelId: string,
  campos: { chave: string; titulo: string; alvoId: string | null }[]
): Promise<Leitura<MotorNoForms>> {
  const r = await chamar('/motor', { method: 'PUT', body: { funnelId, campos } });
  if (r.httpStatus !== 200 && r.httpStatus !== 201) return { ok: false, erro: mensagemDeFalha(r), httpStatus: r.httpStatus };
  return {
    ok: true,
    motorId: String(r.corpo?.motorId ?? ''),
    status: String(r.corpo?.status ?? ''),
    criado: r.corpo?.criado === true,
  };
}

export async function enviarRespostaAoForms(envelope: EnvelopeEnvio): Promise<RespostaDoForms> {
  return chamar('/respostas', { method: 'POST', body: envelope });
}
