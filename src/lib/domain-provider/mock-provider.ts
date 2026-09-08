// ==================================================
// Mock Domain Provider
// ==================================================
// Used in development and testing.
// Simulates domain registration, verification, and DNS.

import type {
  DomainProvider,
  DomainProviderResult,
  DomainVerificationResult,
  DnsInstruction,
} from './types';

/**
 * MockDomainProvider — all operations succeed immediately.
 * Use for testing and local development.
 */
export class MockDomainProvider implements DomainProvider {
  private domains = new Map<
    string,
    { configured: boolean; sslActive: boolean; externalId: string }
  >();

  async addDomain(hostname: string): Promise<DomainProviderResult> {
    const externalId = `mock-${hostname}-${Date.now()}`;
    this.domains.set(hostname, {
      configured: false,
      sslActive: false,
      externalId,
    });
    return { success: true, externalId };
  }

  async removeDomain(hostname: string): Promise<DomainProviderResult> {
    this.domains.delete(hostname);
    return { success: true };
  }

  async checkDomain(hostname: string): Promise<DomainVerificationResult> {
    const domain = this.domains.get(hostname);
    if (!domain) {
      return { verified: false, dnsConfigured: false, sslActive: false };
    }
    return {
      verified: domain.configured,
      dnsConfigured: domain.configured,
      sslActive: domain.sslActive,
    };
  }

  async verifyDomain(hostname: string): Promise<DomainVerificationResult> {
    const domain = this.domains.get(hostname);
    if (!domain) {
      return {
        verified: false,
        dnsConfigured: false,
        sslActive: false,
        errors: ['Domain not registered with provider'],
      };
    }
    // Mock: auto-verify
    domain.configured = true;
    domain.sslActive = true;
    return { verified: true, dnsConfigured: true, sslActive: true };
  }

  async getDnsInstructions(hostname: string): Promise<DnsInstruction[]> {
    return [
      {
        type: 'CNAME',
        name: hostname,
        value: 'cname.vercel-dns.com',
        ttl: 3600,
      },
    ];
  }

  async getDomainStatus(
    hostname: string
  ): Promise<{ configured: boolean; sslActive: boolean; error?: string }> {
    const domain = this.domains.get(hostname);
    if (!domain) {
      return { configured: false, sslActive: false, error: 'Not registered' };
    }
    return { configured: domain.configured, sslActive: domain.sslActive };
  }

  // --- Test helpers ---

  /** Simulate DNS configuration completing */
  simulateDnsConfigured(hostname: string): void {
    const domain = this.domains.get(hostname);
    if (domain) {
      domain.configured = true;
    }
  }

  /** Simulate SSL provisioning completing */
  simulateSslActive(hostname: string): void {
    const domain = this.domains.get(hostname);
    if (domain) {
      domain.sslActive = true;
    }
  }

  /** Reset all state */
  reset(): void {
    this.domains.clear();
  }
}
