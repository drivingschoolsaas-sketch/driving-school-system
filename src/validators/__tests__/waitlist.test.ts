// ==================================================
// Waitlist & Custom Theme Validator Tests
// ==================================================

import { describe, it, expect } from 'vitest';
import {
  createWaitlistEntrySchema,
  updateCustomThemeSchema,
} from '../waitlist';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('createWaitlistEntrySchema', () => {
  it('accepts minimal valid input', () => {
    const result = createWaitlistEntrySchema.parse({
      student_id: VALID_UUID,
    });
    expect(result.student_id).toBe(VALID_UUID);
    expect(result.preferred_days).toEqual([]);
  });

  it('accepts full input', () => {
    const result = createWaitlistEntrySchema.parse({
      student_id: VALID_UUID,
      preferred_days: ['monday', 'wednesday'],
      preferred_time_start: '09:00',
      preferred_time_end: '12:00',
      preferred_instructor_id: VALID_UUID,
      lesson_type_id: VALID_UUID,
      service_area_id: VALID_UUID,
      notes: 'Morning only please',
    });
    expect(result.preferred_days).toEqual(['monday', 'wednesday']);
    expect(result.preferred_time_start).toBe('09:00');
    expect(result.notes).toBe('Morning only please');
  });

  it('rejects missing student_id', () => {
    expect(() => createWaitlistEntrySchema.parse({})).toThrow();
  });

  it('rejects invalid student_id', () => {
    expect(() =>
      createWaitlistEntrySchema.parse({ student_id: 'not-uuid' })
    ).toThrow();
  });

  it('rejects invalid day names', () => {
    expect(() =>
      createWaitlistEntrySchema.parse({
        student_id: VALID_UUID,
        preferred_days: ['funday'],
      })
    ).toThrow();
  });

  it('rejects invalid time format', () => {
    expect(() =>
      createWaitlistEntrySchema.parse({
        student_id: VALID_UUID,
        preferred_time_start: '9am',
        preferred_time_end: '12pm',
      })
    ).toThrow();
  });

  it('rejects start time without end time', () => {
    expect(() =>
      createWaitlistEntrySchema.parse({
        student_id: VALID_UUID,
        preferred_time_start: '09:00',
      })
    ).toThrow();
  });

  it('rejects end time without start time', () => {
    expect(() =>
      createWaitlistEntrySchema.parse({
        student_id: VALID_UUID,
        preferred_time_end: '12:00',
      })
    ).toThrow();
  });

  it('rejects notes over 500 characters', () => {
    expect(() =>
      createWaitlistEntrySchema.parse({
        student_id: VALID_UUID,
        notes: 'x'.repeat(501),
      })
    ).toThrow();
  });
});

describe('updateCustomThemeSchema', () => {
  it('accepts valid hex colors', () => {
    const result = updateCustomThemeSchema.parse({
      primary_color: '#ff5500',
      secondary_color: '#0055ff',
    });
    expect(result.primary_color).toBe('#ff5500');
  });

  it('accepts all style options', () => {
    const result = updateCustomThemeSchema.parse({
      header_style: 'centered',
      footer_style: 'compact',
      hero_style: 'gradient',
      corner_radius: 'large',
    });
    expect(result.header_style).toBe('centered');
    expect(result.corner_radius).toBe('large');
  });

  it('accepts nullable color fields', () => {
    const result = updateCustomThemeSchema.parse({
      accent_color: null,
      background_color: null,
    });
    expect(result.accent_color).toBeNull();
  });

  it('accepts font names', () => {
    const result = updateCustomThemeSchema.parse({
      heading_font: 'Inter',
      body_font: 'Open Sans',
    });
    expect(result.heading_font).toBe('Inter');
  });

  it('rejects invalid hex color', () => {
    expect(() =>
      updateCustomThemeSchema.parse({ primary_color: 'red' })
    ).toThrow();
  });

  it('rejects invalid hex color format', () => {
    expect(() =>
      updateCustomThemeSchema.parse({ primary_color: '#fff' })
    ).toThrow();
  });

  it('rejects invalid header_style', () => {
    expect(() =>
      updateCustomThemeSchema.parse({ header_style: 'fancy' })
    ).toThrow();
  });

  it('rejects invalid corner_radius', () => {
    expect(() =>
      updateCustomThemeSchema.parse({ corner_radius: 'huge' })
    ).toThrow();
  });

  it('rejects custom_css over 10KB', () => {
    expect(() =>
      updateCustomThemeSchema.parse({ custom_css: 'x'.repeat(10241) })
    ).toThrow();
  });

  it('accepts custom_css within limit', () => {
    const result = updateCustomThemeSchema.parse({
      custom_css: '.hero { background: linear-gradient(#000, #333); }',
    });
    expect(result.custom_css).toContain('.hero');
  });

  it('accepts empty object (no changes)', () => {
    const result = updateCustomThemeSchema.parse({});
    expect(result).toEqual({});
  });
});
