import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSecurityHeaders } from '@/lib/security/headers';

/**
 * DELETE /api/user/data-delete
 *
 * LGPD Compliance: Delete all user data from all tables and remove auth user.
 * This is an irreversible operation.
 *
 * Deletes from: script_usage, leads, user_badges, daily_challenges,
 * collection_scripts, user_collections, referrals, ai_generation_log,
 * sales_agenda, profiles, and auth.users
 *
 * Requires authentication.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: getSecurityHeaders() }
      );
    }

    const userId = user.id;

    // Use admin client for cascade deletion and auth user removal
    const adminClient = await createAdminClient();

    // Delete user data from all tables in correct order (respecting foreign keys)
    // Start with tables that have foreign key dependencies on other user tables

    // 1. Delete collection_scripts (depends on user_collections)
    const { data: userCollections } = await adminClient
      .from('user_collections')
      .select('id')
      .eq('user_id', userId);

    if (userCollections && userCollections.length > 0) {
      const collectionIds = userCollections.map((c: { id: string }) => c.id);
      await adminClient
        .from('collection_scripts')
        .delete()
        .in('collection_id', collectionIds);
    }

    // 2. Delete all user-owned data in parallel (independent tables)
    const deleteResults = await Promise.all([
      adminClient
        .from('script_usage')
        .delete()
        .eq('user_id', userId),
      adminClient
        .from('leads')
        .delete()
        .eq('user_id', userId),
      adminClient
        .from('user_badges')
        .delete()
        .eq('user_id', userId),
      adminClient
        .from('daily_challenges')
        .delete()
        .eq('user_id', userId),
      adminClient
        .from('user_collections')
        .delete()
        .eq('user_id', userId),
      adminClient
        .from('ai_generation_log')
        .delete()
        .eq('user_id', userId),
      adminClient
        .from('sales_agenda')
        .delete()
        .eq('user_id', userId),
      adminClient
        .from('referrals')
        .delete()
        .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`),
    ]);

    // Check for errors in deletion
    const deleteErrors = deleteResults.filter((r) => r.error);
    if (deleteErrors.length > 0) {
      console.error('Errors during data deletion:', deleteErrors.map((r) => r.error));
      // Continue with profile and auth deletion even if some tables fail
    }

    // 3. Delete the profile record
    const { error: profileDeleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
    }

    // 4. Delete the auth user via admin API
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return NextResponse.json(
        { error: 'Erro ao remover conta de autenticação. Contate o suporte.' },
        { status: 500, headers: getSecurityHeaders() }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Dados removidos com sucesso',
      },
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error('Data deletion error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover dados. Tente novamente ou contate o suporte.' },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
