import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Banco em memória mínimo (select/insert/update com .eq/.lt/.or/.order/.limit/.maybeSingle/.single/count) — o bastante
// pra fila. `.or()` aqui só entende o filtro da fila ('pendente' ou 'enviando' abandonado).
const db: Record<string, any[]> = { bethel_forms_envios: [], user_onboarding: [], profiles: [] };
let seq = 0;
const AGORA = new Date('2026-10-20T20:00:00.000Z');

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: async () => ({
    from: (table: string) => {
      let op: 'select' | 'insert' | 'update' = 'select';
      let payload: any;
      let contar = false;
      let limite = Infinity;
      const filtros: ((r: any) => boolean)[] = [];
      const ordens: [string, boolean][] = [];
      const linhas = () => {
        let r = (db[table] ?? []).filter((x) => filtros.every((f) => f(x)));
        for (const [col, asc] of [...ordens].reverse()) r = [...r].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
        return r.slice(0, limite);
      };
      const exec = (single: boolean) => {
        if (op === 'insert') {
          const novo = { id: `id-${++seq}`, tentativas: 0, created_at: AGORA.toISOString(), atualizado_em: AGORA.toISOString(), ...payload };
          db[table].push(novo);
          return { data: single ? novo : [novo], error: null };
        }
        if (op === 'update') {
          const alvo = linhas();
          alvo.forEach((r) => Object.assign(r, payload));
          return { data: single ? alvo[0] ?? null : alvo, error: null };
        }
        const r = linhas();
        if (contar) return { data: null, count: r.length, error: null };
        return { data: single ? r[0] ?? null : r, error: null };
      };
      const b: any = {
        select: (_c?: string, o?: { head?: boolean }) => ((contar = !!o?.head), b),
        insert: (p: any) => ((op = 'insert'), (payload = p), b),
        update: (p: any) => ((op = 'update'), (payload = p), b),
        eq: (c: string, v: unknown) => (filtros.push((r) => r[c] === v), b),
        lt: (c: string, v: unknown) => (filtros.push((r) => r[c] < v), b),
        or: (_s: string) => {
          const corte = new Date(AGORA.getTime() - 5 * 60_000).toISOString();
          filtros.push((r) => r.status === 'pendente' || (r.status === 'enviando' && r.atualizado_em < corte));
          return b;
        },
        order: (c: string, o: { ascending: boolean }) => (ordens.push([c, o.ascending]), b),
        limit: (n: number) => ((limite = n), b),
        maybeSingle: () => Promise.resolve(exec(true)),
        single: () => Promise.resolve(exec(true)),
        then: (res: any) => res(exec(false)),
      };
      return b;
    },
  }),
}));

const configMock = vi.fn();
vi.mock('@/lib/bethel-forms/config', () => ({ lerConfig: () => configMock() }));
const enviarFormsMock = vi.fn();
vi.mock('@/lib/bethel-forms/cliente', () => ({ enviarRespostaAoForms: (e: any) => enviarFormsMock(e) }));

import { enviar, enfileirarEEnviarAoVivo, processarPendentes, reenfileirarErros } from '@/lib/bethel-forms/fila';
import { definirOpcao, rascunhoDaConfig } from '@/lib/bethel-forms/view';
import { completarConfig, prioridadePadrao, sugerirMapeamento } from '@/lib/bethel-forms/mapeamento';
import { CONFIG_VAZIA, type CampoDoFunil, type ConfigBethelForms } from '@/lib/bethel-forms/tipos';
import { BUSINESS_TYPES, MAIN_CHALLENGES, FATURAMENTO_OPTIONS, BUSINESS_ROLES, TIME_KNOWING_CLEITON_OPTIONS } from '@/lib/onboarding/options';

const CAMPOS: CampoDoFunil[] = [
  { id: 'f-nome', tipo: 'full_name', titulo: 'Nome', interno: false, opcoes: null },
  { id: 'f-email', tipo: 'email', titulo: 'E-mail', interno: false, opcoes: null },
  { id: 'f-nicho', tipo: 'nicho', titulo: 'Nicho', interno: false, opcoes: BUSINESS_TYPES.map((t, i) => ({ valor: `n${i}`, rotulo: t })) },
];

