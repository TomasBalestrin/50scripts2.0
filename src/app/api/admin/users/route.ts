import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const plan = searchParams.get('plan') || null;
    const search = searchParams.get('search') || null;
    const offset = (page - 1) * limit;

    // Strategy 1: Try RPC function (SECURITY DEFINER - bypasses RLS)
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_list_profiles', {
        p_plan: plan,
        p_search: search,
        p_limit: limit,
        p_offset: offset,
      });

      if (!rpcError && rpcResult) {
        return NextResponse.json({
          users: rpcResult.users ?? [],
          total: rpcResult.total ?? 0,
          page,
        });
      }
      // RPC not available, fall through to next strategy
      console.log('[admin/users] RPC not available, trying service role client:', rpcError?.message);
    } catch {
      // RPC function doesn't exist yet
    }

    // Strategy 2: Try service role client (bypasses RLS completely)
    try {
      const adminClient = await createAdminClient();
      const testResult = await adminClient.from('profiles').select('id').limit(1);
      if (!testResult.error) {
        let query = adminClient
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (plan) query = query.eq('plan', plan);
        if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
        query = query.range(offset, offset + limit - 1);

        const { data: users, error: queryError, count } = await query;

        if (!queryError) {
          return NextResponse.json({
            users: users ?? [],
            total: count ?? 0,
            page,
          });
        }
        console.log('[admin/users] Service role query failed:', queryError.message);
      }
    } catch {
      // Service role key invalid or missing
    }

    // Strategy 3: Direct query with authenticated client (relies on RLS admin policies)
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (plan) query = query.eq('plan', plan);
    if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    query = query.range(offset, offset + limit - 1);

    const { data: users, error: queryError, count } = await query;

    if (queryError) {
      console.error('[admin/users] All strategies failed. Last error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch users. Run migration 005_admin_rpc_functions.sql or set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: users ?? [],
      total: count ?? 0,
      page,
    });
  } catch (err) {
    console.error('[admin/users] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const body = await request.json();
    const { id, plan, is_active, role } = body as {
      id?: string;
      plan?: string;
      is_active?: boolean;
      role?: string;
    };

    if (!id) {
      return NextResponse.json(
        { error: 'User id is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (plan !== undefined) updates.plan = plan;
    if (is_active !== undefined) updates.is_active = is_active;
    if (role !== undefined) updates.role = role;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Strategy 1: Try RPC function
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_update_profile', {
        p_user_id: id,
        p_updates: updates,
      });

      if (!rpcError && rpcResult) {
        return NextResponse.json({ profile: rpcResult });
      }
    } catch {
      // RPC not available
    }

    // Strategy 2: Try service role client
    try {
      const adminClient = await createAdminClient();
      const { data: profile, error: updateError } = await adminClient
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (!updateError) {
        return NextResponse.json({ profile });
      }
    } catch {
      // Service role key invalid
    }

    // Strategy 3: Authenticated client
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[admin/users] Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[admin/users] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildProfileData(userId: string, email: string, full_name?: string, plan?: string) {
  const now = new Date().toISOString();
  return {
    id: userId,
    email,
    full_name: full_name || '',
    plan: plan || 'starter',
    role: 'user',
    is_active: true,
    niche: null,
    preferred_tone: 'casual',
    onboarding_completed: false,
    xp_points: 0,
    level: 'iniciante',
    current_streak: 0,
    longest_streak: 0,
    ai_credits_remaining: 10,
    ai_credits_monthly: 10,
    saved_variables: {},
    push_subscription: null,
    notification_prefs: {},
    referral_code: userId.slice(0, 8).toUpperCase(),
    referred_by: null,
    webhook_source: null,
    password_changed: false,
    last_login_at: null,
    created_at: now,
    updated_at: now,
  };
}

async function upsertProfile(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  profileData: ReturnType<typeof buildProfileData>
): Promise<{ error?: string }> {
  // Strategy 1: Try RPC function
  try {
    const { error: rpcError } = await supabase.rpc('admin_upsert_profile', {
      p_profile: profileData,
    });
    if (!rpcError) return {};
  } catch {
    // RPC not available
  }

  // Strategy 2: Try service role client (direct upsert)
  const { error: upsertError } = await adminClient
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' });

  if (upsertError) {
    console.error('[admin/users] Error upserting profile:', upsertError);
    return { error: upsertError.message };
  }
  return {};
}

export async function POST(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const body = await request.json();
    const { email, password, full_name, plan } = body as {
      email?: string;
      password?: string;
      full_name?: string;
      plan?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    // Try to create auth user
    const { data: authData, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    // If user already exists in auth, find them and ensure profile exists
    if (createError) {
      const alreadyRegistered = createError.message?.toLowerCase().includes('already')
        && createError.message?.toLowerCase().includes('registered');

      if (!alreadyRegistered) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      // Find the existing auth user
      const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const existingUser = listData?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!existingUser) {
        return NextResponse.json(
          { error: 'Usuário existe no auth mas não foi encontrado. Tente novamente.' },
          { status: 400 }
        );
      }

      // Update password to the one specified
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      });

      // Create/update profile
      const profileData = buildProfileData(existingUser.id, email, full_name, plan);
      const { error: profileError } = await upsertProfile(supabase, adminClient, profileData);

      if (profileError) {
        return NextResponse.json(
          { error: `Perfil não pôde ser criado: ${profileError}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ user: existingUser, synced: true }, { status: 201 });
    }

    // New user created successfully - ensure profile exists
    if (authData.user) {
      const profileData = buildProfileData(authData.user.id, email, full_name, plan);
      const { error: profileError } = await upsertProfile(supabase, adminClient, profileData);

      if (profileError) {
        return NextResponse.json(
          { error: `User created but profile failed: ${profileError}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ user: authData.user }, { status: 201 });
  } catch (err) {
    console.error('[admin/users] Unexpected error creating user:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Sync auth.users with profiles table (create missing profiles)
export async function PUT() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const adminClient = await createAdminClient();

    // Get all auth users
    const allAuthUsers: { id: string; email?: string; created_at: string }[] = [];
    let page = 1;
    const perPage = 500;
    while (true) {
      const { data } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (!data?.users?.length) break;
      allAuthUsers.push(...data.users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));
      if (data.users.length < perPage) break;
      page++;
    }

    // Get all existing profile IDs
    const { data: existingProfiles } = await adminClient
      .from('profiles')
      .select('id');

    const existingIds = new Set((existingProfiles ?? []).map(p => p.id));

    // Find auth users without profiles
    const missing = allAuthUsers.filter(u => !existingIds.has(u.id));

    if (missing.length === 0) {
      return NextResponse.json({ synced: 0, message: 'Todos os usuários já possuem perfil.' });
    }

    // Create profiles for missing users
    let synced = 0;
    const errors: string[] = [];

    for (const user of missing) {
      const profileData = buildProfileData(user.id, user.email || '', '', 'starter');
      profileData.created_at = user.created_at;
      const { error: profileError } = await upsertProfile(supabase, adminClient, profileData);

      if (profileError) {
        errors.push(`${user.email}: ${profileError}`);
      } else {
        synced++;
      }
    }

    return NextResponse.json({
      synced,
      total_missing: missing.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[admin/users] Sync error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
