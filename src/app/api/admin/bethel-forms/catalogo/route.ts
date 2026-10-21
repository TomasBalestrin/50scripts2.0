import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { buscarCatalogo } from '@/lib/bethel-forms/cliente';
import { sugerirDestino } from '@/lib/bethel-forms/mapeamento';

/** GET /api/admin/bethel-forms/catalogo — Especialista › Grupo › Funil do Forms + o destino que a tela já traz marcado. */
export async function GET() {
  const { error } = await getAdminUser();
  if (error) return error;

  const catalogo = await buscarCatalogo();
  if (!catalogo.ok) return NextResponse.json({ error: catalogo.erro }, { status: 502 });
  return NextResponse.json({ especialistas: catalogo.especialistas, sugestao: sugerirDestino(catalogo.especialistas) });
}
