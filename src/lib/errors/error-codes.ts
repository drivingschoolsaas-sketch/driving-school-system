import { AppError } from './app-error';

// ==================================================
// Error Code Registry
// ==================================================
// Centralized error factories. Use these instead of
// throwing raw Error objects throughout the codebase.

// --- Authentication Errors ---

export const AuthErrors = {
  unauthenticated: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'AUTH_001_UNAUTHENTICATED',
      message: 'Authentication required.',
      statusCode: 401,
      severity: 'medium',
      context,
    }),

  forbidden: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'AUTH_002_FORBIDDEN',
      message: 'You do not have permission to perform this action.',
      statusCode: 403,
      severity: 'medium',
      context,
    }),

  invalidToken: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'AUTH_003_INVALID_TOKEN',
      message: 'The authentication token is invalid or expired.',
      statusCode: 401,
      severity: 'medium',
      context,
    }),

  sessionExpired: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'AUTH_004_SESSION_EXPIRED',
      message: 'Your session has expired. Please sign in again.',
      statusCode: 401,
      severity: 'low',
      context,
    }),
} as const;

// --- Tenant Errors ---

export const TenantErrors = {
  accessDenied: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'TENANT_001_ACCESS_DENIED',
      message: 'Access denied to this organization.',
      statusCode: 403,
      severity: 'high',
      context,
    }),

  invalidContext: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'TENANT_002_INVALID_CONTEXT',
      message: 'Unable to determine organization context.',
      statusCode: 400,
      severity: 'high',
      context,
    }),

  organizationSuspended: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'TENANT_003_ORGANIZATION_SUSPENDED',
      message: 'This organization has been suspended.',
      statusCode: 403,
      severity: 'high',
      context,
    }),

  organizationNotFound: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'TENANT_004_ORGANIZATION_NOT_FOUND',
      message: 'Organization not found.',
      statusCode: 404,
      severity: 'medium',
      context,
    }),
} as const;

// --- Domain Errors ---

export const DomainErrors = {
  unknownHost: (hostname: string) =>
    new AppError({
      code: 'DOMAIN_001_UNKNOWN_HOST',
      message: 'This domain is not registered with the platform.',
      statusCode: 404,
      severity: 'low',
      context: { hostname },
    }),

  notVerified: (hostname: string) =>
    new AppError({
      code: 'DOMAIN_002_NOT_VERIFIED',
      message: 'This domain has not been verified yet.',
      statusCode: 403,
      severity: 'medium',
      context: { hostname },
    }),

  alreadyRegistered: (hostname: string) =>
    new AppError({
      code: 'DOMAIN_003_ALREADY_REGISTERED',
      message: 'This domain is already registered to another organization.',
      statusCode: 409,
      severity: 'medium',
      context: { hostname },
    }),

  dnsVerificationFailed: (hostname: string) =>
    new AppError({
      code: 'DOMAIN_004_DNS_VERIFICATION_FAILED',
      message: 'DNS verification failed for this domain.',
      statusCode: 400,
      severity: 'medium',
      context: { hostname },
    }),

  sslPending: (hostname: string) =>
    new AppError({
      code: 'DOMAIN_005_SSL_PENDING',
      message: 'SSL certificate is still being provisioned.',
      statusCode: 503,
      severity: 'low',
      context: { hostname },
    }),

  organizationSuspended: (hostname: string) =>
    new AppError({
      code: 'DOMAIN_006_ORGANIZATION_SUSPENDED',
      message: 'The organization associated with this domain is suspended.',
      statusCode: 403,
      severity: 'high',
      context: { hostname },
    }),

  organizationMismatch: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'DOMAIN_007_ORGANIZATION_MISMATCH',
      message: 'Domain does not belong to the expected organization.',
      statusCode: 403,
      severity: 'critical',
      context,
    }),

  unsafeRedirect: (url: string) =>
    new AppError({
      code: 'DOMAIN_008_UNSAFE_REDIRECT',
      message: 'The redirect URL is not allowed.',
      statusCode: 400,
      severity: 'high',
      context: { url },
    }),

  primaryDomainMissing: (organizationId: string) =>
    new AppError({
      code: 'DOMAIN_009_PRIMARY_DOMAIN_MISSING',
      message: 'No primary domain configured for this organization.',
      statusCode: 500,
      severity: 'high',
      context: { organizationId },
    }),

  providerError: (message: string, cause?: unknown) =>
    new AppError({
      code: 'DOMAIN_010_PROVIDER_ERROR',
      message: `Domain provider error: ${message}`,
      statusCode: 502,
      severity: 'high',
      cause,
    }),
} as const;

// --- Booking Errors ---

export const BookingErrors = {
  slotUnavailable: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'BOOKING_001_SLOT_UNAVAILABLE',
      message: 'This time slot is no longer available.',
      statusCode: 409,
      severity: 'low',
      context,
    }),

  instructorUnavailable: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'BOOKING_002_INSTRUCTOR_UNAVAILABLE',
      message: 'The selected instructor is not available at this time.',
      statusCode: 409,
      severity: 'low',
      context,
    }),

  conflict: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'BOOKING_003_CONFLICT',
      message: 'A booking conflict was detected.',
      statusCode: 409,
      severity: 'medium',
      context,
    }),

  insufficientNotice: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'BOOKING_004_INSUFFICIENT_NOTICE',
      message: 'This booking does not meet the minimum notice requirement.',
      statusCode: 400,
      severity: 'low',
      context,
    }),

  cancellationTooLate: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'BOOKING_005_CANCELLATION_TOO_LATE',
      message: 'This booking can no longer be cancelled within the required notice period.',
      statusCode: 400,
      severity: 'low',
      context,
    }),

  invalidStatusTransition: (from: string, to: string) =>
    new AppError({
      code: 'BOOKING_006_INVALID_STATUS_TRANSITION',
      message: `Cannot transition booking from '${from}' to '${to}'.`,
      statusCode: 400,
      severity: 'low',
      context: { from, to },
    }),

  notFound: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'BOOKING_007_NOT_FOUND',
      message: 'Booking not found.',
      statusCode: 404,
      severity: 'low',
      context,
    }),
} as const;

// --- Payment Errors ---

export const PaymentErrors = {
  failed: (context?: Record<string, unknown>) =>
    new AppError({
      code: 'PAYMENT_001_FAILED',
      message: 'Payment processing failed.',
      statusCode: 402,
      severity: 'high',
      context,
    }),
} as const;

// --- Subscription Errors ---

export const SubscriptionErrors = {
  featureNotAllowed: (feature: string) =>
    new AppError({
      code: 'SUBSCRIPTION_001_FEATURE_NOT_ALLOWED',
      message: `Your current plan does not include: ${feature}`,
      statusCode: 403,
      severity: 'low',
      context: { feature },
    }),
} as const;

// --- Validation Errors ---

export const ValidationErrors = {
  invalidInput: (details: string, context?: Record<string, unknown>) =>
    new AppError({
      code: 'VALIDATION_001_INVALID_INPUT',
      message: details,
      statusCode: 400,
      severity: 'low',
      context,
    }),
} as const;
