import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ConfigTab } from '@/components/admin/bethel-forms/config-tab';
import { EnviosTab } from '@/components/admin/bethel-forms/envios-tab';
import { sugerirMapeamento } from '@/lib/bethel-forms/mapeamento';
import { CONFIG_VAZIA, type CampoDoFunil } from '@/lib/bethel-forms/tipos';
import { BUSINESS_ROLES, BUSINESS_TYPES, FATURAMENTO_OPTIONS, MAIN_CHALLENGES } from '@/lib/onboarding/options';

const lista = (textos: readonly string[], prefixo: string) => textos.map((t, i) => ({ valor: `${prefixo}${i}`, rotulo: t }));

// Funil cujas opções têm o MESMO nome das do 50 Scripts: a sugestão liga tudo sozinha.
const CAMPOS_IGUAIS: CampoDoFunil[] = [
  { id: 'f-nome', tipo: 'full_name', titulo: 'Nome completo', interno: false, opcoes: null },
  { id: 'f-fone', tipo: 'phone', titulo: 'WhatsApp', interno: false, opcoes: null },
  { id: 'f-email', tipo: 'email', titulo: 'E-mail', interno: false, opcoes: null },
  { id: 'f-nicho', tipo: 'nicho', titulo: 'Qual seu nicho?', interno: false, opcoes: lista(BUSINESS_TYPES, 'n') },
  { id: 'f-pos', tipo: 'posicao', titulo: 'Qual sua posição?', interno: false, opcoes: lista(BUSINESS_ROLES, 'p') },
  { id: 'f-fat', tipo: 'faturamento', titulo: 'Faturamento', interno: false, opcoes: lista(FATURAMENTO_OPTIONS, 'f') },
  { id: 'f-dor', tipo: 'dor', titulo: 'Qual sua maior dor?', interno: false, opcoes: lista(MAIN_CHALLENGES, 'd') },
];
// Mesmo funil, mas o faturamento tem opções com outros nomes.
const CAMPOS_DIFERENTES: CampoDoFunil[] = CAMPOS_IGUAIS.map((c) =>
  c.id === 'f-fat' ? { ...c, opcoes: [{ valor: 'x1', rotulo: 'Até dez mil' }, { valor: 'x2', rotulo: 'Mais de dez mil' }] } : c
);

const CATALOGO = [
  {
    id: 'e1',
    nome: 'Cleiton Querobin',
    grupos: [{ id: 'g1', nome: 'Grupo 3 - Low Ticket', funis: [{ id: 'fun1', nome: '50 Scripts para WhatsApp' }] }],
  },
];
const SUGESTAO = { especialistaId: 'e1', especialistaNome: 'Cleiton Querobin', grupoId: 'g1', grupoNome: 'Grupo 3 - Low Ticket', funilId: 'fun1', funilNome: '50 Scripts para WhatsApp' };

type Chamada = { url: string; method: string; body: any };
let chamadas: Chamada[];

function simularApi(campos: CampoDoFunil[], extra: Record<string, (c: Chamada) => unknown> = {}) {
  chamadas = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const c: Chamada = { url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body as string) : null };
      chamadas.push(c);
      const rota = Object.keys(extra).find((k) => url.startsWith(k) && (!k.includes('|') || true));
      const corpo = rota
        ? extra[rota](c)
        : url.startsWith('/api/admin/bethel-forms/config')
          ? c.method === 'PUT'
            ? { config: { ...CONFIG_VAZIA, motorId: 'motor-1', destino: c.body.destino, campos: {}, prioridadeDesafios: c.body.prioridadeDesafios }, motor: { status: 'published', criado: true } }
            : { config: CONFIG_VAZIA, formsConfigurado: true }
          : url.startsWith('/api/admin/bethel-forms/catalogo')
            ? { especialistas: CATALOGO, sugestao: SUGESTAO }
            : url.startsWith('/api/admin/bethel-forms/campos')
              ? { campos, sugestao: sugerirMapeamento(campos) }
              : {};
      return { ok: true, status: 200, json: async () => corpo };
    })
  );
}

