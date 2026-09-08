// ==================================================
// Session Helpers
// ==================================================
// Server-side utilities for getting the current user
// session from Supabase Auth. These run in Server
// Components, Server Actions, and Route Handlers.

import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/database/supabase-server';
import { logger } from '@/lib/logging';

/**
 * Result of a session check.
 */
export interface SessionResult {
  /** The authenticated user, or null if not logged in */
  user: User | null;
  /** Whether the session is valid */
  authenticated: boolean;
}

/**
 * Get the current user session from Supabase Auth.
 * Returns { user: null, authenticated: false } when not logged in.
 * Does NOT throw — callers decide what to do with unauthenticated state.
 */
export async function getSession(): Promise<SessionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, authenticated: false };
    }

    return { user, authenticated: true };
  } catch (error) {
    logger.error('Failed to get session', error, {
      feature: 'auth',
      operation: 'get_session',
    });
    return { user: null, authenticated: false };
  }
}

/**
 * Get the current user or throw.
 * Use this in server actions or route handlers where
 * authentication is required.
 *
 * @throws Redirects or throws if not authenticated
 */
export async function requireSession(): Promise<User> {
  const { user, authenticated } = await getSession();

  if (!authenticated || !user) {
    throw new Error('AUTH_REQUIRED');
  }

  return user;
}
