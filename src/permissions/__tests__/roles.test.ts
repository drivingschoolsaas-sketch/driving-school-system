import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  isAtLeastRole,
  isPlatformRole,
  isOrgAdminRole,
  PERMISSIONS,
} from '../roles';
import { USER_ROLES } from '@/config/constants';

describe('Permission System', () => {
  describe('hasPermission', () => {
    it('school_owner has ORG_EDIT permission', () => {
      expect(hasPermission(USER_ROLES.SCHOOL_OWNER, PERMISSIONS.ORG_EDIT)).toBe(true);
    });

    it('school_admin does NOT have ORG_MANAGE_MEMBERS', () => {
      expect(hasPermission(USER_ROLES.SCHOOL_ADMIN, PERMISSIONS.ORG_MANAGE_MEMBERS)).toBe(false);
    });

    it('school_admin does NOT have ORG_MANAGE_DOMAINS', () => {
      expect(hasPermission(USER_ROLES.SCHOOL_ADMIN, PERMISSIONS.ORG_MANAGE_DOMAINS)).toBe(false);
    });

    it('instructor has BOOKING_VIEW but not BOOKING_CANCEL', () => {
      expect(hasPermission(USER_ROLES.INSTRUCTOR, PERMISSIONS.BOOKING_VIEW)).toBe(true);
      expect(hasPermission(USER_ROLES.INSTRUCTOR, PERMISSIONS.BOOKING_CANCEL)).toBe(false);
    });

    it('student has BOOKING_VIEW_OWN but not BOOKING_VIEW (all)', () => {
      expect(hasPermission(USER_ROLES.STUDENT, PERMISSIONS.BOOKING_VIEW_OWN)).toBe(true);
      expect(hasPermission(USER_ROLES.STUDENT, PERMISSIONS.BOOKING_VIEW)).toBe(false);
    });

    it('student cannot manage students', () => {
      expect(hasPermission(USER_ROLES.STUDENT, PERMISSIONS.STUDENT_CREATE)).toBe(false);
      expect(hasPermission(USER_ROLES.STUDENT, PERMISSIONS.STUDENT_EDIT)).toBe(false);
      expect(hasPermission(USER_ROLES.STUDENT, PERMISSIONS.STUDENT_DELETE)).toBe(false);
    });

    it('student can view and edit own profile', () => {
      expect(hasPermission(USER_ROLES.STUDENT, PERMISSIONS.STUDENT_VIEW_OWN_PROFILE)).toBe(true);
      expect(hasPermission(USER_ROLES.STUDENT, PERMISSIONS.STUDENT_EDIT_OWN_PROFILE)).toBe(true);
    });

    it('platform_owner has all permissions', () => {
      const allPermissions = Object.values(PERMISSIONS);
      allPermissions.forEach((p) => {
        expect(hasPermission(USER_ROLES.PLATFORM_OWNER, p)).toBe(true);
      });
    });
  });

  describe('hasAllPermissions', () => {
    it('school_owner has both ORG_VIEW and ORG_EDIT', () => {
      expect(
        hasAllPermissions(USER_ROLES.SCHOOL_OWNER, [
          PERMISSIONS.ORG_VIEW,
          PERMISSIONS.ORG_EDIT,
        ])
      ).toBe(true);
    });

    it('student does NOT have both BOOKING_VIEW and BOOKING_VIEW_OWN', () => {
      expect(
        hasAllPermissions(USER_ROLES.STUDENT, [
          PERMISSIONS.BOOKING_VIEW,
          PERMISSIONS.BOOKING_VIEW_OWN,
        ])
      ).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('student has at least one of BOOKING_VIEW or BOOKING_VIEW_OWN', () => {
      expect(
        hasAnyPermission(USER_ROLES.STUDENT, [
          PERMISSIONS.BOOKING_VIEW,
          PERMISSIONS.BOOKING_VIEW_OWN,
        ])
      ).toBe(true);
    });

    it('student has none of BOOKING_EDIT or BOOKING_CANCEL', () => {
      expect(
        hasAnyPermission(USER_ROLES.STUDENT, [
          PERMISSIONS.BOOKING_EDIT,
          PERMISSIONS.BOOKING_CANCEL,
        ])
      ).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('returns a non-empty set for every role', () => {
      Object.values(USER_ROLES).forEach((role) => {
        const permissions = getPermissionsForRole(role);
        expect(permissions.size).toBeGreaterThan(0);
      });
    });

    it('school_owner has more permissions than instructor', () => {
      const ownerPerms = getPermissionsForRole(USER_ROLES.SCHOOL_OWNER);
      const instructorPerms = getPermissionsForRole(USER_ROLES.INSTRUCTOR);
      expect(ownerPerms.size).toBeGreaterThan(instructorPerms.size);
    });

    it('instructor has more permissions than student', () => {
      const instructorPerms = getPermissionsForRole(USER_ROLES.INSTRUCTOR);
      const studentPerms = getPermissionsForRole(USER_ROLES.STUDENT);
      expect(instructorPerms.size).toBeGreaterThan(studentPerms.size);
    });
  });

  describe('isAtLeastRole', () => {
    it('school_owner is at least school_admin', () => {
      expect(isAtLeastRole(USER_ROLES.SCHOOL_OWNER, USER_ROLES.SCHOOL_ADMIN)).toBe(true);
    });

    it('school_admin is at least school_admin', () => {
      expect(isAtLeastRole(USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SCHOOL_ADMIN)).toBe(true);
    });

    it('instructor is NOT at least school_admin', () => {
      expect(isAtLeastRole(USER_ROLES.INSTRUCTOR, USER_ROLES.SCHOOL_ADMIN)).toBe(false);
    });

    it('student is NOT at least instructor', () => {
      expect(isAtLeastRole(USER_ROLES.STUDENT, USER_ROLES.INSTRUCTOR)).toBe(false);
    });

    it('platform_owner is at least any role', () => {
      Object.values(USER_ROLES).forEach((role) => {
        expect(isAtLeastRole(USER_ROLES.PLATFORM_OWNER, role)).toBe(true);
      });
    });
  });

  describe('isPlatformRole', () => {
    it('platform_owner is a platform role', () => {
      expect(isPlatformRole(USER_ROLES.PLATFORM_OWNER)).toBe(true);
    });

    it('platform_support is a platform role', () => {
      expect(isPlatformRole(USER_ROLES.PLATFORM_SUPPORT)).toBe(true);
    });

    it('school_owner is NOT a platform role', () => {
      expect(isPlatformRole(USER_ROLES.SCHOOL_OWNER)).toBe(false);
    });
  });

  describe('isOrgAdminRole', () => {
    it('school_owner is an org admin', () => {
      expect(isOrgAdminRole(USER_ROLES.SCHOOL_OWNER)).toBe(true);
    });

    it('school_admin is an org admin', () => {
      expect(isOrgAdminRole(USER_ROLES.SCHOOL_ADMIN)).toBe(true);
    });

    it('instructor is NOT an org admin', () => {
      expect(isOrgAdminRole(USER_ROLES.INSTRUCTOR)).toBe(false);
    });

    it('student is NOT an org admin', () => {
      expect(isOrgAdminRole(USER_ROLES.STUDENT)).toBe(false);
    });
  });
});
