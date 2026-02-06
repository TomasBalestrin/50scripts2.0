import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: collection } = await supabase
    .from('user_collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!collection) {
    return NextResponse.json({ error: 'Coleção não encontrada' }, { status: 404 });
  }

  const { script_id } = await request.json();

  if (!script_id) {
    return NextResponse.json({ error: 'script_id obrigatório' }, { status: 400 });
  }

  const { error } = await supabase
    .from('collection_scripts')
    .insert({ collection_id: id, script_id });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Script já está na coleção' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { script_id } = await request.json();

  await supabase
    .from('collection_scripts')
    .delete()
    .eq('collection_id', id)
    .eq('script_id', script_id);

  return NextResponse.json({ success: true });
}
