import type { NextConfig } from "next";

// P2-1: Content Security Policy
// Next.js App Router uses inline scripts for hydration, so we need
// 'unsafe-inline' for scripts. A nonce-based approach requires a
// custom server or middleware-injected nonces (future improvement).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://*.supabase.co';
const supabaseDomain = (() => {
  try { return new URL(supabaseUrl).origin; } catch { return 'https://*.supabase.co'; }
})();

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,  // unsafe-eval needed by Next.js dev; stripped in prod ideally
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' ${supabaseDomain} data: blob: https:`,  // tenant images can be anywhere
  `connect-src 'self' ${supabaseDomain} https://*.supabase.co wss://*.supabase.co`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

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
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
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
