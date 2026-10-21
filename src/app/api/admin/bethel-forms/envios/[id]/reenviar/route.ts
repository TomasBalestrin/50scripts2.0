import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { TABELA_ENVIOS, enviar } from '@/lib/bethel-forms/fila';

export const maxDuration = 60;

/** POST /api/admin/bethel-forms/envios/[id]/reenviar — monta o envio de novo (onboarding e configuração de agora) e manda. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await getAdminUser();
  if (error) return error;

  const { id } = await params;
  const r = await enviar(id);
  if (!r.ok) {
    if (r.motivo === 'nao_encontrado') return NextResponse.json({ error: 'Envio não encontrado' }, { status: 404 });
    return NextResponse.json({ error: 'Este envio já está sendo processado. Tente de novo em instantes.' }, { status: 409 });
  }

  const admin = await createAdminClient();
  const { data: envio } = await admin.from(TABELA_ENVIOS).select('*, profiles(email, full_name)').eq('id', id).maybeSingle();
  return NextResponse.json({ status: r.status, envio });
}
