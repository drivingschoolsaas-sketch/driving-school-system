// ==================================================
// Notification Validators
// ==================================================

import { z } from 'zod';

const notificationTypes = [
  'booking_confirmed',
  'booking_reminder',
  'booking_changed',
  'booking_cancelled',
  'payment_receipt',
  'payment_failed',
  'instructor_reassigned',
  'review_request',
  'test_congratulations',
  'welcome',
  'custom',
] as const;

const channels = ['email', 'sms'] as const;

/**
 * Schema for creating/updating a notification template.
 */
export const upsertNotificationTemplateSchema = z.object({
  notification_type: z.enum(notificationTypes),
  channel: z.enum(channels).default('email'),
  subject: z.string().max(500).optional(),
  body: z.string().min(1, 'Template body is required').max(10000),
  is_active: z.boolean().default(true),
});

export type UpsertNotificationTemplateInput = z.infer<
  typeof upsertNotificationTemplateSchema
>;

/**
 * Schema for sending a notification (admin-triggered).
 */
export const sendNotificationSchema = z.object({
  notification_type: z.enum(notificationTypes),
  channel: z.enum(channels).default('email'),
  recipient_email: z.string().email().optional(),
  recipient_phone: z.string().min(5).max(20).optional(),
  recipient_name: z.string().max(200).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(10000),
}).refine(
  (data) => {
    if (data.channel === 'email' && !data.recipient_email) return false;
    if (data.channel === 'sms' && !data.recipient_phone) return false;
    return true;
  },
  {
    message: 'Email address is required for email channel; phone number is required for SMS',
    path: ['recipient_email'],
  }
);

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

/**
 * Schema for updating notification preferences.
 */
export const updateNotificationPreferenceSchema = z.object({
  notification_type: z.enum(notificationTypes),
  channel: z.enum(channels).default('email'),
  is_enabled: z.boolean(),
});

export type UpdateNotificationPreferenceInput = z.infer<
  typeof updateNotificationPreferenceSchema
>;
