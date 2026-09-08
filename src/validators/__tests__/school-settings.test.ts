import { describe, it, expect } from 'vitest';
import { updateSchoolSettingsSchema } from '../school-settings';

describe('updateSchoolSettingsSchema', () => {
  it('accepts empty update (all optional)', () => {
    const result = updateSchoolSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid branding update', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      primary_color: '#ff5500',
      secondary_color: '#003366',
      hero_title: 'Learn to Drive with Confidence',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid hex color', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      primary_color: 'red',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid 3-character hex color', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      primary_color: '#f00',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid booking rules', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      min_booking_notice_hours: 48,
      max_advance_booking_days: 60,
      cancellation_notice_hours: 12,
      allow_online_booking: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects booking notice hours above 168', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      min_booking_notice_hours: 200,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid sections_enabled', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      sections_enabled: ['hero', 'packages', 'contact'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid contact email', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      contact_email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid social links', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      social_facebook: 'https://facebook.com/sydneysmart',
      social_instagram: 'https://instagram.com/sydneysmart',
    });
    expect(result.success).toBe(true);
  });

  it('rejects meta_title over 70 characters', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      meta_title: 'A'.repeat(71),
    });
    expect(result.success).toBe(false);
  });

  it('rejects meta_description over 160 characters', () => {
    const result = updateSchoolSettingsSchema.safeParse({
      meta_description: 'A'.repeat(161),
    });
    expect(result.success).toBe(false);
  });
});
