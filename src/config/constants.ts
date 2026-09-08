// ==================================================
// Platform Constants
// ==================================================

/**
 * User roles in the system.
 * Ordered from most to least privileged.
 */
export const USER_ROLES = {
  PLATFORM_OWNER: 'platform_owner',
  PLATFORM_SUPPORT: 'platform_support',
  SCHOOL_OWNER: 'school_owner',
  SCHOOL_ADMIN: 'school_admin',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Organization status values.
 */
export const ORGANIZATION_STATUS = {
  ACTIVE: 'active',
  TRIAL: 'trial',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const;

export type OrganizationStatus =
  (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS];

/**
 * Domain types.
 */
export const DOMAIN_TYPES = {
  PLATFORM_SUBDOMAIN: 'platform_subdomain',
  CUSTOM_ROOT: 'custom_root',
  CUSTOM_SUBDOMAIN: 'custom_subdomain',
} as const;

export type DomainType = (typeof DOMAIN_TYPES)[keyof typeof DOMAIN_TYPES];

/**
 * Domain verification status.
 */
export const DOMAIN_STATUS = {
  PENDING: 'pending',
  VERIFYING: 'verifying',
  VERIFIED: 'verified',
  FAILED: 'failed',
  SUSPENDED: 'suspended',
} as const;

export type DomainStatus = (typeof DOMAIN_STATUS)[keyof typeof DOMAIN_STATUS];

/**
 * Booking lifecycle status values.
 */
export const BOOKING_STATUS = {
  PENDING: 'pending',
  AWAITING_PAYMENT: 'awaiting_payment',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

/**
 * Membership status.
 */
export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  INVITED: 'invited',
  SUSPENDED: 'suspended',
  REMOVED: 'removed',
} as const;

export type MembershipStatus =
  (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

/**
 * Vehicle status.
 */
export const VEHICLE_STATUS = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  RETIRED: 'retired',
} as const;

export type VehicleStatus =
  (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

/**
 * Lesson type status.
 */
export const LESSON_TYPE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type LessonTypeStatus =
  (typeof LESSON_TYPE_STATUS)[keyof typeof LESSON_TYPE_STATUS];

/**
 * Transmission type.
 */
export const TRANSMISSION_TYPE = {
  AUTOMATIC: 'automatic',
  MANUAL: 'manual',
  BOTH: 'both',
} as const;

export type TransmissionType =
  (typeof TRANSMISSION_TYPE)[keyof typeof TRANSMISSION_TYPE];

/**
 * Package status.
 */
export const PACKAGE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;

export type PackageStatus =
  (typeof PACKAGE_STATUS)[keyof typeof PACKAGE_STATUS];

/**
 * Days of the week (for availability rules).
 */
export const DAY_OF_WEEK = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
} as const;

export type DayOfWeek = (typeof DAY_OF_WEEK)[keyof typeof DAY_OF_WEEK];

export const DAYS_OF_WEEK_ORDERED: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Blocked time reason codes.
 */
export const BLOCKED_TIME_REASON = {
  LUNCH: 'lunch',
  PRIVATE_APPOINTMENT: 'private_appointment',
  VEHICLE_MAINTENANCE: 'vehicle_maintenance',
  DRIVING_TEST: 'driving_test',
  ANNUAL_LEAVE: 'annual_leave',
  SICK_LEAVE: 'sick_leave',
  TRAINING: 'training',
  ADMIN_BLOCKED: 'admin_blocked',
  OTHER: 'other',
} as const;

export type BlockedTimeReason =
  (typeof BLOCKED_TIME_REASON)[keyof typeof BLOCKED_TIME_REASON];

/**
 * Driving skill proficiency levels.
 */
export const SKILL_LEVEL = {
  NOT_STARTED: 'not_started',
  NEEDS_PRACTICE: 'needs_practice',
  DEVELOPING: 'developing',
  COMPETENT: 'competent',
  CONFIDENT: 'confident',
} as const;

export type SkillLevel = (typeof SKILL_LEVEL)[keyof typeof SKILL_LEVEL];

export const SKILL_LEVELS_ORDERED: SkillLevel[] = [
  'not_started',
  'needs_practice',
  'developing',
  'competent',
  'confident',
];

/**
 * Student package purchase status.
 */
export const PACKAGE_PURCHASE_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type PackagePurchaseStatus =
  (typeof PACKAGE_PURCHASE_STATUS)[keyof typeof PACKAGE_PURCHASE_STATUS];

/**
 * Review moderation status.
 */
export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FEATURED: 'featured',
} as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

/**
 * Success story publication status.
 */
export const SUCCESS_STORY_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type SuccessStoryStatus =
  (typeof SUCCESS_STORY_STATUS)[keyof typeof SUCCESS_STORY_STATUS];

/**
 * Consent collection methods.
 */
export const CONSENT_METHOD = {
  VERBAL: 'verbal',
  WRITTEN: 'written',
  DIGITAL: 'digital',
  PARENT_GUARDIAN: 'parent_guardian',
} as const;

export type ConsentMethod = (typeof CONSENT_METHOD)[keyof typeof CONSENT_METHOD];

/**
 * Payment status lifecycle.
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/**
 * Payment type — what the payment is for.
 */
export const PAYMENT_TYPE = {
  BOOKING_FULL: 'booking_full',
  BOOKING_DEPOSIT: 'booking_deposit',
  PACKAGE_PURCHASE: 'package_purchase',
  OUTSTANDING_BALANCE: 'outstanding_balance',
} as const;

export type PaymentType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE];

/**
 * Refund status.
 */
export const REFUND_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
} as const;

export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

/**
 * Webhook event processing status.
 */
export const WEBHOOK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type WebhookStatus =
  (typeof WEBHOOK_STATUS)[keyof typeof WEBHOOK_STATUS];

/**
 * Notification delivery channel.
 */
export const NOTIFICATION_CHANNEL = {
  EMAIL: 'email',
  SMS: 'sms',
} as const;

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

/**
 * Notification delivery status.
 */
export const NOTIFICATION_STATUS = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
} as const;

export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

/**
 * Notification event types.
 */
export const NOTIFICATION_TYPE = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_REMINDER: 'booking_reminder',
  BOOKING_CHANGED: 'booking_changed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_RECEIPT: 'payment_receipt',
  PAYMENT_FAILED: 'payment_failed',
  INSTRUCTOR_REASSIGNED: 'instructor_reassigned',
  REVIEW_REQUEST: 'review_request',
  TEST_CONGRATULATIONS: 'test_congratulations',
  WELCOME: 'welcome',
  CUSTOM: 'custom',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/**
 * Subscription status lifecycle.
 */
export const SUBSCRIPTION_STATUS = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
} as const;

export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

/**
 * Billing interval.
 */
export const BILLING_INTERVAL = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export type BillingInterval =
  (typeof BILLING_INTERVAL)[keyof typeof BILLING_INTERVAL];

/**
 * Waitlist entry status.
 */
export const WAITLIST_STATUS = {
  WAITING: 'waiting',
  NOTIFIED: 'notified',
  BOOKED: 'booked',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export type WaitlistStatus =
  (typeof WAITLIST_STATUS)[keyof typeof WAITLIST_STATUS];
