import { timingSafeEqual } from 'crypto';

/**
 * Autenticação da rota `GET /api/status-check`, consumida pelo poller do Hub
 * Bethel Sistemas (nível 2 do marketplace de integrações). Sem sessão de
 * usuário — o Hub chama com `Authorization: Bearer STATUS_INGEST_SECRET`.
 *
 * Fail-closed:
 *   - `STATUS_INGEST_SECRET` ausente/vazio → 503 (integração não configurada).
 *   - token ausente ou inválido            → 401.
 */
export interface StatusAuthResult {
  ok: boolean;
  status?: number;
}

/** Comparação em tempo constante (evita timing attack no token). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function validateStatusAuth(authHeader: string | null): StatusAuthResult {
  const secret = (process.env.STATUS_INGEST_SECRET ?? '').trim();
  if (!secret) return { ok: false, status: 503 };

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (authHeader?.trim() ?? '');

  if (!token) return { ok: false, status: 401 };

  return safeEqual(token, secret) ? { ok: true } : { ok: false, status: 401 };
}
