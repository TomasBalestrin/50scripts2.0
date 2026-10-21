import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { processarPendentes, reenfileirarErros } from '@/lib/bethel-forms/fila';

export const maxDuration = 60;

/**
 * POST /api/admin/bethel-forms/envios/processar   { reenfileirarErros?: boolean }
 * Manda os pendentes (do preenchimento mais antigo pro mais novo) por até ~45 s e devolve quantos faltam; a tela chama de
 * novo até zerar. `reenfileirarErros` (só na 1ª chamada) devolve os envios com erro pra fila antes de começar.
 */
export async function POST(request: NextRequest) {
  const { error } = await getAdminUser();
  if (error) return error;

  const body = (await request.json().catch(() => ({}))) as { reenfileirarErros?: boolean };
  try {
    const reenfileirados = body.reenfileirarErros === true ? await reenfileirarErros({ todos: true }) : 0;
    const resumo = await processarPendentes({ prazoMs: 45_000 });
    return NextResponse.json({ ...resumo, reenfileirados });
  } catch (err) {
    console.error('[admin/bethel-forms/envios/processar]', err);
    return NextResponse.json({ error: 'Erro ao processar a fila' }, { status: 500 });
  }
}
