import { describe, it, expect } from 'vitest';
import { createOrganizationSchema, updateOrganizationSchema } from '../organization';

describe('createOrganizationSchema', () => {
  it('validates a correct input', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Sydney Smart Driving',
      slug: 'sydneysmart',
      timezone: 'Australia/Sydney',
      currency: 'AUD',
      country: 'AU',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a slug that is too short', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Test',
      slug: 'ab',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a slug with uppercase', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Test',
      slug: 'MySchool',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a slug starting with a hyphen', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Test',
      slug: '-invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a slug ending with a hyphen', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Test',
      slug: 'invalid-',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a slug with hyphens in the middle', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Test',
      slug: 'my-driving-school',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a name that is too short', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'A',
      slug: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('applies defaults for timezone, currency, country', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Test School',
      slug: 'test-school',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe('Australia/Sydney');
      expect(result.data.currency).toBe('AUD');
      expect(result.data.country).toBe('AU');
    }
  });
});

describe('updateOrganizationSchema', () => {
  it('allows partial updates', () => {
    const result = updateOrganizationSchema.safeParse({
      name: 'New Name',
    });
    expect(result.success).toBe(true);
  });

  it('allows empty input (no changes)', () => {
    const result = updateOrganizationSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
