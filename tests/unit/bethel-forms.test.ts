import { describe, it, expect } from 'vitest';
import {
  CHAVE_DESAFIOS_MARCADOS,
  PERGUNTAS,
  camposDoMotor,
} from '@/lib/bethel-forms/perguntas';
import {
  completarConfig,
  externalIdDoUsuario,
  moverPrioridade,
  montarEnvio,
  normalizar,
  prioridadePadrao,
  sugerirDestino,
  sugerirMapeamento,
  validarConfig,
  type OnboardingParaEnvio,
} from '@/lib/bethel-forms/mapeamento';
import { classificarResposta } from '@/lib/bethel-forms/status';
import { configDoRascunho, definirAlvo, definirOpcao, formatarDataBR, progressoDasOpcoes, rascunhoDaConfig } from '@/lib/bethel-forms/view';
import { lerConfigDeValor } from '@/lib/bethel-forms/config';
import { CONFIG_VAZIA, type CampoDoFunil, type ConfigBethelForms } from '@/lib/bethel-forms/tipos';
import { INITIAL_ONBOARDING_DATA } from '@/lib/onboarding/form';
import { BUSINESS_TYPES, MAIN_CHALLENGES, FATURAMENTO_OPTIONS, BUSINESS_ROLES, TIME_KNOWING_CLEITON_OPTIONS } from '@/lib/onboarding/options';

// ———— Funil de teste: campos do formulário do Forms ————
const opcoesNicho = BUSINESS_TYPES.map((t, i) => ({ valor: `option_nicho_${i}`, rotulo: t }));
const CAMPOS: CampoDoFunil[] = [
  { id: 'f-nome', tipo: 'full_name', titulo: 'Nome completo', interno: false, opcoes: null },
  { id: 'f-fone', tipo: 'phone', titulo: 'WhatsApp', interno: false, opcoes: null },
  { id: 'f-email', tipo: 'email', titulo: 'E-mail', interno: false, opcoes: null },
  { id: 'f-insta', tipo: 'instagram', titulo: 'Instagram', interno: false, opcoes: null },
  { id: 'f-nicho', tipo: 'nicho', titulo: 'Qual seu nicho?', interno: false, opcoes: opcoesNicho },
  { id: 'f-dor', tipo: 'dor', titulo: 'Qual sua maior dor?', interno: false, opcoes: MAIN_CHALLENGES.map((t, i) => ({ valor: `option_dor_${i}`, rotulo: t })) },
  { id: 'f-faturamento', tipo: 'faturamento', titulo: 'Faturamento', interno: false, opcoes: [{ valor: 'fat_1', rotulo: 'Até 10 mil' }] },
  { id: 'f-texto', tipo: 'short_text', titulo: 'Observações', interno: false, opcoes: null },
];

const ONBOARDING: OnboardingParaEnvio = {
  ...(INITIAL_ONBOARDING_DATA as unknown as OnboardingParaEnvio),
  full_name: 'Maria Souza',
  phone: '(49) 99912-3456',
  email: 'maria@email.com',
  instagram: '@maria',
  company_name: 'Clínica Maria',
  business_type: BUSINESS_TYPES[2],
  role_in_business: BUSINESS_ROLES[0],
  faturamento_mensal: FATURAMENTO_OPTIONS[0],
  target_audience: 'Mulheres de 30 a 50 anos',
  main_objections: 'Preço',
  main_challenges: [MAIN_CHALLENGES[1]],
  has_partner: true,
  time_knowing_cleiton: TIME_KNOWING_CLEITON_OPTIONS[0],
};

/** Configuração sem pendência: o faturamento do Forms também tem as 8 opções ligadas. */
function configCompleta(over: Partial<ConfigBethelForms> = {}): ConfigBethelForms {
  let campos = configBase().campos;
  for (const o of FATURAMENTO_OPTIONS) campos = definirOpcao(campos, 'faturamento_mensal', o, 'fat_1');
  return configBase({ campos, ...over });
}

