// ==================================================
// Protected Route Guard
// ==================================================
// Server-side guard that combines:
// 1. Session validation (Supabase Auth)
// 2. Tenant resolution (hostname → organization)
// 3. Membership authorization (user → org membership)
//
// Use in Server Components and Server Actions for
// pages behind /admin or /portal.

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/database/supabase-server';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { getSession } from './session';
import {
  authorizeForOrganization,
  requirePermission,
  requireRole,
  type AuthorizedContext,
} from './authorization';
import { resolveHostname, resolveTenantBySlug } from '@/lib/tenant/resolve-hostname';
import type { TenantContext } from '@/lib/tenant/tenant-context';
import type { UserRole } from '@/config/constants';
import type { Permission } from '@/permissions/roles';
import { logger } from '@/lib/logging';

const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'driveflow.com.au';
const ADMIN_SUBDOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN ?? 'admin';

/**
 * The full context available after a protected route guard passes.
 */
export interface ProtectedRouteContext {
  /** Authenticated user ID */
  userId: string;
  /** User email */
  userEmail: string;
  /** Authorization context (membership, role) */
  auth: AuthorizedContext;
  /** Resolved tenant context */
  tenant: TenantContext;
}

/**
 * Guard a page that requires authentication + tenant membership.
 *
 * Redirects to /auth/sign-in if:
 * - User is not authenticated
 *
 * Redirects to /auth/error if:
 * - Hostname does not resolve to a tenant
 * - User has no active membership in the resolved org
 *
 * @param options - Optional role or permission requirements
 */
export async function protectRoute(options?: {
  minimumRole?: UserRole;
  requiredPermission?: Permission;
}): Promise<ProtectedRouteContext> {
  // Step 1: Get session
  const { user, authenticated } = await getSession();

  if (!authenticated || !user) {
    logger.debug('Protected route: unauthenticated, redirecting to sign-in', {
      feature: 'auth',
      operation: 'protect_route',
    });
    redirect('/auth/sign-in');
  }

  // Step 2: Resolve tenant from hostname (or ?tenant= override on Vercel)
  const headerStore = await headers();
  const hostname = headerStore.get('x-normalized-hostname') ?? headerStore.get('host') ?? 'localhost';
  const tenantOverride = headerStore.get('x-tenant-override');

  const supabase = await createServerSupabaseClient();
  const adminClient = getAdminClient();

  let resolved;

  // On Vercel (.vercel.app), hostname resolves as 'preview' not 'tenant'.
  // Check for ?tenant= query parameter override first (set by middleware).
  if (tenantOverride) {
    try {
      resolved = await resolveTenantBySlug(adminClient, tenantOverride, hostname);
    } catch {
      logger.warn('Protected route: tenant override slug not found', {
        feature: 'auth',
        operation: 'protect_route',
        tenantOverride,
        userId: user.id,
      });
      redirect('/auth/error?code=TENANT_RESOLUTION_FAILED');
    }
  } else {
    try {
      resolved = await resolveHostname(hostname, {
        platformDomain: PLATFORM_DOMAIN,
        adminSubdomain: ADMIN_SUBDOMAIN,
      }, supabase);
    } catch {
      logger.warn('Protected route: tenant resolution failed', {
        feature: 'auth',
        operation: 'protect_route',
        hostname,
        userId: user.id,
      });
      redirect('/auth/error?code=TENANT_RESOLUTION_FAILED');
    }
  }

  if (resolved.kind !== 'tenant') {
    logger.warn('Protected route: not a tenant hostname', {
      feature: 'auth',
      operation: 'protect_route',
      hostname,
      kind: resolved.kind,
    });
    redirect('/auth/error?code=NOT_A_TENANT');
  }

  const tenant = resolved.tenant;

  // Step 3: Get user memberships and authorize
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', user.id);

  let authContext: AuthorizedContext;
  try {
    authContext = authorizeForOrganization({
      userId: user.id,
      resolvedOrganizationId: tenant.organizationId,
      memberships: memberships ?? [],
    });
  } catch {
    logger.warn('Protected route: authorization failed', {
      feature: 'auth',
      operation: 'protect_route',
      userId: user.id,
      organizationId: tenant.organizationId,
    });
    redirect('/auth/error?code=ACCESS_DENIED');
  }

  // Step 4: Check role/permission if specified
  if (options?.minimumRole) {
    try {
      requireRole(authContext, options.minimumRole);
    } catch {
      redirect('/auth/error?code=INSUFFICIENT_ROLE');
    }
  }

  if (options?.requiredPermission) {
    try {
      requirePermission(authContext, options.requiredPermission);
    } catch {
      redirect('/auth/error?code=INSUFFICIENT_PERMISSION');
    }
  }

  return {
    userId: user.id,
    userEmail: user.email ?? '',
    auth: authContext,
    tenant,
  };
}
