import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRedirectUrl } from '@/lib/auth/redirect-url';
import { authorizeForOrganization } from '@/lib/auth/authorization';
import { USER_ROLES } from '@/config/constants';
import type { OrganizationMember } from '@/types/database';
import { expectAppError } from './helpers';

// ==================================================
// Cross-Domain Authentication Tests
// ==================================================
// Validates that authentication flows respect tenant
// boundaries and cannot be exploited across domains.

const ORG_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Sydney Smart Driving',
  slug: 'sydneysmart',
  domain: 'sydneysmart.driveflow.com.au',
  customDomain: 'sydneysmartdriving.com.au',
};

const ORG_B = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'ABC Driving School',
  slug: 'abcdriving',
  domain: 'abcdriving.driveflow.com.au',
};

const USER_A_ID = '11111111-1111-1111-1111-111111111111';
const USER_B_ID = '22222222-2222-2222-2222-222222222222';

function makeMembership(
  orgId: string,
  userId: string,
  role: string,
  status: string = 'active'
): OrganizationMember {
  return {
    id: `mem-${orgId.slice(0, 4)}-${userId.slice(0, 4)}`,
    organization_id: orgId,
    user_id: userId,
    role: role as OrganizationMember['role'],
    status: status as OrganizationMember['status'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('Cross-Domain Authentication Security', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================
  // Redirect URL Safety
  // =============================================
  describe('Redirect URL Safety', () => {
    it('prevents redirect to external domain after sign-in', () => {
      const maliciousReturn = 'https://evil.com/steal-session';
      const safe = validateRedirectUrl(maliciousReturn);
      expect(safe).toBe('/');
    });

    it('prevents redirect via protocol-relative URL', () => {
      const maliciousReturn = '//evil.com/phishing';
      const safe = validateRedirectUrl(maliciousReturn);
      expect(safe).toBe('/');
    });

    it('prevents javascript: injection in returnTo', () => {
      const maliciousReturn = 'javascript:document.cookie';
      const safe = validateRedirectUrl(maliciousReturn);
      expect(safe).toBe('/');
    });

    it('allows redirect to Org A platform subdomain', () => {
      const returnTo = `https://${ORG_A.domain}/admin`;
      const safe = validateRedirectUrl(returnTo);
      expect(safe).toBe(returnTo);
    });

    it('blocks redirect to Org A custom domain unless explicitly allowed', () => {
      const returnTo = `https://${ORG_A.customDomain}/admin`;
      // Without explicit allow list
      expect(validateRedirectUrl(returnTo)).toBe('/');
      // With explicit allow list
      expect(
        validateRedirectUrl(returnTo, '/', [ORG_A.customDomain])
      ).toBe(returnTo);
    });

    it('allows relative paths within the same domain', () => {
      expect(validateRedirectUrl('/admin/bookings')).toBe('/admin/bookings');
      expect(validateRedirectUrl('/portal/progress')).toBe('/portal/progress');
    });
  });

  // =============================================
  // Cross-Tenant Login Isolation
  // =============================================
  describe('Cross-Tenant Login Isolation', () => {
    const userAMemberships = [
      makeMembership(ORG_A.id, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
    ];

    const userBMemberships = [
      makeMembership(ORG_B.id, USER_B_ID, USER_ROLES.SCHOOL_OWNER),
    ];

    it('User A logged in on Org A domain is authorized', () => {
      const auth = authorizeForOrganization({
        userId: USER_A_ID,
        resolvedOrganizationId: ORG_A.id,
        memberships: userAMemberships,
      });
      expect(auth.organizationId).toBe(ORG_A.id);
    });

    it('User A logged in on Org B domain is denied', () => {
      // User A visits abcdriving.driveflow.com.au while logged in
      // Their session is valid but they have no membership in Org B
      expectAppError(
        () =>
          authorizeForOrganization({
            userId: USER_A_ID,
            resolvedOrganizationId: ORG_B.id,
            memberships: userAMemberships,
          }),
        'TENANT_001_ACCESS_DENIED'
      );
    });

    it('User B logged in on Org A domain is denied', () => {
      expectAppError(
        () =>
          authorizeForOrganization({
            userId: USER_B_ID,
            resolvedOrganizationId: ORG_A.id,
            memberships: userBMemberships,
          }),
        'TENANT_001_ACCESS_DENIED'
      );
    });

    it('Multi-org user is authorized only for their orgs', () => {
      // User who is member of both orgs
      const multiOrgMemberships = [
        makeMembership(ORG_A.id, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
        makeMembership(ORG_B.id, USER_A_ID, USER_ROLES.INSTRUCTOR),
      ];

      // Authorized for Org A as owner
      const authA = authorizeForOrganization({
        userId: USER_A_ID,
        resolvedOrganizationId: ORG_A.id,
        memberships: multiOrgMemberships,
      });
      expect(authA.role).toBe(USER_ROLES.SCHOOL_OWNER);

      // Authorized for Org B as instructor (different role)
      const authB = authorizeForOrganization({
        userId: USER_A_ID,
        resolvedOrganizationId: ORG_B.id,
        memberships: multiOrgMemberships,
      });
      expect(authB.role).toBe(USER_ROLES.INSTRUCTOR);
    });
  });

  // =============================================
  // Role Isolation Across Domains
  // =============================================
  describe('Role Isolation Across Domains', () => {
    it('school_owner role in Org A does not grant access to Org B', () => {
      const ownerInA = [
        makeMembership(ORG_A.id, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
      ];

      expectAppError(
        () =>
          authorizeForOrganization({
            userId: USER_A_ID,
            resolvedOrganizationId: ORG_B.id,
            memberships: ownerInA,
          }),
        'TENANT_001_ACCESS_DENIED'
      );
    });

    it('suspended membership is denied even on correct domain', () => {
      const suspendedInA = [
        makeMembership(ORG_A.id, USER_A_ID, USER_ROLES.SCHOOL_OWNER, 'suspended'),
      ];

      expectAppError(
        () =>
          authorizeForOrganization({
            userId: USER_A_ID,
            resolvedOrganizationId: ORG_A.id,
            memberships: suspendedInA,
          }),
        'TENANT_001_ACCESS_DENIED'
      );
    });

    it('removed membership is denied even on correct domain', () => {
      const removedInA = [
        makeMembership(ORG_A.id, USER_A_ID, USER_ROLES.INSTRUCTOR, 'removed'),
      ];

      expectAppError(
        () =>
          authorizeForOrganization({
            userId: USER_A_ID,
            resolvedOrganizationId: ORG_A.id,
            memberships: removedInA,
          }),
        'TENANT_001_ACCESS_DENIED'
      );
    });

    it('invited membership is denied (not yet active)', () => {
      const invitedInA = [
        makeMembership(ORG_A.id, USER_A_ID, USER_ROLES.STUDENT, 'invited'),
      ];

      expectAppError(
        () =>
          authorizeForOrganization({
            userId: USER_A_ID,
            resolvedOrganizationId: ORG_A.id,
            memberships: invitedInA,
          }),
        'TENANT_001_ACCESS_DENIED'
      );
    });
  });

  // =============================================
  // Auth Context Never Leaks Across Domains
  // =============================================
  describe('Auth Context Integrity', () => {
    it('AuthorizedContext contains only the resolved organization', () => {
      const multiOrgMemberships = [
        makeMembership(ORG_A.id, USER_A_ID, USER_ROLES.SCHOOL_OWNER),
        makeMembership(ORG_B.id, USER_A_ID, USER_ROLES.INSTRUCTOR),
      ];

      const auth = authorizeForOrganization({
        userId: USER_A_ID,
        resolvedOrganizationId: ORG_A.id,
        memberships: multiOrgMemberships,
      });

      // Auth context is scoped to Org A only
      expect(auth.organizationId).toBe(ORG_A.id);
      expect(auth.membership.organization_id).toBe(ORG_A.id);
      // Does not expose Org B membership
      expect(auth.organizationId).not.toBe(ORG_B.id);
    });

    it('empty user ID always fails regardless of memberships', () => {
      expectAppError(
        () =>
          authorizeForOrganization({
            userId: '',
            resolvedOrganizationId: ORG_A.id,
            memberships: [
              makeMembership(ORG_A.id, '', USER_ROLES.SCHOOL_OWNER),
            ],
          }),
        'AUTH_001_UNAUTHENTICATED'
      );
    });
  });
});
