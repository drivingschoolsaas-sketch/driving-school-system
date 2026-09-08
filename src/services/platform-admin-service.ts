// ==================================================
// Platform Admin Service
// ==================================================
// Business logic for the platform super-admin dashboard.
// All queries use the admin client (service role) to
// access data across all organizations.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Organization,
  Subscription,
  Plan,
  AuditLog,
  FeatureFlag,
} from '@/types/database';
import { logger } from '@/lib/logging';

// --------------------------------------------------
// Platform Stats
// --------------------------------------------------

export interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
  totalStudents: number;
  totalInstructors: number;
  totalBookings: number;
  totalBookingsThisMonth: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pastDueSubscriptions: number;
  failedWebhooks: number;
}

/**
 * Get platform-wide statistics for the admin overview.
 */
export async function getPlatformStats(
  client: SupabaseClient
): Promise<PlatformStats> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    orgs,
    activeOrgs,
    trialOrgs,
    suspendedOrgs,
    students,
    instructors,
    bookings,
    bookingsThisMonth,
    activeSubs,
    trialingSubs,
    pastDueSubs,
    failedWebhooks,
  ] = await Promise.all([
    client
      .from('organizations')
      .select('id', { count: 'exact', head: true }),
    client
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    client
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'trial'),
    client
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'suspended'),
    client
      .from('students')
      .select('id', { count: 'exact', head: true }),
    client
      .from('instructors')
      .select('id', { count: 'exact', head: true }),
    client
      .from('bookings')
      .select('id', { count: 'exact', head: true }),
    client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString()),
    client
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    client
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'trialing'),
    client
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'past_due'),
    client
      .from('webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed'),
  ]);

  return {
    totalOrganizations: orgs.count ?? 0,
    activeOrganizations: activeOrgs.count ?? 0,
    trialOrganizations: trialOrgs.count ?? 0,
    suspendedOrganizations: suspendedOrgs.count ?? 0,
    totalStudents: students.count ?? 0,
    totalInstructors: instructors.count ?? 0,
    totalBookings: bookings.count ?? 0,
    totalBookingsThisMonth: bookingsThisMonth.count ?? 0,
    activeSubscriptions: activeSubs.count ?? 0,
    trialingSubscriptions: trialingSubs.count ?? 0,
    pastDueSubscriptions: pastDueSubs.count ?? 0,
    failedWebhooks: failedWebhooks.count ?? 0,
  };
}

// --------------------------------------------------
// Organizations Management
// --------------------------------------------------

export interface OrganizationWithSubscription extends Organization {
  subscription?: Subscription & { plan?: Plan };
}

/**
 * List all organizations with optional status filter.
 */
export async function listOrganizations(
  client: SupabaseClient,
  options?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: OrganizationWithSubscription[]; total: number }> {
  let query = client
    .from('organizations')
    .select('*, subscription:subscriptions(*, plan:plans(*))', {
      count: 'exact',
    });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.search) {
    query = query.or(
      `name.ilike.%${options.search}%,slug.ilike.%${options.search}%`
    );
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset ?? 0,
      (options?.offset ?? 0) + (options?.limit ?? 25) - 1
    );

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    data: (data ?? []) as OrganizationWithSubscription[],
    total: count ?? 0,
  };
}

/**
 * Get a single organization with full details.
 */
export async function getOrganizationDetails(
  client: SupabaseClient,
  organizationId: string
): Promise<OrganizationWithSubscription | null> {
  const { data, error } = await client
    .from('organizations')
    .select('*, subscription:subscriptions(*, plan:plans(*))')
    .eq('id', organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as OrganizationWithSubscription | null;
}

/**
 * Update an organization's status (e.g., suspend, activate).
 */
export async function updateOrganizationStatus(
  client: SupabaseClient,
  organizationId: string,
  status: string,
  adminUserId: string
): Promise<Organization> {
  const { data, error } = await client
    .from('organizations')
    .update({ status })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) throw error;

  // Log the action
  await createAuditLog(client, {
    organizationId,
    userId: adminUserId,
    action: `organization.status_changed`,
    resourceType: 'organization',
    resourceId: organizationId,
    details: { new_status: status },
  });

  logger.info('Organization status updated by platform admin', {
    organizationId,
    status,
    adminUserId,
  });

  return data as Organization;
}

// --------------------------------------------------
// Domain Health
// --------------------------------------------------

export interface DomainHealthRecord {
  id: string;
  organization_id: string;
  hostname: string;
  domain_type: string;
  status: string;
  is_primary: boolean;
  ssl_status: string | null;
  last_checked_at: string | null;
  verified_at: string | null;
  organization_name?: string;
}

/**
 * Get all domains across all organizations for health monitoring.
 */
