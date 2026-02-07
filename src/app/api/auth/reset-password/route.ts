import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPasswordResetEmail } from '@/lib/email/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email e obrigatorio' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email invalido' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${appUrl}/auth/callback?type=recovery`;

    const supabase = await createClient();

    // Send via Supabase Auth (primary - handles the actual token generation)
    const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (supabaseError) {
      console.error('[auth/reset-password] Supabase error:', supabaseError.message);
      // We still return success to avoid leaking whether the email exists
    }

    // Send custom branded email via Resend (supplementary notification)
    const resetLink = `${redirectTo}&email=${encodeURIComponent(email)}`;
    const { error: emailError } = await sendPasswordResetEmail(email, resetLink);

    if (emailError) {
      console.error('[auth/reset-password] Resend email error:', emailError);
      // Non-blocking: Supabase email is the primary mechanism
    }

    // Always return success to avoid email enumeration attacks
    return NextResponse.json(
      { success: true, message: 'Se o email existir em nossa base, voce recebera um link de redefinicao.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[auth/reset-password] Error:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
