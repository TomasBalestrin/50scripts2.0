import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { error } = await getAdminUser();
    if (error) return error;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const plan = searchParams.get('plan');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Use admin client to bypass RLS and see all users
    const adminClient = await createAdminClient();

    let query = adminClient
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (plan) {
      query = query.eq('plan', plan);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, error: queryError, count } = await query;

    if (queryError) {
      console.error('[admin/users] Error fetching users:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
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
    const { error } = await getAdminUser();
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
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1) {
      // Only updated_at, nothing to change
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    const { data: profile, error: updateError } = await adminClient
      .from('profiles')
      .update(updates)
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

export async function POST(request: NextRequest) {
  try {
    const { error } = await getAdminUser();
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

    // Create auth user
    const { data: authData, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      console.error('[admin/users] Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    // Ensure profile exists (trigger may not exist or may be slow)
    if (authData.user) {
      const now = new Date().toISOString();
      const referralCode = authData.user.id.slice(0, 8).toUpperCase();

      const { error: upsertError } = await adminClient
        .from('profiles')
        .upsert({
          id: authData.user.id,
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
          referral_code: referralCode,
          referred_by: null,
          webhook_source: null,
          password_changed: false,
          last_login_at: null,
          created_at: now,
          updated_at: now,
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error('[admin/users] Error upserting profile:', upsertError);
        return NextResponse.json(
          { error: `User created but profile failed: ${upsertError.message}` },
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
