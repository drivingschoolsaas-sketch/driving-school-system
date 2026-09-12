import { z } from 'zod';

// ==================================================
// Environment Variable Validation
// ==================================================
// All environment variables are validated at startup.
// Missing or invalid variables cause a clear error.

const serverEnvSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Platform
  NEXT_PUBLIC_PLATFORM_DOMAIN: z.string().min(1, 'NEXT_PUBLIC_PLATFORM_DOMAIN is required'),
  NEXT_PUBLIC_PLATFORM_NAME: z.string().min(1, 'NEXT_PUBLIC_PLATFORM_NAME is required'),
  NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN: z.string().default('admin'),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Security — optional secondary PIN for admin access
  PLATFORM_ADMIN_PIN: z.string().min(4, 'PLATFORM_ADMIN_PIN must be at least 4 characters').optional(),

  // Development only — explicit tenant slug for localhost
  DEV_TENANT_SLUG: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_PLATFORM_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_PLATFORM_NAME: z.string().min(1),
  NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN: z.string().default('admin'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Lazy-initialized singleton for server environment
let _serverEnv: ServerEnv | null = null;

/**
 * Get validated server-side environment variables.
 * Throws on first call if any variable is missing/invalid.
 * Cached after first successful validation.
 */
export function getServerEnv(): ServerEnv {
  if (_serverEnv) return _serverEnv;

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `❌ Invalid server environment variables:\n${formatted}\n\nCheck .env.local against .env.example`
    );
  }

  _serverEnv = result.data;
  return _serverEnv;
}

// Client environment — safe to use in browser
let _clientEnv: ClientEnv | null = null;

export function getClientEnv(): ClientEnv {
  if (_clientEnv) return _clientEnv;

  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_PLATFORM_DOMAIN: process.env.NEXT_PUBLIC_PLATFORM_DOMAIN,
    NEXT_PUBLIC_PLATFORM_NAME: process.env.NEXT_PUBLIC_PLATFORM_NAME,
    NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN:
      process.env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const result = clientEnvSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `❌ Invalid client environment variables:\n${formatted}`
    );
  }

  _clientEnv = result.data;
  return _clientEnv;
}

/**
 * Reset cached env (for testing only)
 */
export function _resetEnvCache(): void {
  _serverEnv = null;
  _clientEnv = null;
}
