// ==================================================
// Role & Permission Model
// ==================================================
// Centralized permission definitions.
// All authorization checks in the application MUST
// use these helpers — never check roles ad hoc.

import { type UserRole, USER_ROLES } from '@/config/constants';

/**
 * Permission actions available in the system.
 * Each permission maps to a specific business operation.
 */
export const PERMISSIONS = {
  // Organization management
  ORG_VIEW: 'org:view',
  ORG_EDIT: 'org:edit',
  ORG_MANAGE_MEMBERS: 'org:manage_members',
  ORG_MANAGE_SETTINGS: 'org:manage_settings',
  ORG_MANAGE_DOMAINS: 'org:manage_domains',
  ORG_MANAGE_BRANDING: 'org:manage_branding',
  ORG_VIEW_AUDIT_LOGS: 'org:view_audit_logs',

  // Instructor management
  INSTRUCTOR_VIEW: 'instructor:view',
  INSTRUCTOR_CREATE: 'instructor:create',
  INSTRUCTOR_EDIT: 'instructor:edit',
  INSTRUCTOR_DELETE: 'instructor:delete',
  INSTRUCTOR_VIEW_OWN_SCHEDULE: 'instructor:view_own_schedule',
  INSTRUCTOR_MANAGE_OWN_AVAILABILITY: 'instructor:manage_own_availability',

  // Student management
  STUDENT_VIEW: 'student:view',
  STUDENT_CREATE: 'student:create',
  STUDENT_EDIT: 'student:edit',
  STUDENT_DELETE: 'student:delete',
  STUDENT_VIEW_OWN_PROFILE: 'student:view_own_profile',
  STUDENT_EDIT_OWN_PROFILE: 'student:edit_own_profile',

  // Booking management
  BOOKING_VIEW: 'booking:view',
  BOOKING_CREATE: 'booking:create',
  BOOKING_EDIT: 'booking:edit',
  BOOKING_CANCEL: 'booking:cancel',
  BOOKING_VIEW_OWN: 'booking:view_own',
  BOOKING_CREATE_OWN: 'booking:create_own',
  BOOKING_CANCEL_OWN: 'booking:cancel_own',

  // Availability
  AVAILABILITY_VIEW: 'availability:view',
  AVAILABILITY_MANAGE: 'availability:manage',

  // Vehicles
  VEHICLE_VIEW: 'vehicle:view',
  VEHICLE_MANAGE: 'vehicle:manage',

  // Locations
  LOCATION_VIEW: 'location:view',
  LOCATION_MANAGE: 'location:manage',

  // Lesson types & packages
  LESSON_TYPE_VIEW: 'lesson_type:view',
  LESSON_TYPE_MANAGE: 'lesson_type:manage',
  PACKAGE_VIEW: 'package:view',
  PACKAGE_MANAGE: 'package:manage',

  // Reviews & success stories
  REVIEW_VIEW: 'review:view',
  REVIEW_MODERATE: 'review:moderate',
  REVIEW_CREATE_OWN: 'review:create_own',
  SUCCESS_STORY_VIEW: 'success_story:view',
  SUCCESS_STORY_MANAGE: 'success_story:manage',

  // Payments
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_MANAGE: 'payment:manage',

  // Reports
  REPORT_VIEW: 'report:view',

  // Notifications
  NOTIFICATION_MANAGE: 'notification:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role → Permission mapping.
 * Each role has a set of permissions. Higher roles include
 * all permissions of lower roles plus additional ones.
 */
const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  // Platform roles have all permissions (enforced separately at platform level)
  [USER_ROLES.PLATFORM_OWNER]: new Set(
    Object.values(PERMISSIONS) as Permission[]
  ),
  [USER_ROLES.PLATFORM_SUPPORT]: new Set(
    Object.values(PERMISSIONS) as Permission[]
  ),

  // School owner — full access to their organization
  [USER_ROLES.SCHOOL_OWNER]: new Set([
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_EDIT,
    PERMISSIONS.ORG_MANAGE_MEMBERS,
    PERMISSIONS.ORG_MANAGE_SETTINGS,
    PERMISSIONS.ORG_MANAGE_DOMAINS,
    PERMISSIONS.ORG_MANAGE_BRANDING,
    PERMISSIONS.ORG_VIEW_AUDIT_LOGS,
    PERMISSIONS.INSTRUCTOR_VIEW,
    PERMISSIONS.INSTRUCTOR_CREATE,
    PERMISSIONS.INSTRUCTOR_EDIT,
    PERMISSIONS.INSTRUCTOR_DELETE,
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_EDIT,
    PERMISSIONS.STUDENT_DELETE,
    PERMISSIONS.BOOKING_VIEW,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_EDIT,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.AVAILABILITY_VIEW,
    PERMISSIONS.AVAILABILITY_MANAGE,
    PERMISSIONS.VEHICLE_VIEW,
    PERMISSIONS.VEHICLE_MANAGE,
    PERMISSIONS.LOCATION_VIEW,
    PERMISSIONS.LOCATION_MANAGE,
    PERMISSIONS.LESSON_TYPE_VIEW,
    PERMISSIONS.LESSON_TYPE_MANAGE,
    PERMISSIONS.PACKAGE_VIEW,
    PERMISSIONS.PACKAGE_MANAGE,
    PERMISSIONS.REVIEW_VIEW,
    PERMISSIONS.REVIEW_MODERATE,
    PERMISSIONS.SUCCESS_STORY_VIEW,
    PERMISSIONS.SUCCESS_STORY_MANAGE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_MANAGE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.NOTIFICATION_MANAGE,
  ] as Permission[]),

  // School admin — similar to owner but cannot manage domains or members
  [USER_ROLES.SCHOOL_ADMIN]: new Set([
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_VIEW_AUDIT_LOGS,
    PERMISSIONS.INSTRUCTOR_VIEW,
    PERMISSIONS.INSTRUCTOR_CREATE,
    PERMISSIONS.INSTRUCTOR_EDIT,
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_EDIT,
    PERMISSIONS.STUDENT_DELETE,
    PERMISSIONS.BOOKING_VIEW,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_EDIT,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.AVAILABILITY_VIEW,
    PERMISSIONS.AVAILABILITY_MANAGE,
    PERMISSIONS.VEHICLE_VIEW,
    PERMISSIONS.VEHICLE_MANAGE,
    PERMISSIONS.LOCATION_VIEW,
    PERMISSIONS.LOCATION_MANAGE,
    PERMISSIONS.LESSON_TYPE_VIEW,
    PERMISSIONS.LESSON_TYPE_MANAGE,
    PERMISSIONS.PACKAGE_VIEW,
    PERMISSIONS.PACKAGE_MANAGE,
    PERMISSIONS.REVIEW_VIEW,
    PERMISSIONS.REVIEW_MODERATE,
    PERMISSIONS.SUCCESS_STORY_VIEW,
    PERMISSIONS.SUCCESS_STORY_MANAGE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_MANAGE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.NOTIFICATION_MANAGE,
  ] as Permission[]),

  // Instructor — can view org, manage own schedule, view students
  [USER_ROLES.INSTRUCTOR]: new Set([
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.INSTRUCTOR_VIEW,
    PERMISSIONS.INSTRUCTOR_VIEW_OWN_SCHEDULE,
    PERMISSIONS.INSTRUCTOR_MANAGE_OWN_AVAILABILITY,
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.BOOKING_VIEW,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_EDIT,
    PERMISSIONS.AVAILABILITY_VIEW,
    PERMISSIONS.VEHICLE_VIEW,
    PERMISSIONS.LOCATION_VIEW,
    PERMISSIONS.LESSON_TYPE_VIEW,
    PERMISSIONS.PACKAGE_VIEW,
    PERMISSIONS.REVIEW_VIEW,
    PERMISSIONS.SUCCESS_STORY_VIEW,
  ] as Permission[]),

  // Student — can view own data, book, leave reviews
  [USER_ROLES.STUDENT]: new Set([
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.INSTRUCTOR_VIEW,
    PERMISSIONS.STUDENT_VIEW_OWN_PROFILE,
    PERMISSIONS.STUDENT_EDIT_OWN_PROFILE,
    PERMISSIONS.BOOKING_VIEW_OWN,
    PERMISSIONS.BOOKING_CREATE_OWN,
    PERMISSIONS.BOOKING_CANCEL_OWN,
    PERMISSIONS.AVAILABILITY_VIEW,
    PERMISSIONS.LOCATION_VIEW,
    PERMISSIONS.LESSON_TYPE_VIEW,
    PERMISSIONS.PACKAGE_VIEW,
    PERMISSIONS.REVIEW_VIEW,
    PERMISSIONS.REVIEW_CREATE_OWN,
    PERMISSIONS.SUCCESS_STORY_VIEW,
  ] as Permission[]),
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.has(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissionsForRole(role: UserRole): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role] ?? new Set();
}

