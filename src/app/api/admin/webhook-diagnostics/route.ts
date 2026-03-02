import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Diagnostic endpoint to identify webhook/user creation issues.
 * Shows: auth vs profile sync status, recent errors, and system health.
 */
export async function GET() {
  try {
    const { error } = await getAdminUser();
    if (error) return error;

    const adminClient = await createAdminClient();

    // 1. Count auth users (paginate through all)
    let totalAuthUsers = 0;
    let authPage = 1;
    const authPerPage = 500;
    const authEmails = new Set<string>();
    while (true) {
      const { data, error: listError } = await adminClient.auth.admin.listUsers({
        page: authPage,
        perPage: authPerPage,
      });

      if (listError || !data?.users?.length) break;

      totalAuthUsers += data.users.length;
      for (const u of data.users) {
        if (u.email) authEmails.add(u.email.toLowerCase());
      }

      if (data.users.length < authPerPage) break;
      authPage++;
    }

    // 2. Count profile users
    const { count: totalProfiles } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    // 3. Get all profile emails
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('email');

    const profileEmails = new Set(
      (profileData ?? []).map((p) => (p.email as string).toLowerCase()),
    );

    // 4. Find mismatches
    const authWithoutProfile = [...authEmails].filter((e) => !profileEmails.has(e));
    const profileWithoutAuth = [...profileEmails].filter((e) => !authEmails.has(e));

    // 5. Check RPC function availability
    let rpcAvailable = false;
    try {
      const { error: rpcError } = await adminClient
        .rpc('get_user_id_by_email', { lookup_email: 'test@test.com' })
        .maybeSingle();
      rpcAvailable = !rpcError;
    } catch {
      rpcAvailable = false;
    }

    // 6. Recent webhook errors (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentErrors, count: errorCount } = await adminClient
      .from('webhook_logs')
      .select('id, source, event_type, email_extracted, error_message, status, processed_at', { count: 'exact' })
      .eq('status', 'error')
      .gte('processed_at', oneDayAgo)
      .order('processed_at', { ascending: false })
      .limit(20);

    // 7. Webhook success rate (last 24h)
    const { count: totalWebhooks24h } = await adminClient
      .from('webhook_logs')
      .select('id', { count: 'exact', head: true })
      .gte('processed_at', oneDayAgo);

    const { count: successWebhooks24h } = await adminClient
      .from('webhook_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'success')
      .gte('processed_at', oneDayAgo);

    const successRate = (totalWebhooks24h ?? 0) > 0
      ? Math.round(((successWebhooks24h ?? 0) / (totalWebhooks24h ?? 1)) * 100)
      : 0;

    // 8. Error message frequency
    const errorMessages: Record<string, number> = {};
    for (const err of recentErrors ?? []) {
      const msg = err.error_message || 'Unknown error';
      errorMessages[msg] = (errorMessages[msg] || 0) + 1;
    }

    return NextResponse.json({
      sync_status: {
        total_auth_users: totalAuthUsers,
        total_profiles: totalProfiles ?? 0,
        gap: totalAuthUsers - (totalProfiles ?? 0),
        auth_without_profile_count: authWithoutProfile.length,
        auth_without_profile_emails: authWithoutProfile.slice(0, 50),
        profile_without_auth_count: profileWithoutAuth.length,
      },
      system_health: {
        rpc_get_user_id_by_email: rpcAvailable
          ? 'OK'
          : 'MISSING - run migration 015_optimize_webhook_user_lookup.sql',
      },
      webhooks_24h: {
        total: totalWebhooks24h ?? 0,
        success: successWebhooks24h ?? 0,
        errors: errorCount ?? 0,
        success_rate: `${successRate}%`,
      },
      recent_errors: (recentErrors ?? []).map((e) => ({
        source: e.source,
        event: e.event_type,
        email: e.email_extracted,
        error: e.error_message,
        time: e.processed_at,
      })),
      error_frequency: errorMessages,
      actions: {
        sync_missing_profiles:
          authWithoutProfile.length > 0
            ? `PUT /api/admin/users to sync ${authWithoutProfile.length} missing profiles`
            : 'No action needed',
        apply_migration: !rpcAvailable
          ? 'Run migration 015_optimize_webhook_user_lookup.sql in Supabase SQL editor'
          : 'Migration already applied',
      },
    });
  } catch (err) {
    console.error('[admin/webhook-diagnostics] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST: Force sync auth users without profiles.
 * Creates missing profiles for all auth users that don't have one.
 */
export async function POST() {
  try {
    const { error } = await getAdminUser();
    if (error) return error;

    const adminClient = await createAdminClient();

    // Get all auth users
    const allAuthUsers: { id: string; email: string; created_at: string }[] = [];
    let page = 1;
    const perPage = 500;
    while (true) {
      const { data } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (!data?.users?.length) break;
      for (const u of data.users) {
        if (u.email) {
          allAuthUsers.push({ id: u.id, email: u.email, created_at: u.created_at });
        }
      }
      if (data.users.length < perPage) break;
      page++;
    }

    // Get existing profile IDs
    const { data: existingProfiles } = await adminClient
      .from('profiles')
      .select('id');
    const existingIds = new Set((existingProfiles ?? []).map((p) => p.id));

    // Find and create missing profiles
    const missing = allAuthUsers.filter((u) => !existingIds.has(u.id));
    let synced = 0;
    const errors: string[] = [];

    for (const user of missing) {
      const { error: upsertError } = await adminClient.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          full_name: '',
          plan: 'starter',
          referral_code: user.id.slice(0, 8).toUpperCase(),
          webhook_source: 'sync',
          onboarding_completed: true,
          created_at: user.created_at,
        },
        { onConflict: 'id' },
      );

      if (upsertError) {
        errors.push(`${user.email}: ${upsertError.message}`);
      } else {
        synced++;
      }
    }

    return NextResponse.json({
      total_auth_users: allAuthUsers.length,
      missing_profiles: missing.length,
      synced,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    });
  } catch (err) {
    console.error('[admin/webhook-diagnostics] Sync error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
