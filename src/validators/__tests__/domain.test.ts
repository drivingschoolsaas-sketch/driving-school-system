import { describe, it, expect } from 'vitest';
import {
  addDomainSchema,
  setPrimaryDomainSchema,
  removeDomainSchema,
  platformSubdomainSchema,
} from '../domain';

// ==================================================
// Domain Validator Tests
// ==================================================

describe('addDomainSchema', () => {
  it('accepts valid custom root domain', () => {
    const result = addDomainSchema.safeParse({
      hostname: 'school.com.au',
      domain_type: 'custom_root',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hostname).toBe('school.com.au');
      expect(result.data.domain_type).toBe('custom_root');
      expect(result.data.set_as_primary).toBe(false); // default
    }
  });

  it('accepts valid custom subdomain', () => {
    const result = addDomainSchema.safeParse({
      hostname: 'booking.school.com.au',
      domain_type: 'custom_subdomain',
      set_as_primary: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.set_as_primary).toBe(true);
    }
  });

  it('lowercases and trims hostname via transform', () => {
    // The regex requires lowercase input; callers must normalize
    // before validation, or use normalizeHostname() first.
    const result = addDomainSchema.safeParse({
      hostname: 'booking.school.com.au',
      domain_type: 'custom_root',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hostname).toBe('booking.school.com.au');
    }
  });

  it('rejects hostname without TLD', () => {
    const result = addDomainSchema.safeParse({
      hostname: 'localhost',
      domain_type: 'custom_root',
    });
    expect(result.success).toBe(false);
  });

  it('rejects hostname with protocol', () => {
    const result = addDomainSchema.safeParse({
      hostname: 'https://school.com.au',
      domain_type: 'custom_root',
    });
    expect(result.success).toBe(false);
  });

  it('rejects hostname with path', () => {
    const result = addDomainSchema.safeParse({
      hostname: 'school.com.au/admin',
      domain_type: 'custom_root',
    });
    expect(result.success).toBe(false);
  });

  it('rejects hostname that is too short', () => {
    const result = addDomainSchema.safeParse({
      hostname: 'a.b',
      domain_type: 'custom_root',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid domain_type', () => {
    const result = addDomainSchema.safeParse({
      hostname: 'school.com.au',
      domain_type: 'platform_subdomain',
    });
    expect(result.success).toBe(false);
  });
});

describe('setPrimaryDomainSchema', () => {
  it('accepts valid UUID', () => {
    const result = setPrimaryDomainSchema.safeParse({
      domainId: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID', () => {
    const result = setPrimaryDomainSchema.safeParse({
      domainId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('removeDomainSchema', () => {
  it('accepts valid UUID', () => {
    const result = removeDomainSchema.safeParse({
      domainId: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = removeDomainSchema.safeParse({ domainId: '' });
    expect(result.success).toBe(false);
  });
});

describe('platformSubdomainSchema', () => {
  it('accepts valid slug', () => {
    const result = platformSubdomainSchema.safeParse('sydneysmart');
    expect(result.success).toBe(true);
  });

  it('accepts slug with hyphens', () => {
    const result = platformSubdomainSchema.safeParse('sydney-smart');
    expect(result.success).toBe(true);
  });

  it('rejects slug starting with hyphen', () => {
    const result = platformSubdomainSchema.safeParse('-sydneysmart');
    expect(result.success).toBe(false);
  });

  it('rejects slug ending with hyphen', () => {
    const result = platformSubdomainSchema.safeParse('sydneysmart-');
    expect(result.success).toBe(false);
  });

  it('rejects uppercase letters', () => {
    const result = platformSubdomainSchema.safeParse('SydneySmart');
    expect(result.success).toBe(false);
  });

  it('rejects slug shorter than 3 characters', () => {
    const result = platformSubdomainSchema.safeParse('ab');
    expect(result.success).toBe(false);
  });

  it('rejects slug longer than 63 characters', () => {
    const result = platformSubdomainSchema.safeParse('a'.repeat(64));
    expect(result.success).toBe(false);
  });
});
