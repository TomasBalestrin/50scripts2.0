// Domínio: bethel-forms — a FILA de envios (tabela bethel_forms_envios). Dono ÚNICO de: entrar na fila, montar o envio com
// o onboarding ATUAL, mandar ao Forms, gravar o que aconteceu e reenviar. Uma linha por envio (ao vivo ou retroativo); o
// retroativo é só INSERT de linhas 'pendente' (SQL avulso, fora do sistema) — quem manda é o mesmo `enviar` do ao vivo.
//
// Ordem: SEMPRE do `ocorrido_em` mais antigo pro mais novo (o histórico de estado e o first_seen do lead no Forms dependem
// disso). Reserva otimista (status + tentativas como versão): dois envios simultâneos da mesma linha não passam juntos, e uma
// linha 'enviando' há mais de 5 min é tratada como abandonada (a function morreu no meio) e volta a ser enviável.
// Reenviar monta o envelope DE NOVO com o onboarding e a configuração de agora — consertou o mapeamento, o reenvio já sai certo.
import { createAdminClient } from '@/lib/supabase/server';
import { lerConfig } from './config';
import { enviarRespostaAoForms } from './cliente';
import { externalIdDoUsuario, montarEnvio, type OnboardingParaEnvio } from './mapeamento';
import { classificarResposta } from './status';
import type { EnvioRow, ModoEnvio, StatusEnvio } from './tipos';

export const TABELA_ENVIOS = 'bethel_forms_envios';
const TRAVA_ENVIANDO_MS = 5 * 60_000;
export const MAX_TENTATIVAS_AUTOMATICAS = 5;

export type ResultadoEnviar =
  | { ok: true; status: StatusEnvio }
  | { ok: false; motivo: 'nao_encontrado' | 'em_andamento' | 'conflito' };

function ehUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function gravarFalha(envioId: string, erro: string, extra: Record<string, unknown> = {}) {
  const admin = await createAdminClient();
  await admin
    .from(TABELA_ENVIOS)
    .update({ status: 'erro', erro, atualizado_em: new Date().toISOString(), ...extra })
    .eq('id', envioId);
}

