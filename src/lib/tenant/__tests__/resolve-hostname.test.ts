import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveHostname } from '../resolve-hostname';
import { expectAppErrorAsync } from '@/tests/helpers';

// ==================================================
// Domain Resolution Tests
// ==================================================
// Tests the full hostname → TenantContext flow including
// database queries against organization_domains and organizations.

const PLATFORM_DOMAIN = 'driveflow.com.au';

const ORG_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Sydney Smart Driving',
  slug: 'sydneysmart',
  status: 'active',
  timezone: 'Australia/Sydney',
  currency: 'AUD',
  country: 'AU',
  phone: null,
  email: null,
  subscription_status: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const DOMAIN_A = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  organization_id: ORG_A.id,
  hostname: 'sydneysmart.driveflow.com.au',
  domain_type: 'platform_subdomain',
  status: 'verified',
  is_primary: true,
  redirect_to_primary: false,
  verification_method: null,
  verification_token: null,
  ssl_status: 'active',
  external_provider_domain_id: null,
  last_checked_at: null,
  verified_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function createMockClient(
  domainData: Record<string, unknown> | null,
  orgData: Record<string, unknown> | null,
  domainError: Error | null = null,
  orgError: Error | null = null
) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'organization_domains') {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: domainData,
                error: domainError,
              }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: orgData,
                error: orgError,
              }),
            }),
          }),
        };
      }
      return {};
    }),
  } as unknown as Parameters<typeof resolveHostname>[2];
}

