// ==================================================
// Notification Validator Tests
// ==================================================

import { describe, it, expect } from 'vitest';
import {
  upsertNotificationTemplateSchema,
  sendNotificationSchema,
  updateNotificationPreferenceSchema,
} from '../notification';

describe('upsertNotificationTemplateSchema', () => {
  it('accepts a valid email template', () => {
    const result = upsertNotificationTemplateSchema.safeParse({
      notification_type: 'booking_confirmed',
      body: 'Your booking is confirmed, {{student_name}}!',
      subject: 'Booking Confirmed',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an SMS template (no subject)', () => {
    const result = upsertNotificationTemplateSchema.safeParse({
      notification_type: 'booking_reminder',
      channel: 'sms',
      body: 'Reminder: Lesson tomorrow at {{start_time}}',
    });
    expect(result.success).toBe(true);
  });

  it('defaults channel to email', () => {
    const result = upsertNotificationTemplateSchema.safeParse({
      notification_type: 'welcome',
      body: 'Welcome!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channel).toBe('email');
    }
  });

  it('rejects empty body', () => {
    const result = upsertNotificationTemplateSchema.safeParse({
      notification_type: 'welcome',
      body: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid notification type', () => {
    const result = upsertNotificationTemplateSchema.safeParse({
      notification_type: 'invalid_type',
      body: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid notification types', () => {
    const types = [
      'booking_confirmed', 'booking_reminder', 'booking_changed',
      'booking_cancelled', 'payment_receipt', 'payment_failed',
      'instructor_reassigned', 'review_request', 'test_congratulations',
      'welcome', 'custom',
    ];
    for (const type of types) {
      const result = upsertNotificationTemplateSchema.safeParse({
        notification_type: type,
        body: 'Template body',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid channel', () => {
    const result = upsertNotificationTemplateSchema.safeParse({
      notification_type: 'welcome',
      channel: 'push',
      body: 'Hello',
    });
    expect(result.success).toBe(false);
  });
});

describe('sendNotificationSchema', () => {
  it('accepts a valid email notification', () => {
    const result = sendNotificationSchema.safeParse({
      notification_type: 'custom',
      channel: 'email',
      recipient_email: 'student@example.com',
      body: 'Hello from the school!',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid SMS notification', () => {
    const result = sendNotificationSchema.safeParse({
      notification_type: 'booking_reminder',
      channel: 'sms',
      recipient_phone: '+61412345678',
      body: 'Lesson tomorrow at 10am',
    });
    expect(result.success).toBe(true);
  });

  it('rejects email channel without email address', () => {
    const result = sendNotificationSchema.safeParse({
      notification_type: 'custom',
      channel: 'email',
      body: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects SMS channel without phone number', () => {
    const result = sendNotificationSchema.safeParse({
      notification_type: 'custom',
      channel: 'sms',
      body: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty body', () => {
    const result = sendNotificationSchema.safeParse({
      notification_type: 'custom',
      channel: 'email',
      recipient_email: 'test@example.com',
      body: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateNotificationPreferenceSchema', () => {
  it('accepts enabling a notification type', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'booking_confirmed',
      is_enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts disabling a notification type', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'review_request',
      channel: 'email',
      is_enabled: false,
    });
    expect(result.success).toBe(true);
  });

  it('defaults channel to email', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'booking_reminder',
      is_enabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channel).toBe('email');
    }
  });

  it('rejects missing is_enabled', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'welcome',
    });
    expect(result.success).toBe(false);
  });
});