beforeEach(() => vi.unstubAllGlobals());

describe('ConfigTab', () => {
  it('traz o funil 50 Scripts já escolhido e as perguntas já ligadas por tipo e por nome de opção; salva o que está na tela', async () => {
    simularApi(CAMPOS_IGUAIS);
    render(<ConfigTab />);

    await waitFor(() => expect(screen.getByText('Perguntas do 50 Scripts → campos do Forms')).toBeTruthy());
    expect(screen.getByLabelText('Funil').textContent).toContain('50 Scripts para WhatsApp');
    expect(screen.getByLabelText('Especialista').textContent).toContain('Cleiton Querobin');
    expect(screen.getByLabelText('Campo do Forms para Qual é o seu negócio?').textContent).toContain('Qual seu nicho?');
    expect(screen.getByText(`${BUSINESS_TYPES.length} de ${BUSINESS_TYPES.length} opções ligadas`)).toBeTruthy();
    expect(screen.queryByText('Falta resolver para salvar')).toBeNull();

    const salvar = screen.getByRole('button', { name: /Salvar configuração/ }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(false);
    fireEvent.click(salvar);

    await waitFor(() => expect(screen.getByText(/foi criada no funil do Forms/)).toBeTruthy());
    const put = chamadas.find((c) => c.method === 'PUT')!;
    expect(put.body.destino).toMatchObject({ funilId: 'fun1', especialistaId: 'e1', grupoId: 'g1' });
    expect(put.body.campos.business_type.alvoId).toBe('f-nicho');
    expect(Object.keys(put.body.campos.business_type.opcoes)).toHaveLength(BUSINESS_TYPES.length);
    expect(put.body.campos.main_challenges.alvoId).toBe('f-dor');
    expect(put.body.prioridadeDesafios).toEqual([...MAIN_CHALLENGES]);
  });

  it('opção sem destino: lista o que falta e BLOQUEIA o salvar; ligar a opção libera', async () => {
    simularApi(CAMPOS_DIFERENTES);
    render(<ConfigTab />);
    await waitFor(() => expect(screen.getByText('Falta resolver para salvar')).toBeTruthy());

    expect(screen.getByText(/"Faturamento mensal": falta ligar as 8 opções/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Salvar configuração/ }) as HTMLButtonElement).disabled).toBe(true);

    // liga as 8 opções do faturamento (cada Select abre e escolhe)
    for (const opcao of FATURAMENTO_OPTIONS) {
      fireEvent.click(screen.getByLabelText(`Opção do Forms para ${opcao}`));
      fireEvent.click(screen.getAllByText('Até dez mil').at(-1)!);
    }
    await waitFor(() => expect(screen.queryByText('Falta resolver para salvar')).toBeNull());
    expect((screen.getByRole('button', { name: /Salvar configuração/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('a prioridade dos desafios muda de ordem com as setas', async () => {
    simularApi(CAMPOS_IGUAIS);
    render(<ConfigTab />);
    await waitFor(() => expect(screen.getByText('Prioridade dos desafios')).toBeTruthy());

    fireEvent.click(screen.getByLabelText(`Subir ${MAIN_CHALLENGES[1]}`));
    fireEvent.click(screen.getByRole('button', { name: /Salvar configuração/ }));
    await waitFor(() => expect(chamadas.some((c) => c.method === 'PUT')).toBe(true));
    const put = chamadas.find((c) => c.method === 'PUT')!;
    expect(put.body.prioridadeDesafios.slice(0, 2)).toEqual([MAIN_CHALLENGES[1], MAIN_CHALLENGES[0]]);
  });

  it('o liga/desliga do envio ao vivo só funciona depois de salvar o destino', async () => {
    simularApi(CAMPOS_IGUAIS);
    render(<ConfigTab />);
    await waitFor(() => expect(screen.getByLabelText('Envio ao vivo ligado')).toBeTruthy());
    expect((screen.getByLabelText('Envio ao vivo ligado') as HTMLButtonElement).disabled).toBe(true);
  });

  it('mostra o erro do Forms (ex.: chave recusada) sem quebrar a tela', async () => {
    simularApi(CAMPOS_IGUAIS);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/admin/bethel-forms/config')) return { ok: true, status: 200, json: async () => ({ config: CONFIG_VAZIA, formsConfigurado: true }) };
      return { ok: false, status: 502, json: async () => ({ error: 'O Forms recusou a chave' }) };
    });
    render(<ConfigTab />);
    await waitFor(() => expect(screen.getByText('O Forms recusou a chave')).toBeTruthy());
  });
});

describe('EnviosTab', () => {
  const ENVIOS = [
    {
      id: 'env-1',
      user_id: 'u-1',
      external_id: 'scripts50:u-1',
      modo: 'retroativo',
      ocorrido_em: '2026-10-05T17:30:00.000Z',
      status: 'erro',
      tentativas: 2,
      resultado: null,
      http_status: 500,
      erro: 'Forms com erro (500).',
      payload: { respostas: { full_name: 'Maria' } },
      resposta: { error: 'boom' },
      forms_response_id: null,
      forms_lead_id: null,
      created_at: '2026-10-20T20:00:00.000Z',
      atualizado_em: '2026-10-20T20:00:00.000Z',
      enviado_em: null,
      profiles: { email: 'maria@email.com', full_name: 'Maria Souza' },
    },
  ];
  const CONTAGEM = { pendente: 3, enviando: 0, enviado: 10, aviso: 1, erro: 1 };

  it('lista com a data do preenchimento em Brasília, mostra o erro ao abrir e reenvia', async () => {
    simularApi([], {
      '/api/admin/bethel-forms/envios/env-1/reenviar': () => ({ status: 'enviado', envio: { ...ENVIOS[0], status: 'enviado' } }),
      '/api/admin/bethel-forms/envios': () => ({ envios: ENVIOS, total: 1, page: 1, contagem: CONTAGEM }),
    });
    render(<EnviosTab />);

    await waitFor(() => expect(screen.getByText('maria@email.com')).toBeTruthy());
    expect(screen.getByText('05/10/2026 14:30')).toBeTruthy(); // 17:30 UTC = 14:30 em Brasília
    expect(screen.getByText('Enviar pendentes (3)')).toBeTruthy();
    expect(screen.getByText('Reenviar os 1 com erro')).toBeTruthy();

    fireEvent.click(screen.getByText('Maria Souza'));
    expect(screen.getByText('Forms com erro (500).')).toBeTruthy();

    fireEvent.click(within(screen.getByText('Maria Souza').closest('tr')!).getByRole('button', { name: /Reenviar/ }));
    await waitFor(() => expect(chamadas.some((c) => c.url.endsWith('/envios/env-1/reenviar') && c.method === 'POST')).toBe(true));
    await waitFor(() => expect(screen.getByText('Reenviado: Enviado.')).toBeTruthy());
  });

  it('"Enviar pendentes" repete o lote até a fila zerar', async () => {
    let rodada = 0;
    simularApi([], {
      '/api/admin/bethel-forms/envios/processar': () => {
        rodada++;
        return rodada === 1 ? { processados: 2, enviados: 2, avisos: 0, erros: 0, restantes: 1 } : { processados: 1, enviados: 0, avisos: 1, erros: 0, restantes: 0 };
      },
      '/api/admin/bethel-forms/envios': () => ({ envios: [], total: 0, page: 1, contagem: CONTAGEM }),
    });
    render(<EnviosTab />);
    await waitFor(() => expect(screen.getByText('Enviar pendentes (3)')).toBeTruthy());

    fireEvent.click(screen.getByText('Enviar pendentes (3)'));
    await waitFor(() => expect(screen.getByText(/Pronto: 2 enviados, 1 com aviso, 0 com erro\./)).toBeTruthy());
    expect(chamadas.filter((c) => c.url.endsWith('/envios/processar'))).toHaveLength(2);
    expect(chamadas.find((c) => c.url.endsWith('/envios/processar'))!.body).toEqual({ reenfileirarErros: false });
  });
});
