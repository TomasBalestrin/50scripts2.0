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
};

export default nextConfig;
