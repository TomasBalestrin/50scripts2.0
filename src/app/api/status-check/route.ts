import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateStatusAuth } from '@/lib/status-auth';

// Status SDK (Hub Bethel Sistemas, nível 2) — GET /api/status-check.
// Chamada pelo poller do Hub 1x/min, autenticada por Bearer
// (STATUS_INGEST_SECRET, ver src/lib/status-auth.ts). Bypass de sessão via
// publicRoutes em src/lib/supabase/middleware.ts.
export async function GET(req: NextRequest) {
  const auth = validateStatusAuth(req.headers.get('authorization'));
  if (!auth.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: auth.status });
  }

  const admin = await createAdminClient();

  try {
    const desde = new Date(Date.now() - 5 * 60_000).toISOString();
    const [total, online] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      admin.from('app_presence').select('*', { count: 'exact', head: true }).gte('last_seen', desde),
    ]);

    // Resumo de advisors (RLS/índice/seq_scan) — opcional. Se a migration
    // 021 ainda não rodou nesse ambiente, a função não existe e cai em
    // null sem derrubar o resto da resposta.
    let advisors: unknown = null;
    try {
      const { data } = await admin.rpc('get_advisor_summary');
      advisors = data ?? null;
    } catch {
      advisors = null;
    }

    return NextResponse.json({
      up: true,
      db_ok: !total.error && !online.error,
      versao: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
      usuarios_total: total.count ?? 0,
      usuarios_online: online.count ?? 0,
      advisors,
    });
  } catch {
    return NextResponse.json({ up: true, db_ok: false });
  }
}
