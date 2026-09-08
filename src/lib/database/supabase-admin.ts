import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/config/env';

// ==================================================
// Admin Supabase Client (Service Role)
// ==================================================
// ⚠️  DANGER: This client bypasses RLS entirely.
// Use ONLY in trusted server-side code where you have
// already validated tenant context and authorization.
//
// NEVER import this in client components.
// NEVER use this for user-facing queries without
// explicit organization_id scoping.

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (_adminClient) return _adminClient;

  const env = getServerEnv();
  _adminClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return _adminClient;
}

/**
 * Reset admin client (for testing only)
 */
export function _resetAdminClient(): void {
  _adminClient = null;
}
