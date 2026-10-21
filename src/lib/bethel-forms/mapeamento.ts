// Domínio: bethel-forms — o MAPEAMENTO: relaciona cada pergunta do onboarding (e cada opção dela) a um campo (e a uma opção)
// do formulário do funil de destino, e monta o envelope que o Forms recebe. PURO, zero I/O — a tela e a fila só chamam.
// Dono ÚNICO de três regras:
//   1. VALIDAR a configuração (nenhuma opção sem destino, nenhum campo recebendo duas perguntas...);
//   2. SUGERIR o mapeamento inicial (por tipo do campo; opção por nome igual) — o dono sempre pode mudar;
//   3. MONTAR o envio: texto vai como texto, escolha vai como a ÂNCORA da opção do Forms (é o que o estado e o dash
//      comparam), desafio com mais de um marcado (resposta antiga) vale o de maior prioridade.
// Opção sem destino NUNCA vai "do jeito que está": vira erro visível no envio, porque valor fora do vocabulário do Forms
// não casa com nenhuma condição de estado.
import type { UserOnboarding } from '@/types/database';
import { MAIN_CHALLENGES } from '@/lib/onboarding/options';
import {
  CHAVE_DESAFIOS_MARCADOS,
  PERGUNTAS,
  perguntaDe,
  SIM_NAO,
  type PerguntaDef,
} from './perguntas';
import type {
  CampoDoFunil,
  CatalogoEspecialista,
  ChavePergunta,
  ConfigBethelForms,
  DestinoForms,
  EnvelopeEnvio,
  MapeamentoPergunta,
  ModoEnvio,
} from './tipos';

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ———— 1. Validação ————

export interface ProblemaConfig {
  chave: ChavePergunta | null;
  mensagem: string;
}

export function prioridadePadrao(): string[] {
  return [...MAIN_CHALLENGES];
}

/** Confere a configuração contra os campos ATUAIS do funil de destino. Lista vazia = pode salvar. */
export function validarConfig(config: ConfigBethelForms, camposDoFunil: CampoDoFunil[]): ProblemaConfig[] {
  const problemas: ProblemaConfig[] = [];
  if (!config.destino) {
    return [{ chave: null, mensagem: 'Escolha o especialista, o grupo e o funil de destino.' }];
  }

  const porId = new Map(camposDoFunil.map((c) => [c.id, c]));
  const usados = new Map<string, ChavePergunta>();
  let ligadas = 0;

  for (const p of PERGUNTAS) {
    const m = config.campos[p.chave];
    if (!m?.alvoId) continue;
    ligadas++;

    const alvo = porId.get(m.alvoId);
    if (!alvo) {
      problemas.push({ chave: p.chave, mensagem: `"${p.rotulo}": o campo escolhido não existe mais neste funil.` });
      continue;
    }

    const outra = usados.get(m.alvoId);
    if (outra) {
      problemas.push({ chave: p.chave, mensagem: `"${p.rotulo}" e "${perguntaDe(outra).rotulo}" estão ligadas ao mesmo campo (${alvo.titulo}).` });
    }
    usados.set(m.alvoId, p.chave);

    if (!alvo.opcoes) continue; // campo de texto aceita qualquer pergunta (a opção vai como texto)

    if (p.tipo === 'texto') {
      problemas.push({ chave: p.chave, mensagem: `"${p.rotulo}" é de texto livre e não pode alimentar o campo de escolha "${alvo.titulo}".` });
      continue;
    }

    const ancoras = new Set(alvo.opcoes.map((o) => o.valor));
    const semDestino = p.opcoes.filter((o) => !m.opcoes[o] || !ancoras.has(m.opcoes[o]));
    if (semDestino.length > 0) {
      problemas.push({
        chave: p.chave,
        mensagem: `"${p.rotulo}": falta ligar ${semDestino.length === 1 ? 'a opção' : `as ${semDestino.length} opções`} ${semDestino.map((o) => `"${o}"`).join(', ')} a uma opção de "${alvo.titulo}".`,
      });
    }
  }

  if (ligadas === 0) problemas.push({ chave: null, mensagem: 'Ligue pelo menos uma pergunta a um campo do funil.' });

  const prioridade = config.prioridadeDesafios;
  if (prioridade.length !== MAIN_CHALLENGES.length || MAIN_CHALLENGES.some((d) => !prioridade.includes(d))) {
    problemas.push({ chave: 'main_challenges', mensagem: 'A ordem de prioridade dos desafios precisa ter as 4 opções.' });
  }

  return problemas;
}