function config(over: Partial<ConfigBethelForms> = {}): ConfigBethelForms {
  return completarConfig(
    {
      ...CONFIG_VAZIA,
      ativo: true,
      motorId: 'motor-1',
      destino: { especialistaId: 'e', especialistaNome: 'C', grupoId: 'g', grupoNome: 'G', funilId: 'f', funilNome: 'F' },
      campos: sugerirMapeamento(CAMPOS),
      prioridadeDesafios: prioridadePadrao(),
      ...over,
    },
    CAMPOS
  );
}

const ONBOARDING = {
  user_id: 'u-1',
  full_name: 'Maria Souza',
  phone: '(49) 99912-3456',
  email: 'maria@email.com',
  instagram: '@maria',
  company_name: 'Clínica',
  business_type: BUSINESS_TYPES[0],
  role_in_business: BUSINESS_ROLES[0],
  faturamento_mensal: FATURAMENTO_OPTIONS[0],
  target_audience: 'x',
  main_objections: 'y',
  main_challenges: [MAIN_CHALLENGES[0]],
  has_partner: false,
  time_knowing_cleiton: TIME_KNOWING_CLEITON_OPTIONS[0],
  created_at: '2026-10-05T17:30:00.000Z',
};

function envio(over: Record<string, unknown> = {}) {
  const e = {
    id: `env-${++seq}`,
    user_id: 'u-1',
    external_id: 'scripts50:u-1',
    modo: 'retroativo',
    ocorrido_em: '2026-10-05T17:30:00.000Z',
    status: 'pendente',
    tentativas: 0,
    created_at: AGORA.toISOString(),
    atualizado_em: AGORA.toISOString(),
    ...over,
  };
  db.bethel_forms_envios.push(e);
  return e;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
  db.bethel_forms_envios = [];
  db.user_onboarding = [{ ...ONBOARDING }];
  db.profiles = [{ id: 'u-1', email: 'conta@email.com' }];
  seq = 0;
  configMock.mockReset().mockResolvedValue(config());
  enviarFormsMock.mockReset().mockResolvedValue({ chegou: true, httpStatus: 200, corpo: { ok: true, outcome: 'ok', responseId: '3f0c2b9e-6d0a-4a39-9d4a-0c1d2e3f4a5b', leadId: '7d1c0a52-1111-4222-8333-944455556666' } });
});
afterEach(() => vi.useRealTimers());

