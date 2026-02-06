import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { changePasswordSchema } from '@/lib/validations/schemas';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { password } = parsed.data;

    // 3. Update password via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // 4. Mark password as changed in the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ password_changed: true })
      .eq('id', user.id);

    if (profileError) {
      console.error('[auth/change-password] Profile update error:', profileError);
      // Password was already changed successfully, so we still return 200
      // but log the profile update failure
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[auth/change-password] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
