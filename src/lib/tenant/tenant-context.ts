// ==================================================
// Tenant Context
// ==================================================
// Defines the resolved tenant context that is
// available throughout a request lifecycle.

export interface TenantContext {
  /** The resolved organization ID — the primary ownership key */
  organizationId: string;
  /** Organization name */
  organizationName: string;
  /** Organization slug */
  organizationSlug: string;
  /** Organization status */
  organizationStatus: string;
  /** The hostname that was used to access this tenant */
  hostname: string;
  /** Organization timezone */
  timezone: string;
  /** Organization currency */
  currency: string;
}

/**
 * Represents a resolved platform context (non-tenant).
 */
export interface PlatformContext {
  type: 'platform_admin' | 'platform_website' | 'preview' | 'localhost';
  hostname: string;
}

/**
 * The result of hostname resolution — either a tenant or a platform context.
 */
export type ResolvedContext =
  | { kind: 'tenant'; tenant: TenantContext }
  | { kind: 'platform'; platform: PlatformContext };
