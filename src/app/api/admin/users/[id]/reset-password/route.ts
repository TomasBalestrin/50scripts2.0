import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getDefaultPassword } from '@/lib/auth-utils';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await getAdminUser();
    if (error) return error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'User id is required' },
        { status: 400 }
      );
    }

    const defaultPassword = await getDefaultPassword();

    const adminClient = await createAdminClient();

    const { error: resetError } =
      await adminClient.auth.admin.updateUserById(id, {
        password: defaultPassword,
      });

    if (resetError) {
      console.error('[admin/users/reset-password] Error resetting password:', resetError);
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users/reset-password] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
