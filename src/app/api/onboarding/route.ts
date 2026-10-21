import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appendToSheet } from '@/lib/google-sheets';
import { toOnboardingSheetCells } from '@/lib/onboarding/sheet';
import { enfileirarEEnviarAoVivo } from '@/lib/bethel-forms/fila';
import { onboardingSchema } from '@/lib/validations/schemas';

// O envio ao Bethel Forms roda no after() (até ~25 s de timeout no pior caso): dá folga ao after().
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const parsed = onboardingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Ensure profile exists before inserting onboarding data (FK constraint)
    const { error: ensureProfileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email || data.email,
          full_name: data.full_name,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

    if (ensureProfileError) {
      console.error('Ensure profile error:', ensureProfileError);
      return NextResponse.json(
        { error: 'Erro ao garantir perfil do usuário' },
        { status: 500 }
      );
    }

    // Upsert user_onboarding data
    const { error: onboardingError } = await supabase
      .from('user_onboarding')
      .upsert(
        {
          user_id: user.id,
          ...data,
          average_ticket: data.average_ticket || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (onboardingError) {
      console.error('Onboarding save error:', onboardingError);
      return NextResponse.json(
        { error: `Erro ao salvar dados do onboarding: ${onboardingError.message}` },
        { status: 500 }
      );
    }

    // Update profile: set full_name and mark onboarding as completed
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Erro ao atualizar perfil' },
        { status: 500 }
      );
    }

    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Send to Google Sheets AFTER the response (non-blocking)
    // after() runs code after the response is sent but Vercel keeps the function alive
    // Planilha e Bethel Forms rodam em paralelo (cada um pode levar vários segundos e um não depende do outro).
    // O Bethel Forms entra na fila de envios e já tenta mandar, se a integração estiver ligada — nunca lança.
    after(async () => {
      await Promise.all([
        appendToSheet([timestamp, ...toOnboardingSheetCells(data)]).catch((sheetErr) => {
          console.error('Google Sheets after() sync failed:', sheetErr);
        }),
        enfileirarEEnviarAoVivo(user.id),
      ]);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Onboarding API error:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
