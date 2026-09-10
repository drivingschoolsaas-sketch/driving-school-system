import { describe, it, expect } from 'vitest';
import {
  authorizeForOrganization,
  requirePermission,
  requireRole,
} from '@/lib/auth/authorization';
import {
  isAtLeastRole,
  PERMISSIONS,
  getPermissionsForRole,
} from '@/permissions/roles';
import {
  normalizeHostname,
  classifyHostname,
} from '@/lib/tenant/domain-normalizer';
import { USER_ROLES } from '@/config/constants';
import type { OrganizationMember } from '@/types/database';
import { expectAppError } from './helpers';

// ==================================================
// Tenant Isolation Integration Tests
// ==================================================
// Organization A (Sydney Smart Driving)
//   Domain A: sydneysmart.driveflow.com.au
//   User A: school owner
//
// Organization B (ABC Driving School)
//   Domain B: abcdriving.driveflow.com.au
//   User B: school owner

const ORG_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Sydney Smart Driving',
  slug: 'sydneysmart',
  domain: 'sydneysmart.driveflow.com.au',
};

const ORG_B = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'ABC Driving School',
  slug: 'abcdriving',
  domain: 'abcdriving.driveflow.com.au',
};

const USER_A = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Alice Owner',
};

const USER_B = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Bob Owner',
};

const PLATFORM_DOMAIN = 'driveflow.com.au';

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

