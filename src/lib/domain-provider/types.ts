// ==================================================
// Domain Provider Interface
// ==================================================
// Abstraction for domain management providers.
// The application interacts with this interface,
// not directly with Vercel or any specific provider.

export interface DnsInstruction {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
}

export interface DomainVerificationResult {
  verified: boolean;
  dnsConfigured: boolean;
  sslActive: boolean;
  errors?: string[];
}

export interface DomainProviderResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

/**
 * Provider-agnostic domain management interface.
 * Implementations: VercelDomainProvider (production), MockDomainProvider (testing)
 */
export interface DomainProvider {
  /** Register a domain with the hosting provider */
  addDomain(hostname: string): Promise<DomainProviderResult>;

  /** Remove a domain from the hosting provider */
  removeDomain(hostname: string): Promise<DomainProviderResult>;

  /** Check domain configuration status */
  checkDomain(hostname: string): Promise<DomainVerificationResult>;

  /** Verify domain ownership */
  verifyDomain(hostname: string): Promise<DomainVerificationResult>;

  /** Get DNS configuration instructions for the school owner */
  getDnsInstructions(hostname: string): Promise<DnsInstruction[]>;

  /** Get the current status of a domain */
  getDomainStatus(
    hostname: string
  ): Promise<{ configured: boolean; sslActive: boolean; error?: string }>;
}
