// ==================================================
// Platform Admin Authorization Helper
// ==================================================
// Server-side helper that validates the authenticated
// user is a platform admin (platform_owner or
// platform_support). Used by all platform admin pages.
//
// Platform admins are NOT scoped to a single org.
// They use the admin client (service role) to query
// across all organizations.

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/database';
import { resolveHostname } from '@/lib/tenant/resolve-hostname';
import { getServerEnv } from '@/config/env';
import { logger } from '@/lib/logging';
import { isPlatformRole } from '@/permissions/roles';
import { headers } from 'next/headers';
import type { UserRole } from '@/config/constants';

export interface PlatformAdminContext {
  /** Authenticated user ID */
  userId: string;
  /** User email */
  email: string;
  /** Platform role (platform_owner or platform_support) */
  role: UserRole;
}

/**
 * Get the authenticated platform admin context.
 *
 * Validates:
 * 1. User is authenticated
 * 2. Hostname resolves to platform_admin (or localhost in dev)
 * 3. User has a platform-level role in at least one org membership
 *
 * Platform admins are identified by having a membership with
 * role = 'platform_owner' or 'platform_support' in ANY org.
 *
 * @throws Redirects to /auth/sign-in on failure
 */
export async function getPlatformAdminContext(): Promise<PlatformAdminContext> {
  try {
    const env = getServerEnv();
    const client = await createServerSupabaseClient();

    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user) {
      redirect('/auth/sign-in');
    }

    // 2. Verify hostname is the admin domain (or localhost in dev)
    const headerStore = await headers();
    const hostname = headerStore.get('host') ?? 'localhost';
    const resolved = await resolveHostname(
      hostname,
      {
        platformDomain: env.NEXT_PUBLIC_PLATFORM_DOMAIN,
        adminSubdomain: env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN,
      },
      client
    );

    // Allow platform_admin and localhost (dev)
    if (resolved.kind !== 'platform') {
      logger.warn('Platform admin access from non-admin hostname', {
        feature: 'platform_admin',
        operation: 'get_platform_admin_context',
        hostname,
      });
      redirect('/auth/sign-in');
    }

    const platformType = resolved.platform.type;
    if (platformType !== 'platform_admin' && platformType !== 'localhost') {
      redirect('/auth/sign-in');
    }

    // 3. Check that the user has a platform role
    const { data: memberships } = await client
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const platformMembership = (memberships ?? []).find((m) =>
      isPlatformRole(m.role as UserRole)
    );

    if (!platformMembership) {
      logger.warn('Platform admin access denied: not a platform role', {
        feature: 'platform_admin',
        operation: 'get_platform_admin_context',
        userId: user.id,
      });
      redirect('/auth/sign-in');
    }

    return {
      userId: user.id,
      email: user.email ?? '',
      role: platformMembership.role as UserRole,
    };
  } catch (error) {
    // redirect() throws a special Next.js error — rethrow it
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    logger.warn('Platform admin access denied', {
      feature: 'platform_admin',
      operation: 'get_platform_admin_context',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    redirect('/auth/sign-in');
  }
}
