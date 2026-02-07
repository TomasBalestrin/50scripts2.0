import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';

interface SystemConfig {
  ai_credits: {
    starter: number;
    pro: number;
    premium: number;
    copilot: number;
  };
  default_password: string;
  feature_flags: Record<string, boolean>;
  referral_rewards: Record<string, { type: string; value: number; label: string }>;
}

const DEFAULT_CONFIG: SystemConfig = {
  ai_credits: {
    starter: 0,
    pro: 0,
    premium: 15,
    copilot: -1,
  },
  default_password: '***',
  feature_flags: {
    ai_generation: true,
    referral_system: true,
    gamification: true,
    push_notifications: true,
    chrome_extension: false,
    semantic_search: true,
    audio_models: false,
  },
  referral_rewards: {
    '1': { type: 'ai_credits', value: 3, label: '3 creditos IA' },
    '3': { type: 'free_month', value: 1, label: '1 mes Pro gratis' },
    '10': { type: 'free_month', value: 1, label: '1 mes Premium gratis' },
  },
};

export async function GET() {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    // Attempt to read from system_config table
    const { data: configRows, error: queryError } = await supabase
      .from('system_config')
      .select('key, value')
      .order('key');

    if (queryError) {
      // Table may not exist yet; return defaults
      console.warn('[admin/config] system_config table not available, returning defaults');
      return NextResponse.json({ config: DEFAULT_CONFIG });
    }

    if (!configRows || configRows.length === 0) {
      return NextResponse.json({ config: DEFAULT_CONFIG });
    }

    // Merge stored config over defaults
    const storedConfig: Record<string, unknown> = {};
    for (const row of configRows) {
      try {
        storedConfig[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      } catch {
        storedConfig[row.key] = row.value;
      }
    }

    const config: SystemConfig = {
      ai_credits: (storedConfig.ai_credits as SystemConfig['ai_credits']) ?? DEFAULT_CONFIG.ai_credits,
      default_password: '***', // Never expose actual password
      feature_flags: (storedConfig.feature_flags as SystemConfig['feature_flags']) ?? DEFAULT_CONFIG.feature_flags,
      referral_rewards: (storedConfig.referral_rewards as SystemConfig['referral_rewards']) ?? DEFAULT_CONFIG.referral_rewards,
    };

    return NextResponse.json({ config });
  } catch (err) {
    console.error('[admin/config] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, supabase } = await getAdminUser();
    if (error) return error;

    const body = await request.json();
    const { ai_credits, feature_flags, referral_rewards } = body as Partial<SystemConfig>;

    const configEntries: { key: string; value: unknown }[] = [];

    if (ai_credits !== undefined) {
      configEntries.push({ key: 'ai_credits', value: ai_credits });
    }
    if (feature_flags !== undefined) {
      configEntries.push({ key: 'feature_flags', value: feature_flags });
    }
    if (referral_rewards !== undefined) {
      configEntries.push({ key: 'referral_rewards', value: referral_rewards });
    }

    if (configEntries.length === 0) {
      return NextResponse.json(
        { error: 'No config fields provided' },
        { status: 400 }
      );
    }

    // Upsert each config entry
    for (const entry of configEntries) {
      const { error: upsertError } = await supabase
        .from('system_config')
        .upsert(
          {
            key: entry.key,
            value: JSON.stringify(entry.value),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (upsertError) {
        console.error(`[admin/config] Error upserting config key "${entry.key}":`, upsertError);
        return NextResponse.json(
          { error: `Failed to save config key "${entry.key}"` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/config] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