describe('enviar', () => {
  it('manda o envelope montado com o onboarding de agora, grava o resultado e conta a tentativa', async () => {
    const e = envio();
    expect(await enviar(e.id)).toEqual({ ok: true, status: 'enviado' });

    const enviado = enviarFormsMock.mock.calls[0][0];
    expect(enviado).toMatchObject({ motorId: 'motor-1', externalId: 'scripts50:u-1', modo: 'retroativo', ocorridoEm: '2026-10-05T17:30:00.000Z' });
    expect(enviado.contato.emailConta).toBe('conta@email.com');
    expect(enviado.respostas.business_type).toBe('n0');

    const linha = db.bethel_forms_envios[0];
    expect(linha).toMatchObject({ status: 'enviado', resultado: 'ok', http_status: 200, tentativas: 1, erro: null });
    expect(linha.forms_response_id).toBe('3f0c2b9e-6d0a-4a39-9d4a-0c1d2e3f4a5b');
    expect(linha.forms_lead_id).toBe('7d1c0a52-1111-4222-8333-944455556666');
    expect(linha.enviado_em).toEqual(expect.any(String));
    expect(linha.payload.respostas.full_name).toBe('Maria Souza');
  });

  it('200 sem lead vira aviso (não erro) e guarda o motivo', async () => {
    enviarFormsMock.mockResolvedValue({ chegou: true, httpStatus: 200, corpo: { ok: true, outcome: 'no_email' } });
    const e = envio();
    expect(await enviar(e.id)).toEqual({ ok: true, status: 'aviso' });
    expect(db.bethel_forms_envios[0]).toMatchObject({ status: 'aviso', resultado: 'no_email' });
    expect(db.bethel_forms_envios[0].erro).toMatch(/sem lead/);
  });

  it('Forms fora do ar: erro com mensagem, sem data de envio; dá pra reenviar e então passa', async () => {
    enviarFormsMock.mockResolvedValueOnce({ chegou: false, httpStatus: 0, corpo: null, falha: 'timeout' });
    const e = envio();
    expect(await enviar(e.id)).toEqual({ ok: true, status: 'erro' });
    expect(db.bethel_forms_envios[0]).toMatchObject({ status: 'erro', http_status: null, enviado_em: null, tentativas: 1 });
    expect(db.bethel_forms_envios[0].erro).toMatch(/timeout/);

    expect(await enviar(e.id)).toEqual({ ok: true, status: 'enviado' });
    expect(db.bethel_forms_envios[0].tentativas).toBe(2);
  });

  it('opção do onboarding sem destino na configuração: erro explicando, e NADA é mandado ao Forms', async () => {
    configMock.mockResolvedValue(config({ campos: definirOpcaoLivre() }));
    const e = envio();
    expect(await enviar(e.id)).toEqual({ ok: true, status: 'erro' });
    expect(enviarFormsMock).not.toHaveBeenCalled();
    expect(db.bethel_forms_envios[0].erro).toMatch(/não tem destino/);
  });

  it('usuário sem onboarding ou sem usuário: erro claro', async () => {
    db.user_onboarding = [];
    const e1 = envio();
    await enviar(e1.id);
    expect(db.bethel_forms_envios[0].erro).toMatch(/Onboarding/);

    const e2 = envio({ user_id: null });
    await enviar(e2.id);
    expect(db.bethel_forms_envios[1].erro).toMatch(/Usuário/);
    expect(enviarFormsMock).not.toHaveBeenCalled();
  });

  it('linha sendo enviada agora não é enviada de novo; a abandonada há mais de 5 min é', async () => {
    const recente = envio({ status: 'enviando', tentativas: 1 });
    expect(await enviar(recente.id)).toEqual({ ok: false, motivo: 'em_andamento' });

    const abandonada = envio({ status: 'enviando', tentativas: 1, atualizado_em: new Date(AGORA.getTime() - 6 * 60_000).toISOString() });
    expect(await enviar(abandonada.id)).toEqual({ ok: true, status: 'enviado' });
  });

  it('id inexistente', async () => {
    expect(await enviar('nao-existe')).toEqual({ ok: false, motivo: 'nao_encontrado' });
  });

  it('duas reservas ao mesmo tempo: só uma passa (versão = status + tentativas)', async () => {
    const e = envio();
    const [a, b] = await Promise.all([enviar(e.id), enviar(e.id)]);
    expect([a, b].filter((r) => r.ok)).toHaveLength(1);
    // quem perde vê a linha já reservada (em_andamento) ou perde a corrida da reserva (conflito)
    expect([a, b].some((r) => !r.ok && (r.motivo === 'conflito' || r.motivo === 'em_andamento'))).toBe(true);
    expect(enviarFormsMock).toHaveBeenCalledTimes(1);
  });
});

// opção do nicho SEM destino: o onboarding tem BUSINESS_TYPES[0] e a sugestão ligou todas — tira essa
function definirOpcaoLivre(): ConfigBethelForms['campos'] {
  return definirOpcao(sugerirMapeamento(CAMPOS), 'business_type', BUSINESS_TYPES[0], null);
}