/**
 * Role hierarchy — ordered from most to least privileged.
 * Used for comparing role levels (e.g., "at least school_admin").
 */
const ROLE_HIERARCHY: UserRole[] = [
  USER_ROLES.PLATFORM_OWNER,
  USER_ROLES.PLATFORM_SUPPORT,
  USER_ROLES.SCHOOL_OWNER,
  USER_ROLES.SCHOOL_ADMIN,
  USER_ROLES.INSTRUCTOR,
  USER_ROLES.STUDENT,
];

/**
 * Check if a role is at least as privileged as the minimum required role.
 */
export function isAtLeastRole(
  actualRole: UserRole,
  minimumRole: UserRole
): boolean {
  const actualIndex = ROLE_HIERARCHY.indexOf(actualRole);
  const minimumIndex = ROLE_HIERARCHY.indexOf(minimumRole);
  if (actualIndex === -1 || minimumIndex === -1) return false;
  return actualIndex <= minimumIndex; // lower index = higher privilege
}

/**
 * Check if a role is a platform-level role (not org-scoped).
 */
export function isPlatformRole(role: UserRole): boolean {
  return (
    role === USER_ROLES.PLATFORM_OWNER ||
    role === USER_ROLES.PLATFORM_SUPPORT
  );
}

/**
 * Check if a role is an organization admin role (owner or admin).
 */
export function isOrgAdminRole(role: UserRole): boolean {
  return (
    role === USER_ROLES.PLATFORM_OWNER ||
    role === USER_ROLES.PLATFORM_SUPPORT ||
    role === USER_ROLES.SCHOOL_OWNER ||
    role === USER_ROLES.SCHOOL_ADMIN
  );
}
