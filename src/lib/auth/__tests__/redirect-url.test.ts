import { describe, it, expect } from 'vitest';
import { validateRedirectUrl } from '../redirect-url';

// ==================================================
// Redirect URL Validation Tests
// ==================================================
// Ensures callback/returnTo URLs are safe and
// cannot be exploited for open redirect attacks.

describe('validateRedirectUrl', () => {
  // -- Relative paths (always allowed) --

  it('allows simple relative path', () => {
    expect(validateRedirectUrl('/admin')).toBe('/admin');
  });

  it('allows nested relative path', () => {
    expect(validateRedirectUrl('/portal/bookings')).toBe('/portal/bookings');
  });

  it('allows root path', () => {
    expect(validateRedirectUrl('/')).toBe('/');
  });

  it('allows relative path with query params', () => {
    expect(validateRedirectUrl('/admin?tab=settings')).toBe('/admin?tab=settings');
  });

  // -- Null/undefined/empty --

  it('returns fallback for null', () => {
    expect(validateRedirectUrl(null)).toBe('/');
  });

  it('returns fallback for undefined', () => {
    expect(validateRedirectUrl(undefined)).toBe('/');
  });

  it('returns fallback for empty string', () => {
    expect(validateRedirectUrl('')).toBe('/');
  });

  it('returns custom fallback', () => {
    expect(validateRedirectUrl(null, '/dashboard')).toBe('/dashboard');
  });

  // -- Dangerous URLs (always blocked) --

  it('blocks javascript: URLs', () => {
    expect(validateRedirectUrl('javascript:alert(1)')).toBe('/');
  });

  it('blocks JavaScript: with mixed case', () => {
    expect(validateRedirectUrl('JavaScript:alert(1)')).toBe('/');
  });

  it('blocks data: URLs', () => {
    expect(validateRedirectUrl('data:text/html,<h1>XSS</h1>')).toBe('/');
  });

  it('blocks protocol-relative URLs', () => {
    expect(validateRedirectUrl('//evil.com/phishing')).toBe('/');
  });

  // -- External domains (blocked unless allowed) --

  it('blocks absolute URL to external domain', () => {
    expect(validateRedirectUrl('https://evil.com/steal')).toBe('/');
  });

  it('blocks http URL to external domain', () => {
    expect(validateRedirectUrl('http://attacker.org/login')).toBe('/');
  });

  it('blocks FTP URLs', () => {
    expect(validateRedirectUrl('ftp://server.com/file')).toBe('/');
  });

  // -- Platform domain (allowed) --

  it('allows platform root domain', () => {
    expect(
      validateRedirectUrl('https://driveflow.com.au/about')
    ).toBe('https://driveflow.com.au/about');
  });

  it('allows platform subdomain', () => {
    expect(
      validateRedirectUrl('https://sydneysmart.driveflow.com.au/admin')
    ).toBe('https://sydneysmart.driveflow.com.au/admin');
  });

  it('allows admin subdomain', () => {
    expect(
      validateRedirectUrl('https://admin.driveflow.com.au/dashboard')
    ).toBe('https://admin.driveflow.com.au/dashboard');
  });

  // -- Allowed hostnames --

  it('allows explicitly allowed hostname', () => {
    expect(
      validateRedirectUrl(
        'https://sydneysmartdriving.com.au/portal',
        '/',
        ['sydneysmartdriving.com.au']
      )
    ).toBe('https://sydneysmartdriving.com.au/portal');
  });

  it('blocks hostname not in allowed list', () => {
    expect(
      validateRedirectUrl(
        'https://evil.com/steal',
        '/',
        ['sydneysmartdriving.com.au']
      )
    ).toBe('/');
  });

  // -- Edge cases --

  it('handles invalid URL gracefully', () => {
    expect(validateRedirectUrl('not://valid::url')).toBe('/');
  });

  it('trims whitespace', () => {
    expect(validateRedirectUrl('  /admin  ')).toBe('/admin');
  });
});