describe('processarPendentes', () => {
  it('pega só os pendentes (o que já foi enviado fica como está)', async () => {
    db.user_onboarding = [];
    const nova = envio({ ocorrido_em: '2026-10-10T10:00:00.000Z' });
    const velha = envio({ ocorrido_em: '2026-10-01T10:00:00.000Z' });
    const feita = envio({ status: 'enviado', ocorrido_em: '2026-09-01T10:00:00.000Z' });
    // sem onboarding o envio vira erro — aqui só importa QUEM a fila pegou
    const resumo = await processarPendentes({ prazoMs: 60_000 });
    expect(resumo.processados).toBe(2);
    expect(resumo.restantes).toBe(0);
    expect(db.bethel_forms_envios.find((e) => e.id === feita.id)?.tentativas).toBe(0);
    expect(db.bethel_forms_envios.find((e) => e.id === velha.id)?.tentativas).toBe(1);
    expect(db.bethel_forms_envios.find((e) => e.id === nova.id)?.tentativas).toBe(1);
  });

  it('chama o Forms na ordem cronológica', async () => {
    for (const dia of ['10', '03', '07']) {
      db.user_onboarding.push({ ...ONBOARDING, user_id: `u-${dia}`, created_at: `2026-10-${dia}T10:00:00.000Z`, email: `m${dia}@email.com` });
      db.profiles.push({ id: `u-${dia}`, email: `c${dia}@email.com` });
      envio({ user_id: `u-${dia}`, external_id: `scripts50:u-${dia}`, ocorrido_em: `2026-10-${dia}T10:00:00.000Z` });
    }
    await processarPendentes({ prazoMs: 60_000 });
    expect(enviarFormsMock.mock.calls.map((c) => c[0].externalId)).toEqual(['scripts50:u-03', 'scripts50:u-07', 'scripts50:u-10']);
  });

  it('respeita o prazo: com o prazo estourado não manda nada e informa quantos restam', async () => {
    envio();
    envio();
    const resumo = await processarPendentes({ prazoMs: 0 });
    expect(resumo.processados).toBe(0);
    expect(resumo.restantes).toBe(2);
  });

  it('pega também o "enviando" abandonado', async () => {
    envio({ status: 'enviando', tentativas: 1, atualizado_em: new Date(AGORA.getTime() - 10 * 60_000).toISOString() });
    const resumo = await processarPendentes({ prazoMs: 60_000 });
    expect(resumo.processados).toBe(1);
  });
});

describe('reenfileirarErros', () => {
  it('devolve os erros pra fila (o cron respeita o limite de tentativas; "todos" não)', async () => {
    envio({ status: 'erro', tentativas: 1 });
    envio({ status: 'erro', tentativas: 5 });
    envio({ status: 'enviado' });
    expect(await reenfileirarErros()).toBe(1);
    expect(db.bethel_forms_envios.map((e) => e.status)).toEqual(['pendente', 'erro', 'enviado']);
    expect(await reenfileirarErros({ todos: true })).toBe(1);
    expect(db.bethel_forms_envios.map((e) => e.status)).toEqual(['pendente', 'pendente', 'enviado']);
  });
});

describe('enfileirarEEnviarAoVivo (gancho do onboarding)', () => {
  it('integração desligada: não grava nem envia nada', async () => {
    configMock.mockResolvedValue(config({ ativo: false }));
    await enfileirarEEnviarAoVivo('u-1');
    expect(db.bethel_forms_envios).toHaveLength(0);
    expect(enviarFormsMock).not.toHaveBeenCalled();
  });

  it('ligada: entra na fila como ao_vivo com a DATA DO PREENCHIMENTO e já envia', async () => {
    await enfileirarEEnviarAoVivo('u-1');
    expect(db.bethel_forms_envios).toHaveLength(1);
    expect(db.bethel_forms_envios[0]).toMatchObject({ modo: 'ao_vivo', ocorrido_em: '2026-10-05T17:30:00.000Z', status: 'enviado', external_id: 'scripts50:u-1' });
    expect(enviarFormsMock.mock.calls[0][0].modo).toBe('ao_vivo');
  });

  it('nunca lança: se a leitura da config falhar, o onboarding do lead segue', async () => {
    configMock.mockRejectedValue(new Error('banco fora'));
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(enfileirarEEnviarAoVivo('u-1')).resolves.toBeUndefined();
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });

  it('usuário sem onboarding gravado: não cria envio', async () => {
    db.user_onboarding = [];
    await enfileirarEEnviarAoVivo('u-1');
    expect(db.bethel_forms_envios).toHaveLength(0);
  });
});

// rascunhoDaConfig fica exportado pra tela; garante que aceita a config vazia
describe('rascunho', () => {
  it('config vazia vira rascunho com a prioridade padrão', () => {
    expect(rascunhoDaConfig(CONFIG_VAZIA).prioridadeDesafios).toEqual(prioridadePadrao());
  });
});