function configBase(over: Partial<ConfigBethelForms> = {}): ConfigBethelForms {
  const sug = sugerirMapeamento(CAMPOS);
  // completa as opções do nicho e da dor (o nome é igual ao do 50 Scripts)
  return completarConfig(
    {
      ...CONFIG_VAZIA,
      motorId: 'motor-1',
      destino: { especialistaId: 'e', especialistaNome: 'Cleiton', grupoId: 'g', grupoNome: 'Grupo 3', funilId: 'fun', funilNome: '50 Scripts para WhatsApp' },
      campos: sug,
      prioridadeDesafios: prioridadePadrao(),
      ...over,
    },
    CAMPOS
  );
}

describe('catálogo de perguntas', () => {
  it('cobre TODAS as perguntas do onboarding (pergunta nova na tela não pode ficar de fora do envio)', () => {
    expect(PERGUNTAS.map((p) => p.chave).sort()).toEqual(Object.keys(INITIAL_ONBOARDING_DATA).sort());
  });

  it('o motor do Forms recebe todas as perguntas + a extra dos desafios marcados, essa sempre sem campo', () => {
    const lista = camposDoMotor({ business_type: { alvoId: 'f-nicho' } });
    expect(lista).toHaveLength(PERGUNTAS.length + 1);
    expect(lista.find((c) => c.chave === 'business_type')?.alvoId).toBe('f-nicho');
    expect(lista.find((c) => c.chave === 'phone')?.alvoId).toBeNull();
    expect(lista.at(-1)).toMatchObject({ chave: CHAVE_DESAFIOS_MARCADOS, alvoId: null });
  });
});

