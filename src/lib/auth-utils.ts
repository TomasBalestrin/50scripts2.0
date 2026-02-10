import crypto from 'crypto';

/**
 * Generate a secure random password for webhook-created users.
 * Users are always forced to change on first login.
 */
export function generateSecurePassword(): string {
  // 16 bytes = 128 bits of entropy, base64 encoded
  const randomPart = crypto.randomBytes(16).toString('base64url');
  // Ensure at least one uppercase, one lowercase, one digit, one special char
  return `S${randomPart}!1a`;
}
