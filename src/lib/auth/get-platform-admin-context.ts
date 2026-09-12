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

import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/database';
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

    // 2. Verify hostname is the admin domain (or localhost/preview in dev/staging)
    const headerStore = await headers();
    const hostname = headerStore.get('host') ?? 'localhost';

    // Import classifyHostname to do a quick check without a DB call
    // when the hostname is a known preview/localhost type.
    const { classifyHostname } = await import('@/lib/tenant/domain-normalizer');
    const classification = classifyHostname(
      hostname,
      env.NEXT_PUBLIC_PLATFORM_DOMAIN,
      env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN
    );

    // Allow platform_admin hostname, localhost in dev, or preview
    // deployments (e.g., .vercel.app). Preview/localhost still require
    // a valid platform role (checked in step 3 below).
    const isAllowedHostname =
      classification.type === 'platform_admin' ||
      classification.type === 'localhost' ||
      classification.type === 'preview';

    if (!isAllowedHostname) {
      logger.warn('Platform admin access from non-admin hostname', {
        feature: 'platform_admin',
        operation: 'get_platform_admin_context',
        hostname,
        hostnameType: classification.type,
      });
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
