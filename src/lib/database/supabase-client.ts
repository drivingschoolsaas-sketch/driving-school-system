import { createBrowserClient } from '@supabase/ssr';
import { getClientEnv } from '@/config/env';

// ==================================================
// Browser Supabase Client
// ==================================================
// Used in client components only.
// Uses the anon key — all queries go through RLS.

export function createClient() {
  const env = getClientEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
