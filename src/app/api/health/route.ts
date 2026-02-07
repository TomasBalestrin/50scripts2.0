import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function checkDatabase(): Promise<'ok' | 'error'> {
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

async function checkAuth(): Promise<'ok' | 'error'> {
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

export async function GET() {
  const [database, auth] = await Promise.all([
    checkDatabase(),
    checkAuth(),
  ]);

  const allHealthy = database === 'ok' && auth === 'ok';

  const body = {
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    services: {
      database,
      auth,
    },
  };

  return NextResponse.json(body, {
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
