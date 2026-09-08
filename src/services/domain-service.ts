// ==================================================
// Domain Service
// ==================================================
// Business logic for domain management.
// Handles domain creation, verification, removal,
// primary domain management, and domain events.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationDomain } from '@/types/database';
import type { DomainType, DomainStatus } from '@/config/constants';
import type { DomainProvider } from '@/lib/domain-provider/types';
import { normalizeHostname } from '@/lib/tenant/domain-normalizer';
import { DomainErrors, ValidationErrors } from '@/lib/errors';
import { logger } from '@/lib/logging';

// ---- Domain Queries ----

/**
 * Look up a domain record by normalized hostname.
 * Used by the tenant resolver during request handling.
 * This query runs without user authentication (public RLS policy).
 */
export async function findDomainByHostname(
  client: SupabaseClient,
  rawHostname: string
): Promise<OrganizationDomain | null> {
  const hostname = normalizeHostname(rawHostname);

  const { data, error } = await client
    .from('organization_domains')
    .select('*')
    .ilike('hostname', hostname)
    .maybeSingle();

  if (error) {
    logger.error('Failed to look up domain by hostname', error, {
      feature: 'domains',
      operation: 'find_by_hostname',
      hostname,
    });
    return null;
  }

  return data as OrganizationDomain | null;
}

/**
 * Get all domains for an organization.
 */
export async function getOrganizationDomains(
  client: SupabaseClient,
  organizationId: string
): Promise<OrganizationDomain[]> {
  const { data, error } = await client
    .from('organization_domains')
    .select('*')
    .eq('organization_id', organizationId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch organization domains', error, {
      feature: 'domains',
      operation: 'list',
      organizationId,
    });
    return [];
  }

  return (data ?? []) as OrganizationDomain[];
}

/**
 * Get a single domain by ID, scoped to organization.
 */
export async function getDomain(
  client: SupabaseClient,
  organizationId: string,
  domainId: string
): Promise<OrganizationDomain | null> {
  const { data, error } = await client
    .from('organization_domains')
    .select('*')
    .eq('id', domainId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch domain', error, {
      feature: 'domains',
      operation: 'get',
      organizationId,
      entityId: domainId,
    });
    return null;
  }

  return data as OrganizationDomain | null;
}

// ---- Platform Subdomain ----

/**
 * Create the automatic platform subdomain during onboarding.
 * Example: sydneysmart.driveflow.com.au
 *
 * Platform subdomains are auto-verified (no DNS setup needed).
 */
export async function createPlatformSubdomain(
  client: SupabaseClient,
  organizationId: string,
  slug: string,
  platformDomain: string
): Promise<OrganizationDomain> {
  const hostname = `${slug}.${normalizeHostname(platformDomain)}`;

  // Check uniqueness
  const existing = await findDomainByHostname(client, hostname);
  if (existing) {
    throw DomainErrors.alreadyRegistered(hostname);
  }

  const { data, error } = await client
    .from('organization_domains')
    .insert({
      organization_id: organizationId,
      hostname,
      domain_type: 'platform_subdomain' as DomainType,
      status: 'verified' as DomainStatus, // Auto-verified
      is_primary: true, // Default primary until custom domain is set
      redirect_to_primary: false,
      verified_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to create platform subdomain', error, {
      feature: 'domains',
      operation: 'create_platform_subdomain',
      organizationId,
      hostname,
    });
    throw ValidationErrors.invalidInput('Failed to create platform subdomain.');
  }

  await recordDomainEvent(client, organizationId, data.id, 'domain_created', {
    hostname,
    domain_type: 'platform_subdomain',
    auto_verified: true,
  });

  logger.info('Platform subdomain created', {
    feature: 'domains',
    operation: 'create_platform_subdomain',
    entityType: 'organization_domain',
    entityId: data.id,
    organizationId,
    hostname,
  });

  return data as OrganizationDomain;
}

// ---- Custom Domain Management ----

/**
 * Add a custom domain to an organization.
 *
 * Flow:
 * 1. Normalize hostname
 * 2. Validate format
 * 3. Check uniqueness (no other org owns it)
 * 4. Create pending record
 * 5. Register with hosting provider
 * 6. Return domain with DNS instructions
 */
