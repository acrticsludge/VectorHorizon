import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Vercel deployment
  output: 'standalone',

  // Image optimization: allow external images from Cloudflare R2
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
    ],
  },

};

export default nextConfig;
