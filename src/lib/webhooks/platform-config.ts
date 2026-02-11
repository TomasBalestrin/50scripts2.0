import { createAdminClient } from '@/lib/supabase/server';

export interface PlatformConfig {
  token: string;
  products: {
    starter: string;
    pro: string;
    premium: string;
    copilot: string;
  };
}

const ENV_FALLBACK: Record<string, PlatformConfig> = {
  hotmart: {
    token: process.env.HOTMART_HOTTOK || '',
    products: {
      starter: process.env.HOTMART_PRODUCT_STARTER || '',
      pro: process.env.HOTMART_PRODUCT_PRO || '',
      premium: process.env.HOTMART_PRODUCT_PREMIUM || '',
      copilot: process.env.HOTMART_PRODUCT_COPILOT || '',
    },
  },
  kiwify: {
    token: process.env.KIWIFY_TOKEN || '',
    products: {
      starter: process.env.KIWIFY_PRODUCT_STARTER || '',
      pro: process.env.KIWIFY_PRODUCT_PRO || '',
      premium: process.env.KIWIFY_PRODUCT_PREMIUM || '',
      copilot: process.env.KIWIFY_PRODUCT_COPILOT || '',
    },
  },
  pagtrust: {
    token: process.env.PAGTRUST_TOKEN || '',
    products: {
      starter: process.env.PAGTRUST_PRODUCT_STARTER || '',
      pro: process.env.PAGTRUST_PRODUCT_PRO || '',
      premium: process.env.PAGTRUST_PRODUCT_PREMIUM || '',
      copilot: process.env.PAGTRUST_PRODUCT_COPILOT || '',
    },
  },
};

/**
 * Loads platform webhook config from app_config DB table,
 * falling back to environment variables if not set.
 */
export async function getPlatformConfig(platformId: string): Promise<PlatformConfig> {
  const envConfig = ENV_FALLBACK[platformId] || { token: '', products: { starter: '', pro: '', premium: '', copilot: '' } };

  try {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', `platform_${platformId}`)
      .single();

    if (data?.value) {
      const dbConfig = data.value as PlatformConfig;
      return {
        token: dbConfig.token || envConfig.token,
        products: {
          starter: dbConfig.products?.starter || envConfig.products.starter,
          pro: dbConfig.products?.pro || envConfig.products.pro,
          premium: dbConfig.products?.premium || envConfig.products.premium,
          copilot: dbConfig.products?.copilot || envConfig.products.copilot,
        },
      };
    }
  } catch {
    // DB read failed, use env vars
  }

  return envConfig;
}

/**
 * Builds a product ID → plan mapping from platform config.
 * Supports multiple IDs per plan (comma-separated).
 */
export function buildProductMap(config: PlatformConfig): Record<string, string> {
  const map: Record<string, string> = {};
  const plans: Array<[string, string]> = [
    ['starter', config.products.starter],
    ['pro', config.products.pro],
    ['premium', config.products.premium],
    ['copilot', config.products.copilot],
  ];
  for (const [plan, ids] of plans) {
    if (!ids) continue;
    for (const id of ids.split(',')) {
      const trimmed = id.trim();
      if (trimmed) map[trimmed] = plan;
    }
  }
  return map;
}