describe('resolveHostname', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -- Platform Contexts (no DB needed) --

  it('resolves localhost as platform context', async () => {
    const result = await resolveHostname('localhost', {
      platformDomain: PLATFORM_DOMAIN,
    });
    expect(result.kind).toBe('platform');
    if (result.kind === 'platform') {
      expect(result.platform.type).toBe('localhost');
    }
  });

  it('resolves admin subdomain as platform_admin', async () => {
    const result = await resolveHostname('admin.driveflow.com.au', {
      platformDomain: PLATFORM_DOMAIN,
    });
    expect(result.kind).toBe('platform');
    if (result.kind === 'platform') {
      expect(result.platform.type).toBe('platform_admin');
    }
  });

  it('resolves root platform domain as platform_website', async () => {
    const result = await resolveHostname('driveflow.com.au', {
      platformDomain: PLATFORM_DOMAIN,
    });
    expect(result.kind).toBe('platform');
    if (result.kind === 'platform') {
      expect(result.platform.type).toBe('platform_website');
    }
  });

  // -- Tenant Resolution --

  it('throws DOMAIN_001 when no database client is provided for tenant hostname', async () => {
    await expectAppErrorAsync(
      () =>
        resolveHostname('sydneysmart.driveflow.com.au', {
          platformDomain: PLATFORM_DOMAIN,
        }),
      'DOMAIN_001_UNKNOWN_HOST'
    );
  });

  it('resolves verified domain to tenant context', async () => {
    const client = createMockClient(DOMAIN_A, ORG_A);

    const result = await resolveHostname('sydneysmart.driveflow.com.au', {
      platformDomain: PLATFORM_DOMAIN,
    }, client);

    expect(result.kind).toBe('tenant');
    if (result.kind === 'tenant') {
      expect(result.tenant.organizationId).toBe(ORG_A.id);
      expect(result.tenant.organizationName).toBe(ORG_A.name);
      expect(result.tenant.organizationSlug).toBe(ORG_A.slug);
      expect(result.tenant.organizationStatus).toBe('active');
      expect(result.tenant.hostname).toBe('sydneysmart.driveflow.com.au');
      expect(result.tenant.timezone).toBe('Australia/Sydney');
      expect(result.tenant.currency).toBe('AUD');
    }
  });

  it('resolves custom domain to tenant context', async () => {
    const customDomain = {
      ...DOMAIN_A,
      hostname: 'book.sydneysmartdriving.com.au',
      domain_type: 'custom_subdomain',
    };
    const client = createMockClient(customDomain, ORG_A);

    const result = await resolveHostname('book.sydneysmartdriving.com.au', {
      platformDomain: PLATFORM_DOMAIN,
    }, client);

    expect(result.kind).toBe('tenant');
    if (result.kind === 'tenant') {
      expect(result.tenant.organizationId).toBe(ORG_A.id);
      expect(result.tenant.hostname).toBe('book.sydneysmartdriving.com.au');
    }
  });

  it('throws DOMAIN_001 when domain not found in database', async () => {
    const client = createMockClient(null, null);

    await expectAppErrorAsync(
      () =>
        resolveHostname('unknown.driveflow.com.au', {
          platformDomain: PLATFORM_DOMAIN,
        }, client),
      'DOMAIN_001_UNKNOWN_HOST'
    );
  });

  it('throws DOMAIN_002 when domain is not verified', async () => {
    const pendingDomain = { ...DOMAIN_A, status: 'pending' };
    const client = createMockClient(pendingDomain, ORG_A);

    await expectAppErrorAsync(
      () =>
        resolveHostname('sydneysmart.driveflow.com.au', {
          platformDomain: PLATFORM_DOMAIN,
        }, client),
      'DOMAIN_002_NOT_VERIFIED'
    );
  });

  it('throws DOMAIN_002 when domain status is "verifying"', async () => {
    const verifyingDomain = { ...DOMAIN_A, status: 'verifying' };
    const client = createMockClient(verifyingDomain, ORG_A);

    await expectAppErrorAsync(
      () =>
        resolveHostname('sydneysmart.driveflow.com.au', {
          platformDomain: PLATFORM_DOMAIN,
        }, client),
      'DOMAIN_002_NOT_VERIFIED'
    );
  });

  it('throws DOMAIN_006 when organization is suspended', async () => {
    const suspendedOrg = { ...ORG_A, status: 'suspended' };
    const client = createMockClient(DOMAIN_A, suspendedOrg);

    await expectAppErrorAsync(
      () =>
        resolveHostname('sydneysmart.driveflow.com.au', {
          platformDomain: PLATFORM_DOMAIN,
        }, client),
      'DOMAIN_006_ORGANIZATION_SUSPENDED'
    );
  });

  it('throws DOMAIN_006 when organization is deactivated', async () => {
    const deactivatedOrg = { ...ORG_A, status: 'deactivated' };
    const client = createMockClient(DOMAIN_A, deactivatedOrg);

    await expectAppErrorAsync(
      () =>
        resolveHostname('sydneysmart.driveflow.com.au', {
          platformDomain: PLATFORM_DOMAIN,
        }, client),
      'DOMAIN_006_ORGANIZATION_SUSPENDED'
    );
  });

  it('allows organization with trial status', async () => {
    const trialOrg = { ...ORG_A, status: 'trial' };
    const client = createMockClient(DOMAIN_A, trialOrg);

    const result = await resolveHostname('sydneysmart.driveflow.com.au', {
      platformDomain: PLATFORM_DOMAIN,
    }, client);

    expect(result.kind).toBe('tenant');
    if (result.kind === 'tenant') {
      expect(result.tenant.organizationStatus).toBe('trial');
    }
  });

  it('throws DOMAIN_001 when organization lookup fails', async () => {
    const client = createMockClient(DOMAIN_A, null, null, new Error('DB error'));

    await expectAppErrorAsync(
      () =>
        resolveHostname('sydneysmart.driveflow.com.au', {
          platformDomain: PLATFORM_DOMAIN,
        }, client),
      'DOMAIN_001_UNKNOWN_HOST'
    );
  });

  it('throws DOMAIN_001 when domain lookup has a database error', async () => {
    const client = createMockClient(null, null, new Error('Connection refused'));

    await expectAppErrorAsync(
      () =>
        resolveHostname('sydneysmart.driveflow.com.au', {
          platformDomain: PLATFORM_DOMAIN,
        }, client),
      'DOMAIN_001_UNKNOWN_HOST'
    );
  });

  it('normalizes hostname before database lookup', async () => {
    const client = createMockClient(DOMAIN_A, ORG_A);

    const result = await resolveHostname('  SydneySmart.DriveFlow.COM.AU:443  ', {
      platformDomain: PLATFORM_DOMAIN,
    }, client);

    expect(result.kind).toBe('tenant');
    if (result.kind === 'tenant') {
      expect(result.tenant.organizationId).toBe(ORG_A.id);
    }
  });
});
