import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from any tenant's custom domain
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Security headers applied via vercel.json in production;
  // this covers `next dev` and non-Vercel hosts.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Log the build ID so production debugging is traceable
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? `local-${Date.now()}`;
  },

  // Strict mode for React dev
  reactStrictMode: true,

  // Output standalone for Docker deployments (ignored by Vercel)
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
};

export default nextConfig;
