import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getServerEnv, getClientEnv, _resetEnvCache } from '../env';

describe('Environment Validation', () => {
  const validEnv = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    NEXT_PUBLIC_PLATFORM_DOMAIN: 'driveflow.com.au',
    NEXT_PUBLIC_PLATFORM_NAME: 'DriveFlow',
    NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN: 'admin',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  };

  beforeEach(() => {
    _resetEnvCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getServerEnv', () => {
    it('validates a complete environment', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', validEnv.NEXT_PUBLIC_SUPABASE_URL);
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', validEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', validEnv.SUPABASE_SERVICE_ROLE_KEY);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_DOMAIN', validEnv.NEXT_PUBLIC_PLATFORM_DOMAIN);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_NAME', validEnv.NEXT_PUBLIC_PLATFORM_NAME);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN', validEnv.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN);
      vi.stubEnv('NEXT_PUBLIC_APP_URL', validEnv.NEXT_PUBLIC_APP_URL);
      vi.stubEnv('NODE_ENV', validEnv.NODE_ENV);

      const env = getServerEnv();
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(validEnv.NEXT_PUBLIC_SUPABASE_URL);
      expect(env.NEXT_PUBLIC_PLATFORM_DOMAIN).toBe('driveflow.com.au');
    });

    it('throws on missing required variables', () => {
      // Don't stub any env vars
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

      expect(() => getServerEnv()).toThrow('Invalid server environment variables');
    });

    it('throws on invalid URL format', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'not-a-url');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', validEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', validEnv.SUPABASE_SERVICE_ROLE_KEY);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_DOMAIN', validEnv.NEXT_PUBLIC_PLATFORM_DOMAIN);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_NAME', validEnv.NEXT_PUBLIC_PLATFORM_NAME);
      vi.stubEnv('NEXT_PUBLIC_APP_URL', validEnv.NEXT_PUBLIC_APP_URL);
      vi.stubEnv('NODE_ENV', validEnv.NODE_ENV);

      expect(() => getServerEnv()).toThrow('Invalid server environment variables');
    });

    it('caches after first successful validation', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', validEnv.NEXT_PUBLIC_SUPABASE_URL);
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', validEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', validEnv.SUPABASE_SERVICE_ROLE_KEY);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_DOMAIN', validEnv.NEXT_PUBLIC_PLATFORM_DOMAIN);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_NAME', validEnv.NEXT_PUBLIC_PLATFORM_NAME);
      vi.stubEnv('NEXT_PUBLIC_APP_URL', validEnv.NEXT_PUBLIC_APP_URL);
      vi.stubEnv('NODE_ENV', validEnv.NODE_ENV);

      const first = getServerEnv();
      const second = getServerEnv();
      expect(first).toBe(second); // same reference
    });
  });

  describe('getClientEnv', () => {
    it('validates client-safe variables', () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', validEnv.NEXT_PUBLIC_SUPABASE_URL);
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', validEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_DOMAIN', validEnv.NEXT_PUBLIC_PLATFORM_DOMAIN);
      vi.stubEnv('NEXT_PUBLIC_PLATFORM_NAME', validEnv.NEXT_PUBLIC_PLATFORM_NAME);
      vi.stubEnv('NEXT_PUBLIC_APP_URL', validEnv.NEXT_PUBLIC_APP_URL);

      const env = getClientEnv();
      expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(validEnv.NEXT_PUBLIC_SUPABASE_URL);
      // Service role key should NOT be accessible
      expect(env).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
    });
  });
});
