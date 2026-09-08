// ==================================================
// Hostname Normalization
// ==================================================
// Centralized, safe hostname normalization.
// All hostname comparisons in the application MUST
// go through this module. Never compare raw Host
// header strings directly.

/**
 * Normalize a hostname for consistent comparison and lookup.
 *
 * Handles:
 * - lowercase conversion
 * - www prefix removal
 * - port removal (for local development)
 * - whitespace trimming
 *
 * @param rawHostname - The raw Host header or hostname string
 * @returns Normalized hostname suitable for database lookup
 */
export function normalizeHostname(rawHostname: string): string {
  let hostname = rawHostname.trim().toLowerCase();

  // Remove port (e.g., localhost:3000 → localhost)
  const colonIndex = hostname.indexOf(':');
  if (colonIndex !== -1) {
    hostname = hostname.substring(0, colonIndex);
  }

  // Remove www prefix
  if (hostname.startsWith('www.')) {
    hostname = hostname.substring(4);
  }

  return hostname;
}

/**
 * Determine the type of hostname being accessed.
 */
export type HostnameType =
  | 'platform_admin'
  | 'platform_website'
  | 'preview'
  | 'localhost'
  | 'tenant';

export interface HostnameClassification {
  type: HostnameType;
  normalized: string;
  /** For tenant subdomains, the subdomain part */
  subdomain?: string;
}

/**
 * Classify a hostname into its type.
 *
 * @param rawHostname - The raw Host header value
 * @param platformDomain - The platform's root domain (e.g., "driveflow.com.au")
 * @param adminSubdomain - The admin subdomain (default: "admin")
 */
export function classifyHostname(
  rawHostname: string,
  platformDomain: string,
  adminSubdomain: string = 'admin'
): HostnameClassification {
  const normalized = normalizeHostname(rawHostname);
  const normalizedPlatform = normalizeHostname(platformDomain);

  // Localhost (development)
  if (normalized === 'localhost' || normalized === '127.0.0.1') {
    return { type: 'localhost', normalized };
  }

  // Vercel preview deployments
  if (normalized.endsWith('.vercel.app')) {
    return { type: 'preview', normalized };
  }

  // Platform admin domain (e.g., admin.driveflow.com.au)
  if (normalized === `${adminSubdomain}.${normalizedPlatform}`) {
    return { type: 'platform_admin', normalized };
  }

  // Platform root domain (e.g., driveflow.com.au)
  if (normalized === normalizedPlatform) {
    return { type: 'platform_website', normalized };
  }

  // Platform subdomain (e.g., schoolname.driveflow.com.au)
  if (normalized.endsWith(`.${normalizedPlatform}`)) {
    const subdomain = normalized.replace(`.${normalizedPlatform}`, '');
    return { type: 'tenant', normalized, subdomain };
  }

  // Custom domain — treat as tenant
  return { type: 'tenant', normalized };
}
