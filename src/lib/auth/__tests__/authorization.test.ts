import { describe, it, expect } from 'vitest';
import {
  authorizeForOrganization,
  requirePermission,
  requireRole,
} from '../authorization';
import { PERMISSIONS } from '@/permissions/roles';
import { USER_ROLES } from '@/config/constants';
import type { OrganizationMember } from '@/types/database';
import { expectAppError } from '@/tests/helpers';

// ==================================================
// Authorization Tests
// ==================================================

const ORG_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_A_ID = '11111111-1111-1111-1111-111111111111';
const USER_B_ID = '22222222-2222-2222-2222-222222222222';

function makeMembership(
  orgId: string,
  userId: string,
  role: string,
  status: string = 'active'
): OrganizationMember {
  return {
    id: `mem-${orgId.slice(0, 8)}-${userId.slice(0, 8)}`,
    organization_id: orgId,
    user_id: userId,
    role: role as OrganizationMember['role'],
    status: status as OrganizationMember['status'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('authorizeForOrganization', () => {
  it('authorizes user with active membership in the correct org', () => {
    const memberships = [
      makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
    ];

    const result = authorizeForOrganization({
      userId: USER_A_ID,
      resolvedOrganizationId: ORG_A_ID,
      memberships,
    });

    expect(result.userId).toBe(USER_A_ID);
    expect(result.organizationId).toBe(ORG_A_ID);
    expect(result.role).toBe(USER_ROLES.SCHOOL_OWNER);
  });

  it('denies access when user has NO membership in the organization', () => {
    const memberships = [
      makeMembership(ORG_B_ID, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
    ];

    expectAppError(
      () =>
        authorizeForOrganization({
          userId: USER_A_ID,
          resolvedOrganizationId: ORG_A_ID,
          memberships,
        }),
      'TENANT_001_ACCESS_DENIED'
    );
  });

  it('denies access when membership is suspended', () => {
    const memberships = [
      makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.SCHOOL_OWNER, 'suspended'),
    ];

    expectAppError(
      () =>
        authorizeForOrganization({
          userId: USER_A_ID,
          resolvedOrganizationId: ORG_A_ID,
          memberships,
        }),
      'TENANT_001_ACCESS_DENIED'
    );
  });

  it('denies access when membership is removed', () => {
    const memberships = [
      makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.SCHOOL_OWNER, 'removed'),
    ];

    expectAppError(
      () =>
        authorizeForOrganization({
          userId: USER_A_ID,
          resolvedOrganizationId: ORG_A_ID,
          memberships,
        }),
      'TENANT_001_ACCESS_DENIED'
    );
  });

  it('denies access when membership is invited (not yet active)', () => {
    const memberships = [
      makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.STUDENT, 'invited'),
    ];

    expectAppError(
      () =>
        authorizeForOrganization({
          userId: USER_A_ID,
          resolvedOrganizationId: ORG_A_ID,
          memberships,
        }),
      'TENANT_001_ACCESS_DENIED'
    );
  });

  it('throws unauthenticated when userId is empty', () => {
    expectAppError(
      () =>
        authorizeForOrganization({
          userId: '',
          resolvedOrganizationId: ORG_A_ID,
          memberships: [],
        }),
      'AUTH_001_UNAUTHENTICATED'
    );
  });

  // ===== CROSS-TENANT ISOLATION TESTS =====

  it('User A CANNOT access Organization B', () => {
    const memberships = [
      makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
    ];

    expectAppError(
      () =>
        authorizeForOrganization({
          userId: USER_A_ID,
          resolvedOrganizationId: ORG_B_ID,
          memberships,
        }),
      'TENANT_001_ACCESS_DENIED'
    );
  });

  it('User B CANNOT access Organization A', () => {
    const memberships = [
      makeMembership(ORG_B_ID, USER_B_ID, USER_ROLES.SCHOOL_OWNER),
    ];

    expectAppError(
      () =>
        authorizeForOrganization({
          userId: USER_B_ID,
          resolvedOrganizationId: ORG_A_ID,
          memberships,
        }),
      'TENANT_001_ACCESS_DENIED'
    );
  });

  it('User A can access Org A but NOT Org B (both orgs tested)', () => {
    const membershipsA = [
      makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
    ];

    // A → A: allowed
    const resultA = authorizeForOrganization({
      userId: USER_A_ID,
      resolvedOrganizationId: ORG_A_ID,
      memberships: membershipsA,
    });
    expect(resultA.organizationId).toBe(ORG_A_ID);

    // A → B: denied
    expectAppError(
      () =>
        authorizeForOrganization({
          userId: USER_A_ID,
          resolvedOrganizationId: ORG_B_ID,
          memberships: membershipsA,
        }),
      'TENANT_001_ACCESS_DENIED'
    );
  });

  it('user with memberships in BOTH orgs can only access the resolved one', () => {
    const memberships = [
      makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
      makeMembership(ORG_B_ID, USER_A_ID, USER_ROLES.STUDENT),
    ];

    // Accessing org A — should get school_owner role
    const resultA = authorizeForOrganization({
      userId: USER_A_ID,
      resolvedOrganizationId: ORG_A_ID,
      memberships,
    });
    expect(resultA.role).toBe(USER_ROLES.SCHOOL_OWNER);
    expect(resultA.organizationId).toBe(ORG_A_ID);

    // Accessing org B — should get student role
    const resultB = authorizeForOrganization({
      userId: USER_A_ID,
      resolvedOrganizationId: ORG_B_ID,
      memberships,
    });
    expect(resultB.role).toBe(USER_ROLES.STUDENT);
    expect(resultB.organizationId).toBe(ORG_B_ID);
  });
});

describe('requirePermission', () => {
  const role: typeof USER_ROLES.INSTRUCTOR = USER_ROLES.INSTRUCTOR;
  const context = {
    userId: USER_A_ID,
    organizationId: ORG_A_ID,
    membership: makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.INSTRUCTOR),
    role,
  };

  it('does not throw when permission is granted', () => {
    expect(() =>
      requirePermission(context, PERMISSIONS.BOOKING_VIEW)
    ).not.toThrow();
  });

  it('throws AUTH_002 when permission is denied', () => {
    expectAppError(
      () => requirePermission(context, PERMISSIONS.STUDENT_DELETE),
      'AUTH_002_FORBIDDEN'
    );
  });
});

describe('requireRole', () => {
  const instructorRole: typeof USER_ROLES.INSTRUCTOR = USER_ROLES.INSTRUCTOR;
  const instructorContext = {
    userId: USER_A_ID,
    organizationId: ORG_A_ID,
    membership: makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.INSTRUCTOR),
    role: instructorRole,
  };

  it('does not throw when role meets minimum', () => {
    expect(() =>
      requireRole(instructorContext, USER_ROLES.INSTRUCTOR)
    ).not.toThrow();
  });

  it('throws AUTH_002 when role is below minimum', () => {
    expectAppError(
      () => requireRole(instructorContext, USER_ROLES.SCHOOL_ADMIN),
      'AUTH_002_FORBIDDEN'
    );
  });

  const ownerRole: typeof USER_ROLES.SCHOOL_OWNER = USER_ROLES.SCHOOL_OWNER;
  const ownerContext = {
    userId: USER_A_ID,
    organizationId: ORG_A_ID,
    membership: makeMembership(ORG_A_ID, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
    role: ownerRole,
  };

  it('school_owner meets school_admin minimum', () => {
    expect(() =>
      requireRole(ownerContext, USER_ROLES.SCHOOL_ADMIN)
    ).not.toThrow();
  });
});
