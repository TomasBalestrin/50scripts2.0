// Domínio: bethel-forms — tipos compartilhados da integração 50 Scripts → Bethel Forms (config, envelope, fila e o
// espelho do catálogo que o Forms devolve). Só tipos: nenhum I/O, importável pela tela e pelo servidor.
import type { OnboardingField } from '@/lib/onboarding/form';

export type ChavePergunta = OnboardingField;

// ———— Configuração (system_config, key = 'bethel_forms') ————

export interface DestinoForms {
  especialistaId: string;
  especialistaNome: string;
  grupoId: string;
  grupoNome: string;
  funilId: string;
  funilNome: string;
}

/** Como UMA pergunta do 50 Scripts chega ao Forms. alvoId null = "Dado adicional" (vai como texto, sem campo do funil). */
export interface MapeamentoPergunta {
  alvoId: string | null;
  alvoTipo: string | null;
  /** O campo do Forms tem lista de opções? Então cada opção da pergunta precisa de destino (abaixo). */
  alvoTemOpcoes: boolean;
  /** opção do 50 Scripts (texto) → ÂNCORA da opção do Forms. */
  opcoes: Record<string, string>;
}

export interface ConfigBethelForms {
  /** Envio ao vivo ligado: cada onboarding novo entra na fila. */
  ativo: boolean;
  /** Primeira vez que o envio ao vivo foi ligado — é o corte do SQL do retroativo. */
  ativadoEm: string | null;
  destino: DestinoForms | null;
  /** Motor criado no Forms (forms.id) — a URL de envio é fixa, o motor vai no corpo. */
  motorId: string | null;
  campos: Partial<Record<ChavePergunta, MapeamentoPergunta>>;
  /** Ordem de prioridade das opções do desafio — só decide respostas antigas com mais de um desafio marcado. */
  prioridadeDesafios: string[];
}

export const CONFIG_VAZIA: ConfigBethelForms = {
  ativo: false,
  ativadoEm: null,
  destino: null,
  motorId: null,
  campos: {},
  prioridadeDesafios: [],
};

// ———— Catálogo do Forms (espelho de /api/ingest/scripts50 no bethel-forms) ————

export interface CatalogoFunil {
  id: string;
  nome: string;
}
export interface CatalogoGrupo {
  id: string;
  nome: string;
  funis: CatalogoFunil[];
}
export interface CatalogoEspecialista {
  id: string;
  nome: string;
  grupos: CatalogoGrupo[];
}
export interface OpcaoDoCampo {
  /** ÂNCORA — o que o Forms guarda e o estado compara. */
  valor: string;
  rotulo: string;
}
export interface CampoDoFunil {
  id: string;
  tipo: string;
  titulo: string;
  interno: boolean;
  opcoes: OpcaoDoCampo[] | null;
}
export interface CamposDoFunil {
  funnelId: string;
  formId: string;
  campos: CampoDoFunil[];
}

// ———— Envelope do POST de respostas ————

export type ModoEnvio = 'ao_vivo' | 'retroativo';

export interface EnvelopeEnvio {
  motorId: string;
  externalId: string;
  modo: ModoEnvio;
  ocorridoEm: string;
  contato: { nome: string | null; telefone: string | null; email: string | null; emailConta: string | null };
  respostas: Record<string, string>;
}

// ———— Fila ————

export type StatusEnvio = 'pendente' | 'enviando' | 'enviado' | 'aviso' | 'erro';

export interface EnvioRow {
  id: string;
  user_id: string | null;
  external_id: string;
  modo: ModoEnvio;
  ocorrido_em: string;
  status: StatusEnvio;
  tentativas: number;
  resultado: string | null;
  http_status: number | null;
  erro: string | null;
  payload: EnvelopeEnvio | null;
  resposta: Record<string, unknown> | null;
  forms_response_id: string | null;
  forms_lead_id: string | null;
  created_at: string;
  atualizado_em: string;
  enviado_em: string | null;
}
