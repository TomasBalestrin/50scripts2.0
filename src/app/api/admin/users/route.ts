import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const plan = searchParams.get('plan');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select(
        'id, email, full_name, plan, role, xp_points, level, current_streak, created_at, last_login_at, is_active',
        { count: 'exact' }
      )
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

    const transformed = (users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      plan: u.plan,
      role: u.role,
      xp: u.xp_points,
      level: u.level,
      streak_count: u.current_streak,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
      is_active: u.is_active,
    }));

    return NextResponse.json({
      users: transformed,
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
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1) {
      // Only updated_at, nothing to change
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: profile, error: updateError } = await supabase
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
