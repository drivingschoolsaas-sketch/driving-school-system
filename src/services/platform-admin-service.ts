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
    // Sanitize search to prevent PostgREST filter injection
    const safe = options.search.replace(/[%,().*\\]/g, '');
    if (safe) {
      query = query.or(
        `name.ilike.%${safe}%,slug.ilike.%${safe}%`
      );
    }
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
// Create Organization (Add New School)
// --------------------------------------------------

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
  email?: string;
  phone?: string;
  timezone?: string;
  country?: string;
  status?: string;
}

export interface CreateOrganizationResult {
  organization: Organization;
  ownerUserId: string;
  /** True if an invitation email was sent (new user). False if existing user was added. */
  inviteSent: boolean;
}

/**
 * Create a new organization with an owner user.
 *
 * P1-5: Uses invitation-based onboarding instead of setting passwords
 * directly. New users receive a Supabase Auth invite email with a
 * magic link to set their own password. Existing users are simply
 * added as school_owner members.
 *
 * Steps:
 * 1. Create the organization record
 * 2. Invite the owner via Supabase Auth (or find existing user)
 * 3. Create an organization_members entry with role 'school_owner'
 * 4. Create default school_settings
 * 5. Audit-log the action
 */
export async function createOrganization(
  client: SupabaseClient,
  input: CreateOrganizationInput,
  adminUserId: string
): Promise<CreateOrganizationResult> {
  // 1a. Block reserved platform slugs (P2-3)
  const RESERVED_SLUGS = [
    'admin', 'api', 'app', 'www', 'mail', 'status', 'docs',
    'help', 'support', 'billing', 'auth', 'cdn', 'static',
    'portal', 'dashboard', 'login', 'signup', 'register',
  ];
  if (RESERVED_SLUGS.includes(input.slug)) {
    throw new Error(`"${input.slug}" is a reserved platform slug and cannot be used`);
  }

  // 1b. Check slug uniqueness
  const { data: existing } = await client
    .from('organizations')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle();

  if (existing) {
    throw new Error(`Organization slug "${input.slug}" is already taken`);
  }

  // 2. Create the organization
  const { data: org, error: orgError } = await client
    .from('organizations')
    .insert({
      name: input.name,
      slug: input.slug,
      status: input.status ?? 'trial',
      email: input.email ?? null,
      phone: input.phone ?? null,
      timezone: input.timezone ?? 'Australia/Sydney',
      country: input.country ?? 'AU',
      currency: 'AUD',
      subscription_status: 'trialing',
    })
    .select()
    .single();

  if (orgError) throw orgError;

  let ownerUserId: string;
  let inviteSent = false;

  const { data: createData, error: createErr } =
    await client.auth.admin.createUser({
      email: input.ownerEmail,
      email_confirm: false,
      user_metadata: { full_name: input.ownerName },
    });

  if (createErr) {
    if (createErr.message?.includes('already been registered') || (createErr as { status?: number }).status === 422) {
      const { data: { users }, error: lookupErr } = await client.auth.admin.listUsers({
        perPage: 1,
        page: 1,
        filter: { email: input.ownerEmail },
      } as Parameters<typeof client.auth.admin.listUsers>[0]);
      const existingOwner = users?.find((u) => u.email === input.ownerEmail);
      if (lookupErr || !existingOwner) {
        await client.from('organizations').delete().eq('id', org.id);
        throw new Error('Owner email exists but could not be found. Please try again.');
      }
      ownerUserId = existingOwner.id;
      inviteSent = false;
    } else {
      await client.from('organizations').delete().eq('id', org.id);
      throw createErr;
    }
  } else if (!createData.user) {
    await client.from('organizations').delete().eq('id', org.id);
    throw new Error('Failed to create owner account');
  } else {
    ownerUserId = createData.user.id;
    inviteSent = true;
  }

  // 4. Create org membership (must succeed — org without owner is broken)
  const { error: memberErr } = await client
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: ownerUserId,
      role: 'school_owner',
      status: 'active',
    });

  if (memberErr) {
    // Rollback: delete the org since it has no owner
    logger.error('Failed to create owner membership — rolling back org', {
      organizationId: org.id,
      ownerUserId,
      error: memberErr.message,
    });
    await client.from('organizations').delete().eq('id', org.id);
    throw new Error('Failed to create owner membership');
  }

  // 5. Create default school_settings
  const { error: settingsErr } = await client
    .from('school_settings')
    .insert({
      organization_id: org.id,
      school_name: input.name,
      primary_color: '#2563eb',
      secondary_color: '#1e40af',
    });

  if (settingsErr) {
    logger.error('Failed to create default settings', {
      organizationId: org.id,
      error: settingsErr.message,
    });
  }

  // 6. Audit log
  await createAuditLog(client, {
    organizationId: org.id,
    userId: adminUserId,
    action: 'organization.created',
    resourceType: 'organization',
    resourceId: org.id,
    details: {
      name: input.name,
      slug: input.slug,
      owner_email: input.ownerEmail,
      invite_sent: inviteSent,
    },
  });

  logger.info('Organization created by platform admin', {
    organizationId: org.id,
    slug: input.slug,
    inviteSent,
    adminUserId,
  });

  return { organization: org as Organization, ownerUserId, inviteSent };
}

