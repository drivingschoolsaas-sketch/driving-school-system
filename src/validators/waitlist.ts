// ==================================================
// Waitlist Validators
// ==================================================

import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Schema for creating a waitlist entry.
 */
export const createWaitlistEntrySchema = z
  .object({
    student_id: z.string().uuid('Student ID is required'),
    preferred_days: z
      .array(
        z.enum([
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ])
      )
      .default([]),
    preferred_time_start: z
      .string()
      .regex(TIME_REGEX, 'Start time must be HH:MM (24h)')
      .optional(),
    preferred_time_end: z
      .string()
      .regex(TIME_REGEX, 'End time must be HH:MM (24h)')
      .optional(),
    preferred_instructor_id: z.string().uuid().optional(),
    lesson_type_id: z.string().uuid().optional(),
    service_area_id: z.string().uuid().optional(),
    notes: z.string().max(500).optional(),
    expires_at: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      // If one time is provided, both must be provided
      const hasStart = !!data.preferred_time_start;
      const hasEnd = !!data.preferred_time_end;
      return hasStart === hasEnd;
    },
    {
      message: 'Both preferred_time_start and preferred_time_end must be provided together',
    }
  );

export type CreateWaitlistEntryInput = z.infer<typeof createWaitlistEntrySchema>;

/**
 * Schema for updating a custom theme.
 */
export const updateCustomThemeSchema = z.object({
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color (#RRGGBB)')
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color (#RRGGBB)')
    .optional(),
  accent_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color (#RRGGBB)')
    .nullable()
    .optional(),
  background_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color (#RRGGBB)')
    .nullable()
    .optional(),
  text_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color (#RRGGBB)')
    .nullable()
    .optional(),
  header_bg_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color (#RRGGBB)')
    .nullable()
    .optional(),
  footer_bg_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color (#RRGGBB)')
    .nullable()
    .optional(),
  heading_font: z.string().max(100).nullable().optional(),
  body_font: z.string().max(100).nullable().optional(),
  header_style: z.enum(['default', 'centered', 'minimal']).optional(),
  footer_style: z.enum(['default', 'compact', 'expanded']).optional(),
  hero_style: z.enum(['default', 'image', 'gradient', 'minimal']).optional(),
  corner_radius: z.enum(['none', 'small', 'medium', 'large']).optional(),
  custom_css: z
    .string()
    .max(10240, 'Custom CSS cannot exceed 10KB')
    .nullable()
    .optional(),
});

export type UpdateCustomThemeInput = z.infer<typeof updateCustomThemeSchema>;
