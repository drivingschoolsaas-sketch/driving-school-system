// ==================================================
// Tenant Resolver
// ==================================================
// Centralized hostname → organization resolution.
// This is the SINGLE entry point for determining
// which organization a request belongs to.
//
// Resolution flow:
// hostname → normalize → classify → query organization_domains
// → validate domain status → load organization
// → check org status → return TenantContext

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  classifyHostname,
  type HostnameClassification,
} from './domain-normalizer';
import type { ResolvedContext } from './tenant-context';
import type { Organization, OrganizationDomain } from '@/types/database';
import { DomainErrors } from '@/lib/errors';
import { logger } from '@/lib/logging';

interface ResolveOptions {
  platformDomain: string;
  adminSubdomain?: string;
}

/**
 * Resolve a hostname to either a tenant or platform context.
 *
 * Flow:
 * 1. Normalize hostname
 * 2. Classify hostname type
 * 3. For platform hostnames → return platform context
 * 4. For tenant hostnames → look up organization_domains
 * 5. Validate domain status
 * 6. Load organization
 * 7. Check organization status
 * 8. Return tenant context
 *
 * @param rawHostname - The raw Host header from the request
 * @param options - Platform configuration
 * @param client - Optional Supabase client for tenant resolution
 */
export async function resolveHostname(
  rawHostname: string,
  options: ResolveOptions,
  client?: SupabaseClient
): Promise<ResolvedContext> {
  const classification = classifyHostname(
    rawHostname,
    options.platformDomain,
    options.adminSubdomain
  );

  logger.debug('Hostname classified', {
    feature: 'tenant',
    operation: 'resolve_hostname',
    result: classification.type,
    hostname: classification.normalized,
  });

  // Non-tenant hostnames resolve to platform contexts
  if (classification.type !== 'tenant') {
    return {
      kind: 'platform',
      platform: {
        type: classification.type,
        hostname: classification.normalized,
      },
    };
  }

  // Tenant resolution requires a database client
  if (!client) {
    logger.warn('Tenant resolution attempted without database client', {
      feature: 'tenant',
      operation: 'resolve_hostname',
      hostname: classification.normalized,
    });
    throw DomainErrors.unknownHost(classification.normalized);
  }

  return resolveTenantFromDatabase(client, classification);
}

/**
 * Resolve a tenant hostname from the database.
 *
 * 1. Query organization_domains by normalized hostname
 * 2. Check domain status (must be 'verified')
 * 3. Load organization by organization_id
 * 4. Check organization status (must be 'active' or 'trial')
 * 5. Return TenantContext
 */
async function resolveTenantFromDatabase(
  client: SupabaseClient,
  classification: HostnameClassification
): Promise<ResolvedContext> {
  const hostname = classification.normalized;

  // Step 1: Look up the domain record
  const { data: domainRecord, error: domainError } = await client
    .from('organization_domains')
    .select('*')
    .ilike('hostname', hostname)
    .maybeSingle();

  if (domainError) {
    logger.error('Database error during domain lookup', domainError, {
      feature: 'tenant',
      operation: 'resolve_tenant_from_database',
      hostname,
    });
    throw DomainErrors.unknownHost(hostname);
  }

  if (!domainRecord) {
    logger.debug('No domain record found for hostname', {
      feature: 'tenant',
      operation: 'resolve_tenant_from_database',
      hostname,
    });
    throw DomainErrors.unknownHost(hostname);
  }

  const domain = domainRecord as OrganizationDomain;

  // Step 2: Check domain status — must be 'verified'
  if (domain.status !== 'verified') {
    logger.debug('Domain found but not verified', {
      feature: 'tenant',
      operation: 'resolve_tenant_from_database',
      hostname,
      domainStatus: domain.status,
    });
    throw DomainErrors.notVerified(hostname);
  }

  // Step 3: Load the organization
  const { data: orgRecord, error: orgError } = await client
    .from('organizations')
    .select('*')
    .eq('id', domain.organization_id)
    .single();

  if (orgError || !orgRecord) {
    logger.error('Failed to load organization for domain', orgError, {
      feature: 'tenant',
      operation: 'resolve_tenant_from_database',
      hostname,
      organizationId: domain.organization_id,
    });
    throw DomainErrors.unknownHost(hostname);
  }

  const org = orgRecord as Organization;

  // Step 4: Check organization status — must be 'active' or 'trial'
  if (org.status !== 'active' && org.status !== 'trial') {
    logger.info('Organization not active for domain', {
      feature: 'tenant',
      operation: 'resolve_tenant_from_database',
      hostname,
      organizationId: org.id,
      organizationStatus: org.status,
    });
    throw DomainErrors.organizationSuspended(hostname);
  }

  // Step 5: Return TenantContext
  logger.debug('Tenant resolved successfully', {
    feature: 'tenant',
    operation: 'resolve_tenant_from_database',
    hostname,
    organizationId: org.id,
    organizationSlug: org.slug,
  });

  return {
    kind: 'tenant',
    tenant: {
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      organizationStatus: org.status,
      hostname,
      timezone: org.timezone,
      currency: org.currency,
    },
  };
}
