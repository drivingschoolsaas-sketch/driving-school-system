// ==================================================
// Entitlement Service
// ==================================================
// Centralized entitlement checks. The application asks
// this service whether a feature or quantity is allowed
// for an organization's current plan.
//
// Do NOT scatter plan names throughout the app.
// Always check entitlements through this service.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plan, Subscription } from '@/types/database';
import { SubscriptionErrors } from '@/lib/errors';
import { logger } from '@/lib/logging';

/**
 * Resolved entitlements for an organization.
 */
export interface Entitlements {
  planName: string;
  planSlug: string;
  subscriptionStatus: string;
  isActive: boolean;

  // Quantity limits (null = unlimited)
  maxInstructors: number | null;
  maxStudents: number | null;
  maxLocations: number | null;
  maxVehicles: number | null;
  maxBookingsPerMonth: number | null;

  // Feature flags
  customDomainEnabled: boolean;
  smsEnabled: boolean;
  studentProgressEnabled: boolean;
  advancedReportsEnabled: boolean;
  waitlistEnabled: boolean;
  customBrandingEnabled: boolean;
  apiAccessEnabled: boolean;
}

/**
 * Get the entitlements for an organization.
 * Returns null if no subscription exists.
 */
export async function getEntitlements(
  client: SupabaseClient,
  organizationId: string
): Promise<Entitlements | null> {
  // Get the subscription with its plan
  const { data: subscription } = await client
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!subscription) return null;

  const sub = subscription as Subscription & { plan: Plan };
  const plan = sub.plan;
  const isActive =
    sub.status === 'trialing' ||
    sub.status === 'active' ||
    sub.status === 'past_due';

  return {
    planName: plan.name,
    planSlug: plan.slug,
    subscriptionStatus: sub.status,
    isActive,

    maxInstructors: plan.max_instructors,
    maxStudents: plan.max_students,
    maxLocations: plan.max_locations,
    maxVehicles: plan.max_vehicles,
    maxBookingsPerMonth: plan.max_bookings_per_month,

    customDomainEnabled: isActive && plan.custom_domain_enabled,
    smsEnabled: isActive && plan.sms_enabled,
    studentProgressEnabled: isActive && plan.student_progress_enabled,
    advancedReportsEnabled: isActive && plan.advanced_reports_enabled,
    waitlistEnabled: isActive && plan.waitlist_enabled,
    customBrandingEnabled: isActive && plan.custom_branding_enabled,
    apiAccessEnabled: isActive && plan.api_access_enabled,
  };
}

/**
 * Check if a feature is enabled for an organization.
 */
export async function isFeatureEnabled(
  client: SupabaseClient,
  organizationId: string,
  feature: keyof Pick<
    Entitlements,
    | 'customDomainEnabled'
    | 'smsEnabled'
    | 'studentProgressEnabled'
    | 'advancedReportsEnabled'
    | 'waitlistEnabled'
    | 'customBrandingEnabled'
    | 'apiAccessEnabled'
  >
): Promise<boolean> {
  const entitlements = await getEntitlements(client, organizationId);
  if (!entitlements) return false;
  return entitlements[feature];
}

/**
 * Check if adding one more of a resource would exceed the plan limit.
 * Returns { allowed: true } or { allowed: false, limit, current }.
 */
export async function checkUsageLimit(
  client: SupabaseClient,
  organizationId: string,
  resource: 'instructors' | 'students' | 'locations' | 'vehicles' | 'bookings_per_month'
): Promise<{ allowed: boolean; limit: number | null; current: number }> {
  const entitlements = await getEntitlements(client, organizationId);

  if (!entitlements || !entitlements.isActive) {
    return { allowed: false, limit: 0, current: 0 };
  }

  const limitMap: Record<string, number | null> = {
    instructors: entitlements.maxInstructors,
    students: entitlements.maxStudents,
    locations: entitlements.maxLocations,
    vehicles: entitlements.maxVehicles,
    bookings_per_month: entitlements.maxBookingsPerMonth,
  };

  const limit = limitMap[resource] ?? null;

  // Unlimited
  if (limit === null) {
    return { allowed: true, limit: null, current: 0 };
  }

  // Count current usage
  let current = 0;

  if (resource === 'bookings_per_month') {
    // Count bookings in the current month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count } = await client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', monthStart.toISOString());

    current = count ?? 0;
  } else {
    // Count active records
    const tableMap: Record<string, { table: string; activeField?: string }> = {
      instructors: { table: 'instructors', activeField: 'is_active' },
      students: { table: 'students', activeField: 'is_active' },
      locations: { table: 'locations', activeField: 'is_active' },
      vehicles: { table: 'vehicles' },
    };

    const config = tableMap[resource];
    if (config) {
      let query = client
        .from(config.table)
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (config.activeField) {
        query = query.eq(config.activeField, true);
      }

      const { count } = await query;
      current = count ?? 0;
    }
  }

  const allowed = current < limit;

  if (!allowed) {
    logger.info('Usage limit reached', {
      organizationId,
      resource,
      limit,
      current,
    });
  }

  return { allowed, limit, current };
}

// --------------------------------------------------
// Enforcement guards — throw if not allowed
// --------------------------------------------------

type FeatureFlag = keyof Pick<
  Entitlements,
  | 'customDomainEnabled'
  | 'smsEnabled'
  | 'studentProgressEnabled'
  | 'advancedReportsEnabled'
  | 'waitlistEnabled'
  | 'customBrandingEnabled'
  | 'apiAccessEnabled'
>;

/**
 * Require a feature to be enabled for the organization.
 * Throws SUBSCRIPTION_001_FEATURE_NOT_ALLOWED if not.
 */
export async function requireFeature(
  client: SupabaseClient,
  organizationId: string,
  feature: FeatureFlag
): Promise<void> {
  const enabled = await isFeatureEnabled(client, organizationId, feature);
  if (!enabled) {
    throw SubscriptionErrors.featureNotAllowed(feature);
  }
}

/**
 * Require that adding one more of a resource won't exceed the plan limit.
 * Throws SUBSCRIPTION_001_FEATURE_NOT_ALLOWED if the limit is reached.
 */
export async function requireUsageLimit(
  client: SupabaseClient,
  organizationId: string,
  resource: 'instructors' | 'students' | 'locations' | 'vehicles' | 'bookings_per_month'
): Promise<void> {
  const result = await checkUsageLimit(client, organizationId, resource);
  if (!result.allowed) {
    throw SubscriptionErrors.featureNotAllowed(
      `${resource} (limit: ${result.limit}, current: ${result.current})`
    );
  }
}
