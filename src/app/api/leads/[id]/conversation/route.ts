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

  const body = await request.json();
  const { snippet_text, speaker } = body;

  // Validate input
  if (!snippet_text || typeof snippet_text !== 'string' || snippet_text.trim().length === 0) {
    return NextResponse.json(
      { error: 'snippet_text é obrigatório' },
      { status: 400 }
    );
  }

  if (!speaker || !['user', 'lead'].includes(speaker)) {
    return NextResponse.json(
      { error: 'speaker deve ser "user" ou "lead"' },
      { status: 400 }
    );
  }

  // Fetch current lead to get existing conversation_history
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('conversation_history')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json(
      { error: 'Lead não encontrado' },
      { status: 404 }
    );
  }

  // Build new snippet
  const newSnippet = {
    timestamp: new Date().toISOString(),
    snippet_text: snippet_text.trim(),
    speaker,
  };

  // Append to existing conversation_history
  const existingHistory = Array.isArray(lead.conversation_history)
    ? lead.conversation_history
    : [];
  const updatedHistory = [...existingHistory, newSnippet];

  // Update lead with new conversation_history and last_contact_at
  const { data: updatedLead, error: updateError } = await supabase
    .from('leads')
    .update({
      conversation_history: updatedHistory,
      last_contact_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ lead: updatedLead, snippet: newSnippet }, { status: 201 });
}
