import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

// PATCH: Edit user email and/or password
export async function PATCH(
  request: NextRequest,
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

    const body = await request.json();
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    if (!email && !password) {
      return NextResponse.json(
        { error: 'Email ou senha são necessários' },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    // Build auth update
    const authUpdate: Record<string, string> = {};
    if (email) authUpdate.email = email;
    if (password) authUpdate.password = password;

    const { error: updateError } =
      await adminClient.auth.admin.updateUserById(id, authUpdate);

    if (updateError) {
      console.error('[admin/users/edit] Error updating auth:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // Update profile table too
    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (email) profileUpdates.email = email;

    await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users/edit] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove user completely
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user: adminUser } = await getAdminUser();
    if (error) return error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'User id is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (adminUser && adminUser.id === id) {
      return NextResponse.json(
        { error: 'Você não pode remover sua própria conta' },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    // Delete profile first (cascade might handle this, but be explicit)
    await adminClient
      .from('profiles')
      .delete()
      .eq('id', id);

    // Delete auth user
    const { error: deleteError } =
      await adminClient.auth.admin.deleteUser(id);

    if (deleteError) {
      console.error('[admin/users/delete] Error deleting user:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users/delete] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
