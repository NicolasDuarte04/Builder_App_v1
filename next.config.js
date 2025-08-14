/** @type {import('next').NextConfig} */
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
    optimizeCss: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  poweredByHeader: false,
  compress: true,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    // Keep aliases minimal; let runtime choose pdf.js build via robust probing
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Prevent accidental server bundling of node-canvas
      canvas: false,
    };

    // Keep worker rule if bundler needs to treat worker paths as assets
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?m?js$/,
      type: 'asset/resource',
    });

    return config;
  },
};

module.exports = nextConfig;
