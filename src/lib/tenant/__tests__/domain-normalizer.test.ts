import { describe, it, expect } from 'vitest';
import {
  normalizeHostname,
  classifyHostname,
} from '../domain-normalizer';

describe('normalizeHostname', () => {
  it('converts to lowercase', () => {
    expect(normalizeHostname('EXAMPLE.COM')).toBe('example.com');
    expect(normalizeHostname('DriveFlow.COM.AU')).toBe('driveflow.com.au');
  });

  it('preserves www prefix (www and non-www are separate domains)', () => {
    expect(normalizeHostname('www.example.com')).toBe('www.example.com');
    expect(normalizeHostname('WWW.EXAMPLE.COM')).toBe('www.example.com');
  });

  it('removes port numbers', () => {
    expect(normalizeHostname('localhost:3000')).toBe('localhost');
    expect(normalizeHostname('example.com:8080')).toBe('example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeHostname('  example.com  ')).toBe('example.com');
  });

  it('handles combined normalization', () => {
    expect(normalizeHostname('  WWW.Example.COM:3000  ')).toBe('www.example.com');
  });
});

describe('classifyHostname', () => {
  const platformDomain = 'driveflow.com.au';
  const adminSubdomain = 'admin';

  it('classifies localhost', () => {
    const result = classifyHostname('localhost:3000', platformDomain, adminSubdomain);
    expect(result.type).toBe('localhost');
    expect(result.normalized).toBe('localhost');
  });

  it('classifies 127.0.0.1', () => {
    const result = classifyHostname('127.0.0.1:3000', platformDomain, adminSubdomain);
    expect(result.type).toBe('localhost');
  });

  it('classifies platform admin domain', () => {
    const result = classifyHostname('admin.driveflow.com.au', platformDomain, adminSubdomain);
    expect(result.type).toBe('platform_admin');
    expect(result.normalized).toBe('admin.driveflow.com.au');
  });

  it('classifies platform root domain', () => {
    const result = classifyHostname('driveflow.com.au', platformDomain, adminSubdomain);
    expect(result.type).toBe('platform_website');
    expect(result.normalized).toBe('driveflow.com.au');
  });

  it('classifies www.platform as tenant (www is a separate domain)', () => {
    const result = classifyHostname('www.driveflow.com.au', platformDomain, adminSubdomain);
    // www.driveflow.com.au is NOT the same as driveflow.com.au
    // It ends with .driveflow.com.au so it's classified as a tenant subdomain
    expect(result.type).toBe('tenant');
    expect(result.normalized).toBe('www.driveflow.com.au');
    expect(result.subdomain).toBe('www');
  });

  it('classifies Vercel preview deployments', () => {
    const result = classifyHostname('my-app-abc123.vercel.app', platformDomain, adminSubdomain);
    expect(result.type).toBe('preview');
  });

  it('classifies tenant subdomain and extracts subdomain part', () => {
    const result = classifyHostname('sydneysmart.driveflow.com.au', platformDomain, adminSubdomain);
    expect(result.type).toBe('tenant');
    expect(result.normalized).toBe('sydneysmart.driveflow.com.au');
    expect(result.subdomain).toBe('sydneysmart');
  });

  it('classifies custom domain as tenant', () => {
    const result = classifyHostname('sydneysmartdriving.com.au', platformDomain, adminSubdomain);
    expect(result.type).toBe('tenant');
    expect(result.normalized).toBe('sydneysmartdriving.com.au');
    expect(result.subdomain).toBeUndefined();
  });

  it('classifies custom subdomain as tenant', () => {
    const result = classifyHostname('booking.schoolname.com.au', platformDomain, adminSubdomain);
    expect(result.type).toBe('tenant');
    expect(result.normalized).toBe('booking.schoolname.com.au');
  });

  it('is case-insensitive', () => {
    const result = classifyHostname('ADMIN.DRIVEFLOW.COM.AU', platformDomain, adminSubdomain);
    expect(result.type).toBe('platform_admin');
  });

  it('handles port in hostname', () => {
    const result = classifyHostname('admin.driveflow.com.au:443', platformDomain, adminSubdomain);
    expect(result.type).toBe('platform_admin');
  });
});