/** Preenche o que a tela não manda (tipo do campo, se tem opções) a partir do catálogo e limpa opção de pergunta sem alvo. */
export function completarConfig(config: ConfigBethelForms, camposDoFunil: CampoDoFunil[]): ConfigBethelForms {
  const porId = new Map(camposDoFunil.map((c) => [c.id, c]));
  const campos: ConfigBethelForms['campos'] = {};
  for (const p of PERGUNTAS) {
    const m = config.campos[p.chave];
    if (!m?.alvoId) {
      campos[p.chave] = { alvoId: null, alvoTipo: null, alvoTemOpcoes: false, opcoes: {} };
      continue;
    }
    const alvo = porId.get(m.alvoId);
    campos[p.chave] = {
      alvoId: m.alvoId,
      alvoTipo: alvo?.tipo ?? null,
      alvoTemOpcoes: !!alvo?.opcoes,
      opcoes: alvo?.opcoes ? m.opcoes : {},
    };
  }
  return { ...config, campos };
}

// ———— 2. Sugestões ————

/** Mapeamento inicial: campo por TIPO (nome→full_name, nicho→negócio...), opção por nome igual. Nunca repete um campo. */
export function sugerirMapeamento(camposDoFunil: CampoDoFunil[]): Partial<Record<ChavePergunta, MapeamentoPergunta>> {
  const out: Partial<Record<ChavePergunta, MapeamentoPergunta>> = {};
  const usados = new Set<string>();

  for (const p of PERGUNTAS) {
    const alvo = camposDoFunil.find((c) => !c.interno && !usados.has(c.id) && p.tiposSugeridos.includes(c.tipo));
    if (!alvo) continue;
    usados.add(alvo.id);
    out[p.chave] = {
      alvoId: alvo.id,
      alvoTipo: alvo.tipo,
      alvoTemOpcoes: !!alvo.opcoes,
      opcoes: p.tipo === 'escolha' && alvo.opcoes ? sugerirOpcoes(p, alvo) : {},
    };
  }
  return out;
}

/** Opção do 50 Scripts → âncora da opção do Forms de MESMO nome (sem acento, caixa e espaço extra). Só as que casam. */
export function sugerirOpcoes(p: PerguntaDef, alvo: CampoDoFunil): Record<string, string> {
  const porNome = new Map<string, string>();
  for (const o of alvo.opcoes ?? []) {
    porNome.set(normalizar(o.rotulo), o.valor);
    porNome.set(normalizar(o.valor), o.valor);
  }
  const opcoes: Record<string, string> = {};
  for (const opcao of p.opcoes) {
    const achada = porNome.get(normalizar(opcao));
    if (achada) opcoes[opcao] = achada;
  }
  return opcoes;
}

/** Destino que a tela já traz selecionado: o funil "50 Scripts…" (de preferência o do WhatsApp). null = nenhum se parece. */
export function sugerirDestino(catalogo: CatalogoEspecialista[]): DestinoForms | null {
  let melhor: { destino: DestinoForms; pontos: number } | null = null;
  for (const e of catalogo) {
    for (const g of e.grupos) {
      for (const f of g.funis) {
        const nome = normalizar(f.nome);
        if (!/50 ?scripts?/.test(nome)) continue;
        const pontos = 1 + (nome.includes('whatsapp') ? 2 : 0) + (normalizar(e.nome).includes('cleiton') ? 1 : 0);
        if (!melhor || pontos > melhor.pontos) {
          melhor = {
            pontos,
            destino: { especialistaId: e.id, especialistaNome: e.nome, grupoId: g.id, grupoNome: g.nome, funilId: f.id, funilNome: f.nome },
          };
        }
      }
    }
  }
  return melhor?.destino ?? null;
}