// --------------------------------------------------
// Add Domain to Organization
// --------------------------------------------------

export interface AddDomainInput {
  organizationId: string;
  hostname: string;
  domainType: 'platform_subdomain' | 'custom_root' | 'custom_subdomain';
  isPrimary?: boolean;
}

/**
 * Add a domain (hostname) to an organization.
 *
 * Platform subdomains (*.driveflow.com.au) are auto-verified since
 * they are under platform control. Custom domains are inserted as
 * 'pending_verification' — real DNS verification is required.
 */
export async function addDomainToOrganization(
  client: SupabaseClient,
  input: AddDomainInput,
  adminUserId: string
): Promise<DomainHealthRecord> {
  const normalizedHostname = input.hostname.toLowerCase().trim();

  // 1. Block reserved platform hostnames for subdomains
  if (input.domainType === 'platform_subdomain') {
    const reservedSlugs = [
      'admin', 'api', 'app', 'www', 'mail', 'status', 'docs',
      'help', 'support', 'billing', 'auth', 'cdn', 'static',
    ];
    const subdomain = normalizedHostname.split('.')[0];
    if (reservedSlugs.includes(subdomain)) {
      throw new Error(`"${subdomain}" is a reserved platform hostname and cannot be used`);
    }
  }

  // 2. Check hostname uniqueness
  const { data: existingDomain } = await client
    .from('organization_domains')
    .select('id')
    .eq('hostname', normalizedHostname)
    .maybeSingle();

  if (existingDomain) {
    throw new Error(
      `Hostname "${normalizedHostname}" is already assigned to another organization`
    );
  }

  // 3. Verify the organization exists
  const { data: org } = await client
    .from('organizations')
    .select('id, name')
    .eq('id', input.organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // 4. Determine initial status:
  //    - Platform subdomains are auto-verified (we control DNS)
  //    - Custom domains require DNS TXT record verification
  const isAutoVerified = input.domainType === 'platform_subdomain';
  const now = new Date().toISOString();
  const verificationToken = isAutoVerified
    ? null
    : `driveflow-verify-${require('crypto').randomBytes(16).toString('hex')}`;

  // 5. If setting as primary, unset current primary for this org
  //    (only if auto-verified — pending domains can't be primary)
  if (input.isPrimary && isAutoVerified) {
    await client
      .from('organization_domains')
      .update({ is_primary: false })
      .eq('organization_id', input.organizationId)
      .eq('is_primary', true);
  }

  // 6. Insert the domain
  const { data: domain, error: domainErr } = await client
    .from('organization_domains')
    .insert({
      organization_id: input.organizationId,
      hostname: normalizedHostname,
      domain_type: input.domainType,
      status: isAutoVerified ? 'verified' : 'pending_verification',
      is_primary: isAutoVerified ? (input.isPrimary ?? false) : false,
      ssl_status: 'pending',
      verified_at: isAutoVerified ? now : null,
      verification_token: verificationToken,
    })
    .select()
    .single();

  if (domainErr) throw domainErr;

  // 7. Audit log
  await createAuditLog(client, {
    organizationId: input.organizationId,
    userId: adminUserId,
    action: 'domain.added',
    resourceType: 'organization_domain',
    resourceId: domain.id as string,
    details: {
      hostname: normalizedHostname,
      domain_type: input.domainType,
      is_primary: isAutoVerified ? (input.isPrimary ?? false) : false,
      auto_verified: isAutoVerified,
      organization_name: (org as { name: string }).name,
    },
  });

  logger.info('Domain added by platform admin', {
    organizationId: input.organizationId,
    hostname: normalizedHostname,
    status: isAutoVerified ? 'verified' : 'pending_verification',
    adminUserId,
  });

  // If custom domain, log DNS verification instructions
  if (!isAutoVerified) {
    logger.info('Custom domain requires DNS verification', {
      organizationId: input.organizationId,
      hostname: normalizedHostname,
      verificationRecord: `_driveflow-verify.${normalizedHostname} TXT ${verificationToken}`,
    });
  }

  return {
    id: domain.id as string,
    organization_id: domain.organization_id as string,
    hostname: domain.hostname as string,
    domain_type: domain.domain_type as string,
    status: domain.status as string,
    is_primary: domain.is_primary as boolean,
    ssl_status: domain.ssl_status as string | null,
    last_checked_at: domain.last_checked_at as string | null,
    verified_at: domain.verified_at as string | null,
    organization_name: (org as { name: string }).name,
  };
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
      .in('status', ['failed', 'pending_verification']),
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
