// Domínio: bethel-forms — leitura e gravação da CONFIGURAÇÃO da integração (destino, mapeamento, liga/desliga). Dono ÚNICO
// de onde ela mora: a linha key='bethel_forms' de system_config (JSONB, guardada como OBJETO — o SQL do retroativo lê
// value->>'ativadoEm'; as outras chaves dessa tabela guardam string JSON, esta não). Escolha operacional vai pro banco e
// pra tela, nunca pra env; env é só o segredo de conta (ver ./cliente). Usa o service role: o envio ao vivo roda no
// contexto do usuário que preencheu o onboarding, que não é admin.
import { createAdminClient } from '@/lib/supabase/server';
import { CONFIG_VAZIA, type ConfigBethelForms } from './tipos';
import { prioridadePadrao } from './mapeamento';

export const CHAVE_CONFIG = 'bethel_forms';

/** Defensiva: aceita objeto ou string JSON, e completa o que faltar com o padrão. */
export function lerConfigDeValor(valor: unknown): ConfigBethelForms {
  let v: unknown = valor;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      v = null;
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { ...CONFIG_VAZIA, prioridadeDesafios: prioridadePadrao() };
  const c = v as Partial<ConfigBethelForms>;
  return {
    ativo: c.ativo === true,
    ativadoEm: typeof c.ativadoEm === 'string' ? c.ativadoEm : null,
    destino: c.destino && typeof c.destino === 'object' ? c.destino : null,
    motorId: typeof c.motorId === 'string' ? c.motorId : null,
    campos: c.campos && typeof c.campos === 'object' ? c.campos : {},
    prioridadeDesafios: Array.isArray(c.prioridadeDesafios) && c.prioridadeDesafios.length > 0 ? c.prioridadeDesafios : prioridadePadrao(),
  };
}

export async function lerConfig(): Promise<ConfigBethelForms> {
  const admin = await createAdminClient();
  const { data } = await admin.from('system_config').select('value').eq('key', CHAVE_CONFIG).maybeSingle();
  return lerConfigDeValor(data?.value);
}

export async function salvarConfig(config: ConfigBethelForms): Promise<void> {
  const admin = await createAdminClient();
  const { error } = await admin
    .from('system_config')
    .upsert({ key: CHAVE_CONFIG, value: config, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(`Erro ao salvar a configuração: ${error.message}`);
}
