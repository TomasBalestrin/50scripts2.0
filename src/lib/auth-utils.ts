import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Generate a secure random password (fallback only).
 */
export function generateSecurePassword(): string {
  const randomPart = crypto.randomBytes(16).toString('base64url');
  return `S${randomPart}!1a`;
}

/**
 * Loads the default password from app_config table.
 * Falls back to generateSecurePassword() if not configured.
 */
export async function getDefaultPassword(): Promise<string> {
  try {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'default_password')
      .single();

    if (data?.value) {
      // Value is stored as { value: "thePassword" } or as a plain string
      const pwd = typeof data.value === 'string'
        ? data.value
        : (data.value as Record<string, string>)?.value;

      if (pwd && pwd.trim() && pwd !== '(gerada automaticamente)') {
        return pwd;
      }
    }
  } catch {
    // DB read failed, use fallback
  }

  return generateSecurePassword();
}
