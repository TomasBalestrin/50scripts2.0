import { NextRequest, NextResponse } from 'next/server';
import { processarPendentes, reenfileirarErros } from '@/lib/bethel-forms/fila';

export const maxDuration = 60;

/**
 * GET /api/cron/bethel-forms
 *
 * Called by Vercel Cron (diário). Devolve pra fila os envios ao Bethel Forms que deram erro (até o limite de tentativas
 * automáticas) e manda os pendentes, do mais antigo pro mais novo. Requires CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/bethel-forms] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reenfileirados = await reenfileirarErros();
    const resumo = await processarPendentes({ prazoMs: 50_000 });
    return NextResponse.json({ reenfileirados, ...resumo });
  } catch (err) {
    console.error('[cron/bethel-forms] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