describe('sugestões', () => {
  it('liga por tipo do campo e opção por nome igual, sem repetir campo', () => {
    const sug = sugerirMapeamento(CAMPOS);
    expect(sug.full_name?.alvoId).toBe('f-nome');
    expect(sug.phone?.alvoId).toBe('f-fone');
    expect(sug.email?.alvoId).toBe('f-email');
    expect(sug.business_type?.alvoId).toBe('f-nicho');
    expect(sug.business_type?.opcoes[BUSINESS_TYPES[2]]).toBe('option_nicho_2');
    expect(sug.main_challenges?.alvoId).toBe('f-dor');
    expect(sug.company_name).toBeUndefined();
    // faturamento do Forms só tem 1 opção com outro nome: campo ligado, nenhuma opção sugerida
    expect(sug.faturamento_mensal?.alvoId).toBe('f-faturamento');
    expect(sug.faturamento_mensal?.opcoes).toEqual({});
  });

  it('normalizar ignora acento, caixa e espaço sobrando', () => {
    expect(normalizar('  Saúde   (Clínicas) ')).toBe('saude (clinicas)');
  });

  it('sugere o funil 50 Scripts para WhatsApp do Cleiton', () => {
    const catalogo = [
      { id: 'e1', nome: 'Julia', grupos: [{ id: 'g1', nome: 'Grupo 3', funis: [{ id: 'f1', nome: '50 modelos de conteudos' }] }] },
      {
        id: 'e2',
        nome: 'Cleiton Querobin',
        grupos: [
          { id: 'g2', nome: 'Grupo 3 - Low Ticket', funis: [{ id: 'f2', nome: '50 Scripts' }, { id: 'f3', nome: '50 Scripts para WhatsApp' }] },
          { id: 'g3', nome: 'Grupo 4 - Sistemas', funis: [{ id: 'f4', nome: 'Script Go' }] },
        ],
      },
    ];
    expect(sugerirDestino(catalogo)).toMatchObject({ especialistaId: 'e2', grupoId: 'g2', funilId: 'f3', funilNome: '50 Scripts para WhatsApp' });
    expect(sugerirDestino([])).toBeNull();
  });

  it('moverPrioridade troca vizinhos sem mutar e ignora limites', () => {
    const base = ['a', 'b', 'c'];
    expect(moverPrioridade(base, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moverPrioridade(base, 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moverPrioridade(base, 0, -1)).toEqual(['a', 'b', 'c']);
    expect(base).toEqual(['a', 'b', 'c']);
  });
});

describe('validarConfig', () => {
  it('sem destino: pede o destino', () => {
    expect(validarConfig({ ...CONFIG_VAZIA, prioridadeDesafios: prioridadePadrao() }, CAMPOS)[0].mensagem).toMatch(/destino/);
  });

  it('opção sem destino barra o salvar e diz qual', () => {
    const config = configBase();
    const problemas = validarConfig(config, CAMPOS);
    expect(problemas.some((p) => p.chave === 'faturamento_mensal' && /falta ligar/.test(p.mensagem))).toBe(true)
    expect(problemas.some((p) => p.chave === 'business_type')).toBe(false); // nicho e dor casaram por nome
    expect(problemas.some((p) => p.chave === 'main_challenges')).toBe(false);
  });

  it('tudo ligado: sem problemas', () => {
    expect(validarConfig(configCompleta(), CAMPOS)).toEqual([]);
  });

  it('dois perguntas no mesmo campo, pergunta de texto em campo de escolha e campo que sumiu do funil são recusados', () => {
    const config = configBase();
    const campos = {
      ...config.campos,
      instagram: { alvoId: 'f-nome', alvoTipo: 'full_name', alvoTemOpcoes: false, opcoes: {} }, // repete o campo do nome
      company_name: { alvoId: 'f-nicho', alvoTipo: 'nicho', alvoTemOpcoes: true, opcoes: {} }, // texto em campo de escolha
      target_audience: { alvoId: 'f-sumiu', alvoTipo: null, alvoTemOpcoes: false, opcoes: {} },
    };
    const msgs = validarConfig(configBase({ campos }), CAMPOS).map((p) => p.mensagem).join('\n');
    expect(msgs).toMatch(/mesmo campo/);
    expect(msgs).toMatch(/texto livre/);
    expect(msgs).toMatch(/não existe mais/);
  });

  it('exige a prioridade com as 4 opções do desafio', () => {
    const problemas = validarConfig(configBase({ prioridadeDesafios: [MAIN_CHALLENGES[0]] }), CAMPOS);
    expect(problemas.some((p) => /prioridade/.test(p.mensagem))).toBe(true);
  });

  it('nenhuma pergunta ligada: pede pelo menos uma', () => {
    const problemas = validarConfig(configBase({ campos: {} }), CAMPOS);
    expect(problemas.some((p) => /pelo menos uma pergunta/.test(p.mensagem))).toBe(true);
  });
});

describe('montarEnvio', () => {
  const base = { userId: 'u-1', modo: 'retroativo' as const, ocorridoEm: '2026-10-05T17:30:00.000Z', emailConta: 'conta@email.com' };

  it('texto vai como texto; escolha vai como a ÂNCORA da opção do Forms; contato e id de origem saem prontos', () => {
    const r = montarEnvio({ ...base, onboarding: ONBOARDING, config: configCompleta() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.envelope).toMatchObject({
      motorId: 'motor-1',
      externalId: 'scripts50:u-1',
      modo: 'retroativo',
      ocorridoEm: '2026-10-05T17:30:00.000Z',
      contato: { nome: 'Maria Souza', telefone: '(49) 99912-3456', email: 'maria@email.com', emailConta: 'conta@email.com' },
    });
    expect(r.envelope.respostas.full_name).toBe('Maria Souza');
    expect(r.envelope.respostas.business_type).toBe('option_nicho_2');
    expect(r.envelope.respostas.main_challenges).toBe('option_dor_1');
    expect(r.envelope.respostas[CHAVE_DESAFIOS_MARCADOS]).toBeUndefined(); // 1 desafio só: nada extra
  });

  it('escolha cuja opção não tem destino vira erro, nunca o texto cru', () => {
    // faturamento ligado a um campo de escolha, sem nenhuma opção ligada
    const r = montarEnvio({ ...base, onboarding: ONBOARDING, config: configBase() });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro).toMatch(/Faturamento mensal/);
    expect(!r.ok && r.erro).toMatch(/não tem destino/);
  });

  it('escolha ligada a um campo de TEXTO vai como o texto da opção; pergunta sem campo também', () => {
    const config = configBase();
    const campos = {
      ...config.campos,
      faturamento_mensal: { alvoId: 'f-texto', alvoTipo: 'short_text', alvoTemOpcoes: false, opcoes: {} },
      has_partner: { alvoId: null, alvoTipo: null, alvoTemOpcoes: false, opcoes: {} },
    };
    const r = montarEnvio({ ...base, onboarding: ONBOARDING, config: configBase({ campos }) });
    expect(r.ok && r.envelope.respostas.faturamento_mensal).toBe(FATURAMENTO_OPTIONS[0]);
    expect(r.ok && r.envelope.respostas.has_partner).toBe('Sim');
  });

  it('resposta antiga com mais de um desafio: vale o de maior prioridade e todos vão no campo extra', () => {
    const multiplos = { ...ONBOARDING, main_challenges: [MAIN_CHALLENGES[3], MAIN_CHALLENGES[1]] };
    const comFat = configCompleta().campos;

    const padrao = montarEnvio({ ...base, onboarding: multiplos, config: configBase({ campos: comFat }) });
    expect(padrao.ok && padrao.envelope.respostas.main_challenges).toBe('option_dor_1'); // Converter vence Time
    expect(padrao.ok && padrao.envelope.respostas[CHAVE_DESAFIOS_MARCADOS]).toBe(`${MAIN_CHALLENGES[3]}, ${MAIN_CHALLENGES[1]}`);

    const invertida = montarEnvio({
      ...base,
      onboarding: multiplos,
      config: configBase({ campos: comFat, prioridadeDesafios: [...MAIN_CHALLENGES].reverse() }),
    });
    expect(invertida.ok && invertida.envelope.respostas.main_challenges).toBe('option_dor_3'); // Time vence Converter
  });

  it('campos vazios não viram resposta; sem e-mail da conta o contato leva null', () => {
    const comFat = configCompleta().campos;
    const r = montarEnvio({ ...base, emailConta: null, onboarding: { ...ONBOARDING, instagram: '  ', main_objections: '' }, config: configBase({ campos: comFat }) });
    expect(r.ok && Object.keys(r.envelope.respostas)).not.toContain('instagram');
    expect(r.ok && Object.keys(r.envelope.respostas)).not.toContain('main_objections');
    expect(r.ok && r.envelope.contato.emailConta).toBeNull();
  });

  it('sem motor/destino salvos: erro de configuração', () => {
    const r = montarEnvio({ ...base, onboarding: ONBOARDING, config: { ...CONFIG_VAZIA } });
    expect(r.ok).toBe(false);
  });

  it('externalId é estável por usuário (reenviar não duplica no Forms)', () => {
    expect(externalIdDoUsuario('abc')).toBe('scripts50:abc');
  });
});

describe('classificarResposta — o que é erro, aviso e enviado', () => {
  const ok = (corpo: Record<string, unknown>, httpStatus = 200) => classificarResposta({ chegou: true, httpStatus, corpo });

  it('ok e enriquecido = enviado', () => {
    expect(ok({ ok: true, outcome: 'ok' })).toMatchObject({ status: 'enviado', resultado: 'ok', erro: null });
    expect(ok({ ok: true, outcome: 'enriquecido' }).status).toBe('enviado');
  });

  it('200 que NÃO virou lead completo é aviso, com o motivo', () => {
    expect(ok({ outcome: 'no_email' })).toMatchObject({ status: 'aviso', resultado: 'no_email' });
    expect(ok({ outcome: 'no_email' }).erro).toMatch(/sem lead/);
    expect(ok({ outcome: 'pendente_mapeamento' }).status).toBe('aviso');
    expect(ok({ outcome: 'no_answers' }).status).toBe('aviso');
    expect(ok({ outcome: 'qualquer_coisa' }).status).toBe('aviso');
  });

  it('401, 403, 404, 422 e 5xx são erro, com mensagem útil', () => {
    expect(ok({ error: 'Token inválido' }, 401).erro).toMatch(/BETHEL_FORMS_API_KEY/);
    expect(ok({ error: 'Motor pausado' }, 403).erro).toMatch(/pausado/);
    expect(ok({ error: 'Motor não encontrado' }, 404).erro).toMatch(/salve a configuração/);
    expect(ok({ error: 'modo inválido' }, 422).erro).toMatch(/modo inválido/);
    expect(ok({ error: 'boom' }, 500)).toMatchObject({ status: 'erro' });
  });

  it('rede caindo é erro', () => {
    expect(classificarResposta({ chegou: false, httpStatus: 0, corpo: null, falha: 'timeout' })).toMatchObject({ status: 'erro', erro: 'Sem resposta do Forms: timeout' });
  });
});

describe('edição do rascunho (tela)', () => {
  it('trocar o campo descarta as opções antigas e sugere as de mesmo nome', () => {
    let campos = definirAlvo({}, 'business_type', 'f-nicho', CAMPOS);
    expect(Object.keys(campos.business_type!.opcoes)).toHaveLength(BUSINESS_TYPES.length);
    campos = definirAlvo(campos, 'business_type', 'f-texto', CAMPOS);
    expect(campos.business_type).toMatchObject({ alvoId: 'f-texto', alvoTemOpcoes: false, opcoes: {} });
    campos = definirAlvo(campos, 'business_type', null, CAMPOS);
    expect(campos.business_type).toMatchObject({ alvoId: null, opcoes: {} });
  });

  it('definirOpcao liga e desliga uma opção; sem campo escolhido não faz nada', () => {
    let campos = definirAlvo({}, 'faturamento_mensal', 'f-faturamento', CAMPOS);
    campos = definirOpcao(campos, 'faturamento_mensal', FATURAMENTO_OPTIONS[1], 'fat_1');
    expect(campos.faturamento_mensal?.opcoes[FATURAMENTO_OPTIONS[1]]).toBe('fat_1');
    expect(progressoDasOpcoes('faturamento_mensal', campos)).toEqual({ ligadas: 1, total: FATURAMENTO_OPTIONS.length });
    campos = definirOpcao(campos, 'faturamento_mensal', FATURAMENTO_OPTIONS[1], null);
    expect(progressoDasOpcoes('faturamento_mensal', campos).ligadas).toBe(0);
    expect(definirOpcao({}, 'faturamento_mensal', 'x', 'y')).toEqual({});
  });

  it('o rascunho vira configuração completa com o tipo do campo', () => {
    const rascunho = rascunhoDaConfig({ ...CONFIG_VAZIA });
    expect(rascunho.prioridadeDesafios).toEqual(prioridadePadrao());
    const config = configDoRascunho(CONFIG_VAZIA, { ...rascunho, campos: definirAlvo({}, 'business_type', 'f-nicho', CAMPOS) }, CAMPOS);
    expect(config.campos.business_type).toMatchObject({ alvoTipo: 'nicho', alvoTemOpcoes: true });
    expect(config.campos.phone).toMatchObject({ alvoId: null });
  });
});

describe('config e datas', () => {
  it('lerConfigDeValor aceita objeto, string JSON e lixo', () => {
    const c = configBase();
    expect(lerConfigDeValor(c).motorId).toBe('motor-1');
    expect(lerConfigDeValor(JSON.stringify(c)).motorId).toBe('motor-1');
    expect(lerConfigDeValor(null)).toMatchObject({ ativo: false, destino: null, prioridadeDesafios: prioridadePadrao() });
    expect(lerConfigDeValor('{quebrado')).toMatchObject({ ativo: false });
    expect(lerConfigDeValor([1, 2])).toMatchObject({ ativo: false });
  });

  it('data no horário de Brasília (UTC−3), nunca em UTC', () => {
    expect(formatarDataBR('2026-10-20T17:52:00.000Z')).toBe('20/10/2026 14:52');
    expect(formatarDataBR(null)).toBe('-');
    expect(formatarDataBR('lixo')).toBe('-');
  });
});