/** Troca dois vizinhos da lista de prioridade (setas ↑↓ da tela). Imutável. */
export function moverPrioridade(lista: readonly string[], indice: number, direcao: -1 | 1): string[] {
  const alvo = indice + direcao;
  if (indice < 0 || indice >= lista.length || alvo < 0 || alvo >= lista.length) return [...lista];
  const nova = [...lista];
  [nova[indice], nova[alvo]] = [nova[alvo], nova[indice]];
  return nova;
}

// ———— 3. Montagem do envio ————

export type OnboardingParaEnvio = Pick<
  UserOnboarding,
  | 'full_name'
  | 'phone'
  | 'email'
  | 'instagram'
  | 'company_name'
  | 'business_type'
  | 'role_in_business'
  | 'faturamento_mensal'
  | 'target_audience'
  | 'main_objections'
  | 'main_challenges'
  | 'has_partner'
  | 'time_knowing_cleiton'
>;

export type ResultadoMontagem = { ok: true; envelope: EnvelopeEnvio } | { ok: false; erro: string };

export function externalIdDoUsuario(userId: string): string {
  return `scripts50:${userId}`;
}

/** O valor (texto) que o lead escolheu numa pergunta de escolha — desafio com vários marcados vale o de maior prioridade. */
function valorEscolhido(chave: ChavePergunta, o: OnboardingParaEnvio, prioridade: readonly string[]): string | null {
  if (chave === 'has_partner') return o.has_partner ? SIM_NAO[0] : SIM_NAO[1];
  if (chave === 'main_challenges') {
    const marcados = (o.main_challenges ?? []).filter(Boolean);
    if (marcados.length === 0) return null;
    const rank = (d: string) => {
      const i = prioridade.indexOf(d);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...marcados].sort((a, b) => rank(a) - rank(b))[0];
  }
  const v = (o as unknown as Record<string, unknown>)[chave];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function valorDeTexto(chave: ChavePergunta, o: OnboardingParaEnvio): string | null {
  const v = (o as unknown as Record<string, unknown>)[chave];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

export function montarEnvio(input: {
  userId: string;
  modo: ModoEnvio;
  ocorridoEm: string;
  onboarding: OnboardingParaEnvio;
  emailConta: string | null;
  config: ConfigBethelForms;
}): ResultadoMontagem {
  const { config, onboarding: o } = input;
  if (!config.motorId || !config.destino) return { ok: false, erro: 'Envio ainda não configurado (falta salvar o destino).' };

  const respostas: Record<string, string> = {};

  for (const p of PERGUNTAS) {
    const m = config.campos[p.chave];
    const valor = p.tipo === 'texto' ? valorDeTexto(p.chave, o) : valorEscolhido(p.chave, o, config.prioridadeDesafios);
    if (valor === null) continue;

    if (p.tipo === 'escolha' && m?.alvoId && m.alvoTemOpcoes) {
      const ancora = m.opcoes[valor];
      if (!ancora) return { ok: false, erro: `A opção "${valor}" de "${p.rotulo}" não tem destino na configuração. Ligue-a e reenvie.` };
      respostas[p.chave] = ancora;
    } else {
      respostas[p.chave] = valor; // texto, ou escolha indo como texto (campo de texto / dado adicional)
    }
  }

  const marcados = (o.main_challenges ?? []).filter(Boolean);
  if (marcados.length > 1) respostas[CHAVE_DESAFIOS_MARCADOS] = marcados.join(', ');

  return {
    ok: true,
    envelope: {
      motorId: config.motorId,
      externalId: externalIdDoUsuario(input.userId),
      modo: input.modo,
      ocorridoEm: input.ocorridoEm,
      contato: {
        nome: o.full_name || null,
        telefone: o.phone || null,
        email: o.email || null,
        emailConta: input.emailConta || null,
      },
      respostas,
    },
  };
}