export async function addCustomDomain(
  client: SupabaseClient,
  organizationId: string,
  hostname: string,
  domainType: 'custom_root' | 'custom_subdomain',
  provider: DomainProvider
): Promise<{ domain: OrganizationDomain; dnsInstructions: Awaited<ReturnType<DomainProvider['getDnsInstructions']>> }> {
  const normalizedHostname = normalizeHostname(hostname);

  // Check uniqueness
  const existing = await findDomainByHostname(client, normalizedHostname);
  if (existing) {
    throw DomainErrors.alreadyRegistered(normalizedHostname);
  }

  // Register with hosting provider
  const providerResult = await provider.addDomain(normalizedHostname);
  if (!providerResult.success) {
    throw DomainErrors.providerError(
      providerResult.error ?? 'Failed to register domain with provider'
    );
  }

  // Create pending domain record
  const { data, error } = await client
    .from('organization_domains')
    .insert({
      organization_id: organizationId,
      hostname: normalizedHostname,
      domain_type: domainType as DomainType,
      status: 'pending' as DomainStatus,
      is_primary: false, // Not primary until verified
      redirect_to_primary: false,
      external_provider_domain_id: providerResult.externalId ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    // Rollback provider registration
    await provider.removeDomain(normalizedHostname).catch(() => {});
    logger.error('Failed to create custom domain record', error, {
      feature: 'domains',
      operation: 'add_custom_domain',
      organizationId,
      hostname: normalizedHostname,
    });
    throw ValidationErrors.invalidInput('Failed to create domain record.');
  }

  // Get DNS instructions for the school owner
  const dnsInstructions = await provider.getDnsInstructions(normalizedHostname);

  await recordDomainEvent(client, organizationId, data.id, 'domain_created', {
    hostname: normalizedHostname,
    domain_type: domainType,
    provider_id: providerResult.externalId,
  });

  logger.info('Custom domain added (pending verification)', {
    feature: 'domains',
    operation: 'add_custom_domain',
    entityType: 'organization_domain',
    entityId: data.id,
    organizationId,
    hostname: normalizedHostname,
  });

  return { domain: data as OrganizationDomain, dnsInstructions };
}

/**
 * Verify a pending or verifying domain.
 *
 * Checks DNS configuration and SSL with the provider,
 * then updates the domain status accordingly.
 */
export async function verifyDomain(
  client: SupabaseClient,
  organizationId: string,
  domainId: string,
  provider: DomainProvider
): Promise<OrganizationDomain> {
  const domain = await getDomain(client, organizationId, domainId);
  if (!domain) {
    throw DomainErrors.unknownHost(`domain_id:${domainId}`);
  }

  if (domain.status === 'verified') {
    return domain; // Already verified
  }

  // Update status to verifying
  await client
    .from('organization_domains')
    .update({ status: 'verifying' as DomainStatus })
    .eq('id', domainId)
    .eq('organization_id', organizationId);

  await recordDomainEvent(client, organizationId, domainId, 'verification_started', {
    hostname: domain.hostname,
  });

  // Check with provider
  const result = await provider.verifyDomain(domain.hostname);

  if (!result.verified) {
    await client
      .from('organization_domains')
      .update({
        status: 'failed' as DomainStatus,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', domainId)
      .eq('organization_id', organizationId);

    await recordDomainEvent(client, organizationId, domainId, 'verification_failed', {
      hostname: domain.hostname,
      errors: result.errors,
    });

    throw DomainErrors.dnsVerificationFailed(domain.hostname);
  }

  // Verification succeeded
  const sslStatus = result.sslActive ? 'active' : 'pending';
  const now = new Date().toISOString();

  const { data: updated, error } = await client
    .from('organization_domains')
    .update({
      status: 'verified' as DomainStatus,
      ssl_status: sslStatus,
      verified_at: now,
      last_checked_at: now,
    })
    .eq('id', domainId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error || !updated) {
    throw ValidationErrors.invalidInput('Failed to update domain status.');
  }

  await recordDomainEvent(client, organizationId, domainId, 'domain_verified', {
    hostname: domain.hostname,
    ssl_status: sslStatus,
  });

  if (sslStatus === 'active') {
    await recordDomainEvent(client, organizationId, domainId, 'ssl_active', {
      hostname: domain.hostname,
    });
  } else {
    await recordDomainEvent(client, organizationId, domainId, 'ssl_pending', {
      hostname: domain.hostname,
    });
  }

  logger.info('Domain verified', {
    feature: 'domains',
    operation: 'verify',
    entityType: 'organization_domain',
    entityId: domainId,
    organizationId,
    hostname: domain.hostname,
    sslStatus,
  });

  return updated as OrganizationDomain;
}

// ---- Primary Domain Management ----

/**
 * Set a domain as the primary domain for an organization.
 * The domain must be verified. Only one domain can be primary.
 */
export async function setPrimaryDomain(
  client: SupabaseClient,
  organizationId: string,
  domainId: string
): Promise<OrganizationDomain> {
  // Verify the target domain exists and is verified
  const domain = await getDomain(client, organizationId, domainId);
  if (!domain) {
    throw DomainErrors.unknownHost(`domain_id:${domainId}`);
  }

  if (domain.status !== 'verified') {
    throw DomainErrors.notVerified(domain.hostname);
  }

  // Unset current primary
  await client
    .from('organization_domains')
    .update({ is_primary: false })
    .eq('organization_id', organizationId)
    .eq('is_primary', true);

  // Set new primary
  const { data: updated, error } = await client
    .from('organization_domains')
    .update({ is_primary: true })
    .eq('id', domainId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error || !updated) {
    throw ValidationErrors.invalidInput('Failed to set primary domain.');
  }

  await recordDomainEvent(client, organizationId, domainId, 'primary_changed', {
    hostname: domain.hostname,
  });

  logger.info('Primary domain changed', {
    feature: 'domains',
    operation: 'set_primary',
    entityType: 'organization_domain',
    entityId: domainId,
    organizationId,
    hostname: domain.hostname,
  });

  return updated as OrganizationDomain;
}

/**
 * Get the primary domain for an organization.
 */
export async function getPrimaryDomain(
  client: SupabaseClient,
  organizationId: string
): Promise<OrganizationDomain | null> {
  const { data } = await client
    .from('organization_domains')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_primary', true)
    .maybeSingle();

  return data as OrganizationDomain | null;
}

// ---- Domain Removal ----

/**
 * Remove a domain from an organization.
 * Cannot remove the last verified domain or the primary domain
 * if other verified domains exist.
 */
export async function removeDomain(
  client: SupabaseClient,
  organizationId: string,
  domainId: string,
  provider: DomainProvider
): Promise<void> {
  const domain = await getDomain(client, organizationId, domainId);
  if (!domain) {
    throw DomainErrors.unknownHost(`domain_id:${domainId}`);
  }

  // Platform subdomains cannot be removed
  if (domain.domain_type === 'platform_subdomain') {
    throw ValidationErrors.invalidInput(
      'Platform subdomains cannot be removed.',
      { domainId, hostname: domain.hostname }
    );
  }

  // Remove from provider (best-effort)
  if (domain.external_provider_domain_id) {
    await provider.removeDomain(domain.hostname).catch((err) => {
      logger.warn('Failed to remove domain from provider', {
        feature: 'domains',
        operation: 'remove_from_provider',
        hostname: domain.hostname,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // If this was the primary domain, promote the platform subdomain
  if (domain.is_primary) {
    const platformSubdomain = await client
      .from('organization_domains')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('domain_type', 'platform_subdomain')
      .maybeSingle();

    if (platformSubdomain.data) {
      await client
        .from('organization_domains')
        .update({ is_primary: true })
        .eq('id', platformSubdomain.data.id);
    }
  }

  // Delete the domain record
  const { error } = await client
    .from('organization_domains')
    .delete()
    .eq('id', domainId)
    .eq('organization_id', organizationId);

  if (error) {
    throw ValidationErrors.invalidInput('Failed to remove domain.');
  }

  await recordDomainEvent(client, organizationId, domainId, 'domain_removed', {
    hostname: domain.hostname,
  });

  logger.info('Domain removed', {
    feature: 'domains',
    operation: 'remove',
    entityType: 'organization_domain',
    entityId: domainId,
    organizationId,
    hostname: domain.hostname,
  });
}

// ---- Domain Health ----

/**
 * Check the health of a domain with its provider.
 */
export async function checkDomainHealth(
  client: SupabaseClient,
  organizationId: string,
  domainId: string,
  provider: DomainProvider
): Promise<{ domain: OrganizationDomain; configured: boolean; sslActive: boolean; error?: string }> {
  const domain = await getDomain(client, organizationId, domainId);
  if (!domain) {
    throw DomainErrors.unknownHost(`domain_id:${domainId}`);
  }

  // Platform subdomains are always healthy
  if (domain.domain_type === 'platform_subdomain') {
    return { domain, configured: true, sslActive: true };
  }

  const status = await provider.getDomainStatus(domain.hostname);

  // Update last_checked_at
  await client
    .from('organization_domains')
    .update({
      last_checked_at: new Date().toISOString(),
      ssl_status: status.sslActive ? 'active' : 'pending',
    })
    .eq('id', domainId)
    .eq('organization_id', organizationId);

  return {
    domain,
    configured: status.configured,
    sslActive: status.sslActive,
    error: status.error,
  };
}

// ---- Domain Events ----

/**
 * Record a domain lifecycle event.
 */
async function recordDomainEvent(
  client: SupabaseClient,
  organizationId: string,
  domainId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await client.from('domain_events').insert({
    organization_id: organizationId,
    domain_id: domainId,
    event_type: eventType,
    metadata,
  });

  if (error) {
    // Log but don't throw — event recording is not critical
    logger.warn('Failed to record domain event', {
      feature: 'domains',
      operation: 'record_event',
      eventType,
      organizationId,
      domainId: domainId,
    });
  }
}
