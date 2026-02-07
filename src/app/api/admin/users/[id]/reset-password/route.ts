import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

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

    const defaultPassword =
      process.env.DEFAULT_PASSWORD ?? '50scripts@2024';

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

    // Mark password_changed = false so user is prompted to change it
    await adminClient
      .from('profiles')
      .update({ password_changed: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users/reset-password] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
