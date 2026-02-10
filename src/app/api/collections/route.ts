import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasValidAccess } from '@/lib/plans/gate';
import { cachedJson } from '@/lib/api-cache';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single();

  if (!profile || !hasValidAccess(profile.plan, 'premium', profile.plan_expires_at)) {
    return NextResponse.json({ error: 'Plano Premium necessário' }, { status: 403 });
  }

  const { data: collections } = await supabase
    .from('user_collections')
    .select(`
      *,
      collection_scripts(
        script:scripts(id, title, content, category_id, global_effectiveness)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return cachedJson({
    collections: collections?.map((c) => ({
      ...c,
      scripts_count: c.collection_scripts?.length || 0,
      scripts: c.collection_scripts?.map((cs: { script: unknown }) => cs.script) || [],
    })) || [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Nome obrigatório (mín. 2 caracteres)' }, { status: 400 });
  }

  const { data: collection, error } = await supabase
    .from('user_collections')
    .insert({ user_id: user.id, name })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ collection }, { status: 201 });
}
