import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * POST /api/setup/admin
 *
 * One-time setup route to create the initial admin user.
 * Requires SETUP_SECRET or WEBHOOK_SECRET to prevent unauthorized access.
 *
 * Body: { email, full_name?, password?, secret }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, full_name, password, secret } = body;

    // Validate secret
    const validSecret =
      process.env.SETUP_SECRET ||
      process.env.WEBHOOK_SECRET ||
      process.env.CRON_SECRET;

    if (!validSecret || secret !== validSecret) {
      return NextResponse.json(
        { error: 'Unauthorized – invalid secret' },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create admin Supabase client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (existingProfile) {
      // User exists – just upgrade to admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          plan: 'copilot',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update role', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'User already existed – upgraded to admin',
        email: existingProfile.email,
        role: 'admin',
        plan: 'copilot',
      });
    }

    // Create new auth user
    const userPassword = password || process.env.DEFAULT_USER_PASSWORD || 'Script@123';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
    });

    let userId: string;

    if (authError || !authData.user) {
      // Auth user may already exist without a profile – look them up
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const found = existingUsers?.users?.find((u) => u.email === email);
      if (!found) {
        return NextResponse.json(
          { error: 'Failed to create auth user', details: authError?.message },
          { status: 500 }
        );
      }
      userId = found.id;
    } else {
      userId = authData.user.id;
    }
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Create profile as admin with copilot plan (highest tier)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      full_name: full_name || 'Admin',
      plan: 'copilot',
      role: 'admin',
      referral_code: referralCode,
      is_active: true,
      ai_credits_remaining: 9999,
      ai_credits_monthly: 9999,
      onboarding_completed: true,
    });

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to create profile', details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Admin user created successfully',
      email,
      role: 'admin',
      plan: 'copilot',
      password: userPassword,
      referral_code: referralCode,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}
