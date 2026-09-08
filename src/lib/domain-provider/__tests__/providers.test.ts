import { describe, it, expect, beforeEach } from 'vitest';
import { MockDomainProvider } from '../mock-provider';

// ==================================================
// Domain Provider Tests
// ==================================================
// Tests the MockDomainProvider used in development/testing.

describe('MockDomainProvider', () => {
  let provider: MockDomainProvider;

  beforeEach(() => {
    provider = new MockDomainProvider();
  });

  describe('addDomain', () => {
    it('returns success with an external ID', async () => {
      const result = await provider.addDomain('school.example.com');
      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
      expect(result.externalId).toContain('mock-school.example.com');
    });

    it('registers the domain in internal state', async () => {
      await provider.addDomain('school.example.com');
      const status = await provider.getDomainStatus('school.example.com');
      expect(status.configured).toBe(false);
      expect(status.sslActive).toBe(false);
    });
  });

  describe('removeDomain', () => {
    it('removes a registered domain', async () => {
      await provider.addDomain('school.example.com');
      const result = await provider.removeDomain('school.example.com');
      expect(result.success).toBe(true);

      const status = await provider.getDomainStatus('school.example.com');
      expect(status.error).toBe('Not registered');
    });

    it('succeeds even if domain was not registered', async () => {
      const result = await provider.removeDomain('nonexistent.example.com');
      expect(result.success).toBe(true);
    });
  });

  describe('checkDomain', () => {
    it('returns not verified for unconfigured domain', async () => {
      await provider.addDomain('school.example.com');
      const result = await provider.checkDomain('school.example.com');
      expect(result.verified).toBe(false);
      expect(result.dnsConfigured).toBe(false);
    });

    it('returns verified after DNS is configured', async () => {
      await provider.addDomain('school.example.com');
      provider.simulateDnsConfigured('school.example.com');
      const result = await provider.checkDomain('school.example.com');
      expect(result.verified).toBe(true);
      expect(result.dnsConfigured).toBe(true);
    });

    it('returns not verified for unregistered domain', async () => {
      const result = await provider.checkDomain('unknown.example.com');
      expect(result.verified).toBe(false);
    });
  });

  describe('verifyDomain', () => {
    it('auto-verifies a registered domain', async () => {
      await provider.addDomain('school.example.com');
      const result = await provider.verifyDomain('school.example.com');
      expect(result.verified).toBe(true);
      expect(result.dnsConfigured).toBe(true);
      expect(result.sslActive).toBe(true);
    });

    it('fails verification for unregistered domain', async () => {
      const result = await provider.verifyDomain('unknown.example.com');
      expect(result.verified).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('getDnsInstructions', () => {
    it('returns CNAME instructions', async () => {
      const instructions = await provider.getDnsInstructions('school.example.com');
      expect(instructions).toHaveLength(1);
      expect(instructions[0].type).toBe('CNAME');
      expect(instructions[0].value).toBe('cname.vercel-dns.com');
    });
  });

  describe('getDomainStatus', () => {
    it('returns status for registered domain', async () => {
      await provider.addDomain('school.example.com');
      const status = await provider.getDomainStatus('school.example.com');
      expect(status.configured).toBe(false);
      expect(status.sslActive).toBe(false);
      expect(status.error).toBeUndefined();
    });

    it('returns error for unregistered domain', async () => {
      const status = await provider.getDomainStatus('unknown.example.com');
      expect(status.configured).toBe(false);
      expect(status.error).toBe('Not registered');
    });
  });

  describe('test helpers', () => {
    it('simulateDnsConfigured marks domain as configured', async () => {
      await provider.addDomain('school.example.com');
      provider.simulateDnsConfigured('school.example.com');
      const status = await provider.getDomainStatus('school.example.com');
      expect(status.configured).toBe(true);
    });

    it('simulateSslActive marks domain SSL as active', async () => {
      await provider.addDomain('school.example.com');
      provider.simulateSslActive('school.example.com');
      const status = await provider.getDomainStatus('school.example.com');
      expect(status.sslActive).toBe(true);
    });

    it('reset clears all domain state', async () => {
      await provider.addDomain('a.example.com');
      await provider.addDomain('b.example.com');
      provider.reset();

      const statusA = await provider.getDomainStatus('a.example.com');
      const statusB = await provider.getDomainStatus('b.example.com');
      expect(statusA.error).toBe('Not registered');
      expect(statusB.error).toBe('Not registered');
    });
  });
});
