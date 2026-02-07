import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

type AdminAuthResult =
  | { error: NextResponse; supabase: null; user: null }
  | { error: null; supabase: SupabaseClient; user: User };

export async function getAdminUser(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      supabase: null,
      user: null,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      ),
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}
