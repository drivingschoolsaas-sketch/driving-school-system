// ==================================================
// Vercel Domain Provider
// ==================================================
// Production implementation using Vercel's Domain API.
// Requires VERCEL_API_TOKEN, VERCEL_PROJECT_ID, and
// optionally VERCEL_TEAM_ID environment variables.

import type {
  DomainProvider,
  DomainProviderResult,
  DomainVerificationResult,
  DnsInstruction,
} from './types';
import { logger } from '@/lib/logging';

interface VercelProviderConfig {
  apiToken: string;
  projectId: string;
  teamId?: string;
}

/**
 * VercelDomainProvider — manages custom domains via Vercel API.
 *
 * API Reference: https://vercel.com/docs/rest-api/endpoints/projects/domains
 */
export class VercelDomainProvider implements DomainProvider {
  private readonly baseUrl = 'https://api.vercel.com';
  private readonly config: VercelProviderConfig;

  constructor(config: VercelProviderConfig) {
    this.config = config;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private get teamQuery(): string {
    return this.config.teamId ? `?teamId=${this.config.teamId}` : '';
  }

  async addDomain(hostname: string): Promise<DomainProviderResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.config.projectId}/domains${this.teamQuery}`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ name: hostname }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        logger.error('Vercel addDomain failed', undefined, {
          feature: 'domain-provider',
          operation: 'add_domain',
          hostname,
          statusCode: String(response.status),
          vercelError: data.error?.message,
        });
        return { success: false, error: data.error?.message ?? 'Unknown error' };
      }

      return { success: true, externalId: data.name };
    } catch (error) {
      logger.error('Vercel addDomain exception', error, {
        feature: 'domain-provider',
        operation: 'add_domain',
        hostname,
      });
      return { success: false, error: 'Failed to connect to Vercel API' };
    }
  }

  async removeDomain(hostname: string): Promise<DomainProviderResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v9/projects/${this.config.projectId}/domains/${hostname}${this.teamQuery}`,
        {
          method: 'DELETE',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error?.message ?? 'Unknown error' };
      }

      return { success: true };
    } catch (error) {
      logger.error('Vercel removeDomain exception', error, {
        feature: 'domain-provider',
        operation: 'remove_domain',
        hostname,
      });
      return { success: false, error: 'Failed to connect to Vercel API' };
    }
  }

  async checkDomain(hostname: string): Promise<DomainVerificationResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v6/domains/${hostname}/config${this.teamQuery}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        return {
          verified: false,
          dnsConfigured: false,
          sslActive: false,
          errors: ['Failed to check domain configuration'],
        };
      }

      const data = await response.json();
      return {
        verified: data.misconfigured === false,
        dnsConfigured: data.misconfigured === false,
        sslActive: data.misconfigured === false, // Vercel auto-provisions SSL
      };
    } catch (error) {
      logger.error('Vercel checkDomain exception', error, {
        feature: 'domain-provider',
        operation: 'check_domain',
        hostname,
      });
      return {
        verified: false,
        dnsConfigured: false,
        sslActive: false,
        errors: ['Failed to connect to Vercel API'],
      };
    }
  }

  async verifyDomain(hostname: string): Promise<DomainVerificationResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v9/projects/${this.config.projectId}/domains/${hostname}/verify${this.teamQuery}`,
        {
          method: 'POST',
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          verified: false,
          dnsConfigured: false,
          sslActive: false,
          errors: [data.error?.message ?? 'Verification failed'],
        };
      }

      return {
        verified: data.verified === true,
        dnsConfigured: data.verified === true,
        sslActive: data.verified === true,
      };
    } catch (error) {
      logger.error('Vercel verifyDomain exception', error, {
        feature: 'domain-provider',
        operation: 'verify_domain',
        hostname,
      });
      return {
        verified: false,
        dnsConfigured: false,
        sslActive: false,
        errors: ['Failed to connect to Vercel API'],
      };
    }
  }

  async getDnsInstructions(hostname: string): Promise<DnsInstruction[]> {
    // Vercel standard DNS instructions
    // Root domains need A records, subdomains need CNAME
    const isRootDomain = hostname.split('.').length <= 2 ||
      hostname.endsWith('.com.au') && hostname.split('.').length <= 3;

    if (isRootDomain) {
      return [
        { type: 'A', name: '@', value: '76.76.21.21', ttl: 3600 },
      ];
    }

    return [
      { type: 'CNAME', name: hostname.split('.')[0], value: 'cname.vercel-dns.com', ttl: 3600 },
    ];
  }

  async getDomainStatus(
    hostname: string
  ): Promise<{ configured: boolean; sslActive: boolean; error?: string }> {
    const result = await this.checkDomain(hostname);
    return {
      configured: result.dnsConfigured,
      sslActive: result.sslActive,
      error: result.errors?.[0],
    };
  }
}
