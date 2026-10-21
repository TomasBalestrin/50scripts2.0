import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { buscarCampos } from '@/lib/bethel-forms/cliente';
import { sugerirMapeamento } from '@/lib/bethel-forms/mapeamento';

/** GET /api/admin/bethel-forms/campos?funnelId= — campos do formulário do funil (com as opções) + o mapeamento sugerido. */
export async function GET(request: NextRequest) {
  const { error } = await getAdminUser();
  if (error) return error;

  const funnelId = request.nextUrl.searchParams.get('funnelId');
  if (!funnelId) return NextResponse.json({ error: 'Informe o funil' }, { status: 400 });

  const doFunil = await buscarCampos(funnelId);
  if (!doFunil.ok) return NextResponse.json({ error: doFunil.erro }, { status: doFunil.httpStatus === 404 ? 404 : 502 });
  return NextResponse.json({ campos: doFunil.campos, sugestao: sugerirMapeamento(doFunil.campos) });
}
