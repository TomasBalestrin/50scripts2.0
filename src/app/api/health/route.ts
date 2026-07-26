import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/security/rate-limit';
import { AI_BASE_URL, TEXT_MODEL } from '@/lib/ai/client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type ServiceStatus = 'ok' | 'error';

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return 'error';
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('profiles').select('id').limit(1);

    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

async function checkAuth(): Promise<ServiceStatus> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return 'error';
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.auth.getSession();

    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

interface AIHealth {
  status: 'ok' | 'error' | 'not_configured';
  provider: 'deepinfra';
  /** Sanitized reason code — never contains the key or raw provider body. */
  detail?: string;
  latencyMs?: number;
}

/**
 * Probe the AI provider (DeepInfra) with a 1-token chat completion. Unlike a
 * plain auth check, this also surfaces billing/balance problems (the reason we
 * moved off OpenAI): DeepInfra signals an exhausted balance with an HTTP error
 * rather than a 200. Bounded by a 5s timeout so a slow provider can't stall the
 * health endpoint; the call is opt-in and rate limited (see GET below), so its
 * negligible token cost stays bounded.
 */
async function checkAI(): Promise<AIHealth> {
  const apiKey = process.env.DEEPINFRA_API_KEY;
  if (!apiKey) {
    return { status: 'not_configured', provider: 'deepinfra' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const start = Date.now();

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return { status: 'ok', provider: 'deepinfra', latencyMs };
    }

    // Map to a coarse reason without leaking the provider's response body.
    // DeepInfra signals an exhausted balance with 402 (not OpenAI's 429).
    const detail =
      res.status === 401
        ? 'invalid_key'
        : res.status === 402
          ? 'insufficient_balance'
          : res.status === 429
            ? 'rate_limited'
            : res.status >= 500
              ? 'provider_upstream_error'
              : `http_${res.status}`;

    return { status: 'error', provider: 'deepinfra', detail, latencyMs };
  } catch (err) {
    const detail =
      err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'network_error';
    return { status: 'error', provider: 'deepinfra', detail };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  // The AI provider is a non-critical dependency and probing it on every uptime
  // ping would add latency + external coupling (and a token cost), so it is
  // opt-in.
  //   GET /api/health          -> database + auth (lightweight, unchanged)
  //   GET /api/health?deep=1   -> also probes the AI provider (DeepInfra)
  //   GET /api/health?checks=ai -> also probes the AI provider
  const { searchParams } = new URL(request.url);
  const checks = searchParams.get('checks')?.split(',').map((c) => c.trim()) ?? [];
  let probeAI = searchParams.get('deep') === '1' || checks.includes('ai');

  // The AI probe makes this public route fan out to a third party (and spend a
  // token), so it is rate limited per IP to curb cost/resource amplification
  // (each probe can hold the edge function up to the 5s timeout) and throttle
  // disclosure of internal state. Note: the limiter is an in-memory Map, so on
  // edge/serverless the cap is best-effort per instance, not a hard global cap.
  // Over the limit -> silently fall back to the lightweight (db + auth) response.
  if (probeAI) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = rateLimit(`health-ai:${ip}`, {
      windowMs: 60_000,
      maxRequests: 5,
    });
    if (!allowed) probeAI = false;
  }

  const [database, auth, ai] = await Promise.all([
    checkDatabase(),
    checkAuth(),
    probeAI ? checkAI() : Promise.resolve<AIHealth | undefined>(undefined),
  ]);

  // Critical services (database, auth) gate the HTTP status / pageability.
  const criticalHealthy = database === 'ok' && auth === 'ok';
  // The AI provider only downgrades the reported status; it never returns 503.
  const aiHealthy = !ai || ai.status === 'ok';
  const allHealthy = criticalHealthy && aiHealthy;

  const services: {
    database: ServiceStatus;
    auth: ServiceStatus;
    ai?: AIHealth;
  } = { database, auth };
  if (ai) services.ai = ai;

  const body = {
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    services,
  };

  return NextResponse.json(body, {
    status: criticalHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