export async function enviar(envioId: string): Promise<ResultadoEnviar> {
  const admin = await createAdminClient();

  const { data: lido } = await admin.from(TABELA_ENVIOS).select('*').eq('id', envioId).maybeSingle();
  const envio = lido as EnvioRow | null;
  if (!envio) return { ok: false, motivo: 'nao_encontrado' };
  if (envio.status === 'enviando' && Date.now() - new Date(envio.atualizado_em).getTime() < TRAVA_ENVIANDO_MS) {
    return { ok: false, motivo: 'em_andamento' };
  }

  const agora = new Date().toISOString();
  const { data: reservado } = await admin
    .from(TABELA_ENVIOS)
    .update({ status: 'enviando', tentativas: envio.tentativas + 1, atualizado_em: agora })
    .eq('id', envioId)
    .eq('status', envio.status)
    .eq('tentativas', envio.tentativas)
    .select('id')
    .maybeSingle();
  if (!reservado) return { ok: false, motivo: 'conflito' };

  try {
    if (!envio.user_id) {
      await gravarFalha(envioId, 'Usuário não existe mais.');
      return { ok: true, status: 'erro' };
    }

    const config = await lerConfig();
    const [{ data: onboarding }, { data: perfil }] = await Promise.all([
      admin.from('user_onboarding').select('*').eq('user_id', envio.user_id).maybeSingle(),
      admin.from('profiles').select('email').eq('id', envio.user_id).maybeSingle(),
    ]);
    if (!onboarding) {
      await gravarFalha(envioId, 'Onboarding do usuário não encontrado.');
      return { ok: true, status: 'erro' };
    }

    const montagem = montarEnvio({
      userId: envio.user_id,
      modo: envio.modo,
      ocorridoEm: envio.ocorrido_em,
      onboarding: onboarding as OnboardingParaEnvio,
      emailConta: (perfil as { email?: string } | null)?.email ?? null,
      config,
    });
    if (!montagem.ok) {
      await gravarFalha(envioId, montagem.erro);
      return { ok: true, status: 'erro' };
    }

    const resposta = await enviarRespostaAoForms(montagem.envelope);
    const c = classificarResposta(resposta);
    const concluiu = c.status === 'enviado' || c.status === 'aviso';
    await admin
      .from(TABELA_ENVIOS)
      .update({
        status: c.status,
        resultado: c.resultado,
        http_status: resposta.chegou ? resposta.httpStatus : null,
        erro: c.erro,
        payload: montagem.envelope,
        resposta: resposta.corpo,
        forms_response_id: ehUuid(resposta.corpo?.responseId) ? resposta.corpo?.responseId : null,
        forms_lead_id: ehUuid(resposta.corpo?.leadId) ? resposta.corpo?.leadId : null,
        enviado_em: concluiu ? new Date().toISOString() : null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', envioId);
    return { ok: true, status: c.status };
  } catch (err) {
    await gravarFalha(envioId, `Falha inesperada ao enviar: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: true, status: 'erro' };
  }
}

/** Entra na fila e já tenta enviar — o gancho do onboarding (ao vivo). Nunca lança: o onboarding do lead não pode falhar por isto. */
export async function enfileirarEEnviarAoVivo(userId: string): Promise<void> {
  try {
    const config = await lerConfig();
    if (!config.ativo || !config.motorId) return;

    const admin = await createAdminClient();
    const { data: onboarding } = await admin.from('user_onboarding').select('created_at').eq('user_id', userId).maybeSingle();
    if (!onboarding) return;

    const modo: ModoEnvio = 'ao_vivo';
    const { data: novo } = await admin
      .from(TABELA_ENVIOS)
      .insert({
        user_id: userId,
        external_id: externalIdDoUsuario(userId),
        modo,
        ocorrido_em: (onboarding as { created_at: string }).created_at,
        status: 'pendente',
      })
      .select('id')
      .single();
    if (novo) await enviar((novo as { id: string }).id);
  } catch (err) {
    console.error('[bethel-forms] falha ao enfileirar/enviar o onboarding ao vivo:', err);
  }
}

/** Quem está na fila: 'pendente' e também o 'enviando' abandonado (a function morreu no meio). Filtro do PostgREST (.or). */
function filtroDaFila(): string {
  const corte = new Date(Date.now() - TRAVA_ENVIANDO_MS).toISOString();
  return `status.eq.pendente,and(status.eq.enviando,atualizado_em.lt.${corte})`;
}

export interface ResumoProcessamento {
  processados: number;
  enviados: number;
  avisos: number;
  erros: number;
  /** Ainda 'pendente' depois desta passada — a tela chama de novo até zerar. */
  restantes: number;
}

/** Volta pra 'pendente' os envios com erro (que ainda não passaram do limite automático, a menos que `todos`). */
export async function reenfileirarErros(opts: { todos?: boolean } = {}): Promise<number> {
  const admin = await createAdminClient();
  let q = admin.from(TABELA_ENVIOS).update({ status: 'pendente', atualizado_em: new Date().toISOString() }).eq('status', 'erro');
  if (!opts.todos) q = q.lt('tentativas', MAX_TENTATIVAS_AUTOMATICAS);
  const { data } = await q.select('id');
  return (data ?? []).length;
}

/** Manda os pendentes do mais antigo pro mais novo, um por vez, até acabar o prazo. */
export async function processarPendentes(opts: { prazoMs?: number; lote?: number } = {}): Promise<ResumoProcessamento> {
  const prazoMs = opts.prazoMs ?? 45_000;
  const lote = opts.lote ?? 200;
  const inicio = Date.now();
  const admin = await createAdminClient();

  const { data: fila } = await admin
    .from(TABELA_ENVIOS)
    .select('id')
    .or(filtroDaFila())
    .order('ocorrido_em', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(lote);

  const resumo: ResumoProcessamento = { processados: 0, enviados: 0, avisos: 0, erros: 0, restantes: 0 };
  for (const { id } of (fila as { id: string }[]) ?? []) {
    if (Date.now() - inicio >= prazoMs) break;
    const r = await enviar(id);
    if (!r.ok) continue;
    resumo.processados++;
    if (r.status === 'enviado') resumo.enviados++;
    else if (r.status === 'aviso') resumo.avisos++;
    else if (r.status === 'erro') resumo.erros++;
  }

  const { count } = await admin.from(TABELA_ENVIOS).select('id', { count: 'exact', head: true }).or(filtroDaFila());
  resumo.restantes = count ?? 0;
  return resumo;
}
