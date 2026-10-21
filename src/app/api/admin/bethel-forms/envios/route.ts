import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { TABELA_ENVIOS } from '@/lib/bethel-forms/fila';
import type { StatusEnvio } from '@/lib/bethel-forms/tipos';

const STATUS: StatusEnvio[] = ['pendente', 'enviando', 'enviado', 'aviso', 'erro'];
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/admin/bethel-forms/envios?status=&modo=&de=&ate=&page=&limit=
 * `de`/`ate` são dias (AAAA-MM-DD) em horário de Brasília e filtram a DATA DO PREENCHIMENTO (ocorrido_em).
 * Devolve a página, o total do filtro e a contagem por status (respeitando modo e período, não o status).
 */
export async function GET(request: NextRequest) {
  const { error } = await getAdminUser();
  if (error) return error;

  const q = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(q.get('page') ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.get('limit') ?? '20', 10) || 20));
  const status = q.get('status');
  const modo = q.get('modo');
  const de = q.get('de');
  const ate = q.get('ate');

  const admin = await createAdminClient();

  // Filtros de modo e período valem pra lista e pra contagem; o de status só pra lista.
  const modoValido = modo === 'ao_vivo' || modo === 'retroativo' ? modo : null;
  const desde = de && DATA_RE.test(de) ? `${de}T00:00:00-03:00` : null;
  const ateFim = ate && DATA_RE.test(ate) ? `${ate}T23:59:59.999-03:00` : null;
  const statusDoFiltro = status && (STATUS as string[]).includes(status) ? status : null;

  const offset = (page - 1) * limit;

  let consulta = admin.from(TABELA_ENVIOS).select('*, profiles(email, full_name)', { count: 'exact' });
  if (statusDoFiltro) consulta = consulta.eq('status', statusDoFiltro);
  if (modoValido) consulta = consulta.eq('modo', modoValido);
  if (desde) consulta = consulta.gte('ocorrido_em', desde);
  if (ateFim) consulta = consulta.lte('ocorrido_em', ateFim);

  const contar = (s: StatusEnvio) => {
    let c = admin.from(TABELA_ENVIOS).select('id', { count: 'exact', head: true }).eq('status', s);
    if (modoValido) c = c.eq('modo', modoValido);
    if (desde) c = c.gte('ocorrido_em', desde);
    if (ateFim) c = c.lte('ocorrido_em', ateFim);
    return c;
  };

  const [lista, ...contagens] = await Promise.all([
    consulta.order('ocorrido_em', { ascending: false }).range(offset, offset + limit - 1),
    ...STATUS.map(contar),
  ]);

  if (lista.error) {
    console.error('[admin/bethel-forms/envios] GET:', lista.error);
    return NextResponse.json({ error: 'Erro ao buscar os envios' }, { status: 500 });
  }

  const contagem = Object.fromEntries(STATUS.map((s, i) => [s, contagens[i].count ?? 0]));
  return NextResponse.json({ envios: lista.data ?? [], total: lista.count ?? 0, page, contagem });
}
