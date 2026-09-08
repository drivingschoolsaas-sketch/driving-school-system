// ==================================================
// Safe Redirect URL Validation
// ==================================================
// Validates redirect/callback URLs to prevent open
// redirects. Only allows URLs on verified domains.
//
// CRITICAL: Never blindly trust returnTo, redirect,
// or callback URL parameters from the browser.

import { normalizeHostname } from '@/lib/tenant/domain-normalizer';

const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'driveflow.com.au';

/**
 * Validate that a redirect URL is safe.
 *
 * Allowed:
 * - Relative paths (e.g., /admin, /portal/bookings)
 * - URLs on the platform domain or its subdomains
 * - URLs on verified custom domains (requires domainChecker)
 *
 * Blocked:
 * - Absolute URLs to external domains
 * - Protocol-relative URLs (//evil.com)
 * - JavaScript URLs
 * - Data URLs
 *
 * @param url - The URL to validate
 * @param allowedHostnames - Additional allowed hostnames (e.g., verified custom domains)
 * @returns The safe URL, or the fallback if unsafe
 */
export function validateRedirectUrl(
  url: string | null | undefined,
  fallback: string = '/',
  allowedHostnames: string[] = []
): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();

  // Block empty
  if (!trimmed) {
    return fallback;
  }

  // Block javascript: and data: URIs
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    return fallback;
  }

  // Block protocol-relative URLs (//evil.com/path)
  if (trimmed.startsWith('//')) {
    return fallback;
  }

  // Allow relative paths
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // For absolute URLs, validate the hostname
  try {
    const parsed = new URL(trimmed);

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallback;
    }

    const normalizedHost = normalizeHostname(parsed.hostname);
    const normalizedPlatform = normalizeHostname(PLATFORM_DOMAIN);

    // Allow the platform domain and all its subdomains
    if (
      normalizedHost === normalizedPlatform ||
      normalizedHost.endsWith(`.${normalizedPlatform}`)
    ) {
      return trimmed;
    }

    // Allow explicitly listed hostnames
    const normalizedAllowed = allowedHostnames.map(normalizeHostname);
    if (normalizedAllowed.includes(normalizedHost)) {
      return trimmed;
    }

    // Not an allowed domain
    return fallback;
  } catch {
    // Invalid URL
    return fallback;
  }
}
