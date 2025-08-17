/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Only enable CSS optimization in production; keep dev fast and stable
    optimizeCss: isProd,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compiler: {
    // Preserve error & warn logs in production while debugging; revert to true later
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    // Avoid caching dev chunks (paths like /_next/static/chunks/app/layout.js are not hashed in dev)
    // This prevents browsers from caching truncated scripts when the dev server restarts mid-stream.
    if (!isProd) return [];
    return [
      {
        source: "/_next/static/chunks/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60, s-maxage=60, stale-while-revalidate=59" },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    // Prevent accidental resolution of node "canvas" in server builds
    config.resolve.fallback = { ...(config.resolve.fallback || {}), canvas: false };

    return config;
  },
};

module.exports = nextConfig;
