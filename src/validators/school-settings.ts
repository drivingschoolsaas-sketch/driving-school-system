import { z } from 'zod';

// ==================================================
// School Settings Validators
// ==================================================

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export const updateSchoolSettingsSchema = z.object({
  // Branding
  logo_url: z.string().url().max(2048).optional().nullable(),
  favicon_url: z.string().url().max(2048).optional().nullable(),
  primary_color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
  secondary_color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),

  // Contact
  contact_phone: z.string().max(30).optional().nullable(),
  contact_email: z.string().email().max(255).optional().nullable(),
  contact_address: z.string().max(500).optional().nullable(),

  // Website content
  about_text: z.string().max(5000).optional().nullable(),
  hero_title: z.string().max(200).optional().nullable(),
  hero_subtitle: z.string().max(500).optional().nullable(),
  meta_title: z.string().max(70).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),

  // Social links
  social_facebook: z.string().url().max(500).optional().nullable(),
  social_instagram: z.string().url().max(500).optional().nullable(),
  social_google_review: z.string().url().max(500).optional().nullable(),
  social_tiktok: z.string().url().max(500).optional().nullable(),

  // Booking rules
  min_booking_notice_hours: z.number().int().min(0).max(168).optional(),
  max_advance_booking_days: z.number().int().min(1).max(365).optional(),
  cancellation_notice_hours: z.number().int().min(0).max(168).optional(),
  allow_online_booking: z.boolean().optional(),

  // Operational
  default_lesson_duration: z.number().int().min(15).max(240).optional(),
  default_travel_buffer_minutes: z.number().int().min(0).max(120).optional(),
  default_transmission: z.enum(['automatic', 'manual', 'both']).optional(),

  // Website sections
  sections_enabled: z
    .array(z.string().max(50))
    .max(20)
    .optional(),

  // Custom website content
  custom_faqs: z
    .array(
      z.object({
        q: z.string().min(5).max(200),
        a: z.string().min(10).max(1000),
      })
    )
    .max(20)
    .optional()
    .nullable(),
  value_propositions: z
    .array(
      z.object({
        icon: z.string().min(1).max(10),
        title: z.string().min(2).max(50),
        desc: z.string().min(2).max(100),
      })
    )
    .min(1)
    .max(8)
    .optional()
    .nullable(),
  popular_package_id: z.string().uuid().optional().nullable(),
}).partial();

export type UpdateSchoolSettingsInput = z.infer<typeof updateSchoolSettingsSchema>;
