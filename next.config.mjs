/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable gzip/brotli compression
  compress: true,

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
  },

  // Disable source maps in production (smaller bundle)
  productionBrowserSourceMaps: false,

  // Strict mode for better React performance (catches issues early)
  reactStrictMode: true,

  // Optimize package imports - tree-shake heavy libraries
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },

  // Cache and security headers
  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    return [
      {
        // Security headers on all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Immutable cache for Next.js static assets
        source: '/_next/static/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Short cache + SWR for API routes
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        // Cache images for 24h
        source: '/:path*.(webp|avif|jpg|png|svg|ico)',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=86400, immutable' },
        ],
      },
      {
        // Immutable cache for fonts
        source: '/fonts/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