export async function getDomainHealth(
  client: SupabaseClient,
  options?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: DomainHealthRecord[]; total: number }> {
  let query = client
    .from('organization_domains')
    .select('*, organization:organizations(name)', { count: 'exact' });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.search) {
    query = query.ilike('hostname', `%${options.search}%`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset ?? 0,
      (options?.offset ?? 0) + (options?.limit ?? 25) - 1
    );

  const { data, error, count } = await query;

  if (error) throw error;

  const records = (data ?? []).map((d) => {
    const row = d as Record<string, unknown>;
    const org = row.organization as { name: string } | null;
    return {
      id: row.id as string,
      organization_id: row.organization_id as string,
      hostname: row.hostname as string,
      domain_type: row.domain_type as string,
      status: row.status as string,
      is_primary: row.is_primary as boolean,
      ssl_status: row.ssl_status as string | null,
      last_checked_at: row.last_checked_at as string | null,
      verified_at: row.verified_at as string | null,
      organization_name: org?.name,
    };
  });

  return { data: records, total: count ?? 0 };
}

// --------------------------------------------------
// Audit Logs
// --------------------------------------------------

/**
 * Create an audit log entry.
 */
export async function createAuditLog(
  client: SupabaseClient,
  input: {
    organizationId?: string;
    userId: string;
    userEmail?: string;
    userRole?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }
): Promise<AuditLog> {
  const { data, error } = await client
    .from('audit_logs')
    .insert({
      organization_id: input.organizationId ?? null,
      user_id: input.userId,
      user_email: input.userEmail ?? null,
      user_role: input.userRole ?? null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      details: input.details ?? {},
      ip_address: input.ipAddress ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AuditLog;
}

/**
 * Get audit logs with optional filters.
 */
export async function getAuditLogs(
  client: SupabaseClient,
  options?: {
    organizationId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: AuditLog[]; total: number }> {
  let query = client
    .from('audit_logs')
    .select('*', { count: 'exact' });

  if (options?.organizationId) {
    query = query.eq('organization_id', options.organizationId);
  }

  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options?.action) {
    query = query.eq('action', options.action);
  }

  if (options?.resourceType) {
    query = query.eq('resource_type', options.resourceType);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(
      options?.offset ?? 0,
      (options?.offset ?? 0) + (options?.limit ?? 50) - 1
    );

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    data: (data ?? []) as AuditLog[],
    total: count ?? 0,
  };
}

// --------------------------------------------------
// Feature Flags
// --------------------------------------------------

/**
 * Get all feature flags.
 */
export async function getFeatureFlags(
  client: SupabaseClient
): Promise<FeatureFlag[]> {
  const { data, error } = await client
    .from('feature_flags')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data ?? []) as FeatureFlag[];
}

/**
 * Toggle a feature flag.
 */
export async function toggleFeatureFlag(
  client: SupabaseClient,
  flagId: string,
  isEnabled: boolean,
  adminUserId: string
): Promise<FeatureFlag> {
  const { data, error } = await client
    .from('feature_flags')
    .update({ is_enabled: isEnabled })
    .eq('id', flagId)
    .select()
    .single();

  if (error) throw error;

  await createAuditLog(client, {
    userId: adminUserId,
    action: `feature_flag.${isEnabled ? 'enabled' : 'disabled'}`,
    resourceType: 'feature_flag',
    resourceId: flagId,
    details: { flag_name: (data as FeatureFlag).name, is_enabled: isEnabled },
  });

  return data as FeatureFlag;
}

/**
 * Check if a feature flag is enabled for an organization.
 */
export async function isFeatureFlagEnabled(
  client: SupabaseClient,
  flagName: string,
  organizationId?: string
): Promise<boolean> {
  const { data, error } = await client
    .from('feature_flags')
    .select('*')
    .eq('name', flagName)
    .maybeSingle();

  if (error || !data) return false;

  const flag = data as FeatureFlag;
  if (!flag.is_enabled) return false;

  // If no allowed_organizations, flag is global
  if (!flag.allowed_organizations || flag.allowed_organizations.length === 0) {
    return true;
  }

  // If scoped, check if the org is in the allowed list
  if (organizationId) {
    return flag.allowed_organizations.includes(organizationId);
  }

  return true;
}

// --------------------------------------------------
// System Health
// --------------------------------------------------

export interface SystemHealth {
  failedWebhooks: number;
  failedNotifications: number;
  pendingWebhooks: number;
  domainsNeedingAttention: number;
  pastDueSubscriptions: number;
  recentErrors: Array<{
    id: string;
    event_type: string;
    status: string;
    processing_errors: string[] | null;
    created_at: string;
  }>;
}

/**
 * Get system health overview.
 */
export async function getSystemHealth(
  client: SupabaseClient
): Promise<SystemHealth> {
  const [
    failedWebhooks,
    failedNotifications,
    pendingWebhooks,
    domainsNeedingAttention,
    pastDueSubscriptions,
    recentErrors,
  ] = await Promise.all([
    client
      .from('webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed'),
    client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed'),
    client
      .from('webhook_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    client
      .from('organization_domains')
      .select('id', { count: 'exact', head: true })
      .in('status', ['failed', 'pending']),
    client
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'past_due'),
    client
      .from('webhook_events')
      .select('id, event_type, status, processing_errors, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    failedWebhooks: failedWebhooks.count ?? 0,
    failedNotifications: failedNotifications.count ?? 0,
    pendingWebhooks: pendingWebhooks.count ?? 0,
    domainsNeedingAttention: domainsNeedingAttention.count ?? 0,
    pastDueSubscriptions: pastDueSubscriptions.count ?? 0,
    recentErrors: (recentErrors.data ?? []) as SystemHealth['recentErrors'],
  };
}
