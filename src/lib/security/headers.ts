/**
 * Security headers to add to API responses.
 * These headers help protect against common web vulnerabilities.
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking by denying iframe embedding
    'X-Frame-Options': 'DENY',

    // Enable XSS filter in older browsers
    'X-XSS-Protection': '1; mode=block',

    // Control referrer information sent with requests
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Restrict browser features/APIs
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',

    // Enforce HTTPS with a 2-year max-age
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

    // Content Security Policy - controls resource loading
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com",
    ].join('; ') + ';',
  };
}

/**
 * Apply security headers to a Response object.
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders();
  const newHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(headers)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * CORS headers for API routes that need cross-origin access.
 * Use sparingly - only for routes accessed by the Chrome extension.
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    // Chrome extension origins are chrome-extension://<id>
  ];

  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.startsWith('chrome-extension://')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Headers for downloadable file responses (e.g., data export).
 */
export function getDownloadHeaders(filename: string, contentType: string = 'application/json'): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };
}