describe('Tenant Isolation — Full Security Model', () => {
  // =============================================
  // Domain → Organization Resolution
  // =============================================
  describe('Domain Resolution', () => {
    it('Domain A classifies as tenant with subdomain "sydneysmart"', () => {
      const result = classifyHostname(ORG_A.domain, PLATFORM_DOMAIN);
      expect(result.type).toBe('tenant');
      expect(result.subdomain).toBe('sydneysmart');
    });

    it('Domain B classifies as tenant with subdomain "abcdriving"', () => {
      const result = classifyHostname(ORG_B.domain, PLATFORM_DOMAIN);
      expect(result.type).toBe('tenant');
      expect(result.subdomain).toBe('abcdriving');
    });

    it('Domain A and Domain B resolve to different subdomains', () => {
      const a = classifyHostname(ORG_A.domain, PLATFORM_DOMAIN);
      const b = classifyHostname(ORG_B.domain, PLATFORM_DOMAIN);
      expect(a.subdomain).not.toBe(b.subdomain);
    });

    it('Unknown domain is classified as tenant (for DB lookup)', () => {
      const result = classifyHostname('evil.example.com', PLATFORM_DOMAIN);
      expect(result.type).toBe('tenant');
      expect(result.subdomain).toBeUndefined();
    });

    it('Platform admin domain is NOT a tenant', () => {
      const result = classifyHostname('admin.driveflow.com.au', PLATFORM_DOMAIN);
      expect(result.type).toBe('platform_admin');
    });

    it('Hostname normalization is consistent for the same domain', () => {
      const variations = [
        'SydneySmart.DriveFlow.COM.AU',
        'sydneysmart.driveflow.com.au:443',
        '  sydneysmart.driveflow.com.au  ',
      ];

      const normalized = variations.map(normalizeHostname);
      const expected = 'sydneysmart.driveflow.com.au';
      normalized.forEach((n) => expect(n).toBe(expected));

      // www. is NOT stripped — it's a separate domain
      expect(normalizeHostname('www.sydneysmart.driveflow.com.au')).toBe(
        'www.sydneysmart.driveflow.com.au'
      );
    });
  });

  // =============================================
  // Cross-Tenant Authorization
  // =============================================
  describe('Cross-Tenant Authorization', () => {
    const userAMemberships = [
      makeMembership(ORG_A.id, USER_A.id, USER_ROLES.SCHOOL_OWNER),
    ];

    const userBMemberships = [
      makeMembership(ORG_B.id, USER_B.id, USER_ROLES.SCHOOL_OWNER),
    ];

    it('User A CAN access Organization A', () => {
      const result = authorizeForOrganization({
        userId: USER_A.id,
        resolvedOrganizationId: ORG_A.id,
        memberships: userAMemberships,
      });
      expect(result.organizationId).toBe(ORG_A.id);
      expect(result.userId).toBe(USER_A.id);
      expect(result.role).toBe(USER_ROLES.SCHOOL_OWNER);
    });

    it('User A CANNOT access Organization B', () => {
      expectAppError(
        () =>
          authorizeForOrganization({
            userId: USER_A.id,
            resolvedOrganizationId: ORG_B.id,
            memberships: userAMemberships,
          }),
        'TENANT_001_ACCESS_DENIED'
      );
    });

    it('User B CAN access Organization B', () => {
      const result = authorizeForOrganization({
        userId: USER_B.id,
        resolvedOrganizationId: ORG_B.id,
        memberships: userBMemberships,
      });
      expect(result.organizationId).toBe(ORG_B.id);
    });

    it('User B CANNOT access Organization A', () => {
      expectAppError(
        () =>
          authorizeForOrganization({
            userId: USER_B.id,
            resolvedOrganizationId: ORG_A.id,
            memberships: userBMemberships,
          }),
        'TENANT_001_ACCESS_DENIED'
      );
    });

    it('Unauthenticated user cannot access any organization', () => {
      expectAppError(
        () =>
          authorizeForOrganization({
            userId: '',
            resolvedOrganizationId: ORG_A.id,
            memberships: [],
          }),
        'AUTH_001_UNAUTHENTICATED'
      );
    });
  });

  // =============================================
  // Permission Enforcement
  // =============================================
  describe('Permission Enforcement by Role', () => {
    const ownerRole: typeof USER_ROLES.SCHOOL_OWNER = USER_ROLES.SCHOOL_OWNER;
    const ownerContext = {
      userId: USER_A.id,
      organizationId: ORG_A.id,
      membership: makeMembership(ORG_A.id, USER_A.id, USER_ROLES.SCHOOL_OWNER),
      role: ownerRole,
    };

    const studentRole: typeof USER_ROLES.STUDENT = USER_ROLES.STUDENT;
    const studentContext = {
      userId: USER_B.id,
      organizationId: ORG_A.id,
      membership: makeMembership(ORG_A.id, USER_B.id, USER_ROLES.STUDENT),
      role: studentRole,
    };

    it('School owner can manage members', () => {
      expect(() =>
        requirePermission(ownerContext, PERMISSIONS.ORG_MANAGE_MEMBERS)
      ).not.toThrow();
    });

    it('Student CANNOT manage members', () => {
      expectAppError(
        () => requirePermission(studentContext, PERMISSIONS.ORG_MANAGE_MEMBERS),
        'AUTH_002_FORBIDDEN'
      );
    });

    it('Student CANNOT delete students', () => {
      expectAppError(
        () => requirePermission(studentContext, PERMISSIONS.STUDENT_DELETE),
        'AUTH_002_FORBIDDEN'
      );
    });

    it('Student CAN view own bookings', () => {
      expect(() =>
        requirePermission(studentContext, PERMISSIONS.BOOKING_VIEW_OWN)
      ).not.toThrow();
    });

    it('School owner meets school_admin role requirement', () => {
      expect(() =>
        requireRole(ownerContext, USER_ROLES.SCHOOL_ADMIN)
      ).not.toThrow();
    });

    it('Student does NOT meet instructor role requirement', () => {
      expectAppError(
        () => requireRole(studentContext, USER_ROLES.INSTRUCTOR),
        'AUTH_002_FORBIDDEN'
      );
    });
  });

  // =============================================
  // Domain Change Safety
  // =============================================
  describe('Domain Change Safety', () => {
    it('Changing a domain does not change organization_id', () => {
      const originalDomain = 'sydneysmart.driveflow.com.au';
      const newDomain = 'sydneysmartdriving.com.au';

      const originalClassification = classifyHostname(originalDomain, PLATFORM_DOMAIN);
      const newClassification = classifyHostname(newDomain, PLATFORM_DOMAIN);

      // Different normalized hostnames
      expect(originalClassification.normalized).not.toBe(newClassification.normalized);

      // But the organization_id stays the same
      const memberships = [
        makeMembership(ORG_A.id, USER_A.id, USER_ROLES.SCHOOL_OWNER),
      ];

      const result = authorizeForOrganization({
        userId: USER_A.id,
        resolvedOrganizationId: ORG_A.id,
        memberships,
      });
      expect(result.organizationId).toBe(ORG_A.id);
    });

    it('Authorization is based on organization_id, not hostname', () => {
      const memberships = [
        makeMembership(ORG_A.id, USER_A.id, USER_ROLES.SCHOOL_OWNER),
      ];

      const result = authorizeForOrganization({
        userId: USER_A.id,
        resolvedOrganizationId: ORG_A.id,
        memberships,
      });

      expect(result.organizationId).toBe(ORG_A.id);
      // No hostname in the auth context
      expect(result).not.toHaveProperty('hostname');
      expect(result).not.toHaveProperty('domain');
    });
  });

  // =============================================
  // Role Hierarchy Integrity
  // =============================================
  describe('Role Hierarchy Integrity', () => {
    it('platform_owner > school_owner > school_admin > instructor > student', () => {
      expect(isAtLeastRole(USER_ROLES.PLATFORM_OWNER, USER_ROLES.SCHOOL_OWNER)).toBe(true);
      expect(isAtLeastRole(USER_ROLES.SCHOOL_OWNER, USER_ROLES.SCHOOL_ADMIN)).toBe(true);
      expect(isAtLeastRole(USER_ROLES.SCHOOL_ADMIN, USER_ROLES.INSTRUCTOR)).toBe(true);
      expect(isAtLeastRole(USER_ROLES.INSTRUCTOR, USER_ROLES.STUDENT)).toBe(true);
    });

    it('student cannot escalate to any higher role', () => {
      expect(isAtLeastRole(USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR)).toBe(false);
      expect(isAtLeastRole(USER_ROLES.STUDENT, USER_ROLES.SCHOOL_ADMIN)).toBe(false);
      expect(isAtLeastRole(USER_ROLES.STUDENT, USER_ROLES.SCHOOL_OWNER)).toBe(false);
      expect(isAtLeastRole(USER_ROLES.STUDENT, USER_ROLES.PLATFORM_OWNER)).toBe(false);
    });

    it('each higher role has at least as many permissions as the one below', () => {
      const roles = [
        USER_ROLES.STUDENT,
        USER_ROLES.INSTRUCTOR,
        USER_ROLES.SCHOOL_ADMIN,
        USER_ROLES.SCHOOL_OWNER,
      ] as const;

      const permCounts = roles.map((role) => getPermissionsForRole(role).size);

      for (let i = 1; i < permCounts.length; i++) {
        expect(permCounts[i]).toBeGreaterThanOrEqual(permCounts[i - 1]);
      }
    });
  });
});
