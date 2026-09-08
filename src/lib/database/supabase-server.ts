import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/config/env';

// ==================================================
// Server Supabase Client
// ==================================================
// Used in Server Components, Server Actions, and Route Handlers.
// Uses the anon key with cookie-based auth — queries go through RLS.

export async function createServerSupabaseClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — cookies are read-only.
            // This is expected when refreshing tokens in RSCs.
          }
        },
      },
    }
  );
}
