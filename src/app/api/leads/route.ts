import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasAccess } from '@/lib/plans/gate';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (!profile || !hasAccess(profile.plan, 'premium')) {
      return NextResponse.json({ error: 'Plano insuficiente' }, { status: 403 });
    }

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 });
    }

    return NextResponse.json({ leads: leads || [] });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (!profile || !hasAccess(profile.plan, 'premium')) {
      return NextResponse.json({ error: 'Plano insuficiente' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, expected_value, notes, stage } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        user_id: user.id,
        name,
        phone: phone || null,
        stage: stage || 'novo',
        expected_value: expected_value || null,
        notes: notes || null,
        conversation_history: [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Erro ao criar lead' }, { status: 500 });
    }

    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
