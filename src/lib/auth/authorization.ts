// ==================================================
// Server-Side Authorization
// ==================================================
// Validates that an authenticated user has an active
// membership in the resolved organization and checks
// role/permission requirements.
//
// CRITICAL: This module runs on the server only.
// It implements steps 3-6 of the authorization flow:
//   1. ✅ Resolve organization from hostname (tenant resolver)
//   2. ✅ Authenticate user (Supabase Auth)
//   3. Find active organization membership
//   4. Confirm membership org matches resolved org
//   5. Check role
//   6. Check permission

import { type UserRole } from '@/config/constants';
import {
  hasPermission,
  isAtLeastRole,
  type Permission,
} from '@/permissions/roles';
import { AuthErrors, TenantErrors } from '@/lib/errors';
import { logger } from '@/lib/logging';
import type { OrganizationMember } from '@/types/database';

/**
 * Represents a validated authorization context.
 * Only created after all checks pass — if you have one of these,
 * the user is authorized for the resolved organization.
 */
export interface AuthorizedContext {
  /** Authenticated user ID */
  userId: string;
  /** The organization the user is authorized for */
  organizationId: string;
  /** The user's membership record */
  membership: OrganizationMember;
  /** The user's role in this organization */
  role: UserRole;
}

export interface AuthorizationInput {
  /** Authenticated user ID (from Supabase Auth) */
  userId: string;
  /** Organization ID resolved from hostname */
  resolvedOrganizationId: string;
  /** User's membership records (fetched from DB) */
  memberships: OrganizationMember[];
}

/**
 * Authorize a user for a specific organization.
 *
 * This validates:
 * 1. The user has a membership in the resolved organization
 * 2. The membership is active
 * 3. The membership organization matches the resolved organization
 *
 * @throws {AppError} AUTH_001 if no user, TENANT_001 if access denied
 */
export function authorizeForOrganization(
  input: AuthorizationInput
): AuthorizedContext {
  const { userId, resolvedOrganizationId, memberships } = input;

  if (!userId) {
    throw AuthErrors.unauthenticated();
  }

  // Find membership for the resolved organization
  const membership = memberships.find(
    (m) =>
      m.organization_id === resolvedOrganizationId &&
      m.user_id === userId &&
      m.status === 'active'
  );

  if (!membership) {
    logger.warn('Authorization denied: no active membership', {
      feature: 'auth',
      operation: 'authorize_for_organization',
      userId,
      organizationId: resolvedOrganizationId,
    });

    throw TenantErrors.accessDenied({
      userId,
      organizationId: resolvedOrganizationId,
    });
  }

  // Double-check: membership org must match resolved org
  // This is a safety check against programming errors
  if (membership.organization_id !== resolvedOrganizationId) {
    logger.error('CRITICAL: Organization mismatch in authorization', undefined, {
      feature: 'auth',
      operation: 'authorize_for_organization',
      userId,
      membershipOrgId: membership.organization_id,
      resolvedOrgId: resolvedOrganizationId,
    });

    throw TenantErrors.accessDenied({
      userId,
      organizationId: resolvedOrganizationId,
      reason: 'organization_mismatch',
    });
  }

  return {
    userId,
    organizationId: resolvedOrganizationId,
    membership,
    role: membership.role,
  };
}

/**
 * Check that the authorized user has a specific permission.
 *
 * @throws {AppError} AUTH_002 if permission denied
 */
export function requirePermission(
  context: AuthorizedContext,
  permission: Permission
): void {
  if (!hasPermission(context.role, permission)) {
    logger.warn('Permission denied', {
      feature: 'auth',
      operation: 'require_permission',
      userId: context.userId,
      organizationId: context.organizationId,
      role: context.role,
      permission,
    });

    throw AuthErrors.forbidden({
      userId: context.userId,
      organizationId: context.organizationId,
      requiredPermission: permission,
      actualRole: context.role,
    });
  }
}

/**
 * Check that the authorized user has at least the specified role.
 *
 * @throws {AppError} AUTH_002 if role insufficient
 */
export function requireRole(
  context: AuthorizedContext,
  minimumRole: UserRole
): void {
  if (!isAtLeastRole(context.role, minimumRole)) {
    logger.warn('Role requirement not met', {
      feature: 'auth',
      operation: 'require_role',
      userId: context.userId,
      organizationId: context.organizationId,
      actualRole: context.role,
      requiredRole: minimumRole,
    });

    throw AuthErrors.forbidden({
      userId: context.userId,
      organizationId: context.organizationId,
      requiredRole: minimumRole,
      actualRole: context.role,
    });
  }
}
