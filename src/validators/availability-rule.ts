import { z } from 'zod';

// ==================================================
// Availability Rule Validators
// ==================================================

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

/**
 * HH:MM format — validates 00:00 to 23:59.
 */
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM format (e.g. 08:00)');

export const createAvailabilityRuleSchema = z
  .object({
    instructor_id: z.string().uuid('Invalid instructor ID'),
    day_of_week: z.enum(DAYS_OF_WEEK),
    start_time: timeSchema,
    end_time: timeSchema,
    is_active: z.boolean().default(true),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: 'End time must be after start time',
    path: ['end_time'],
  });

export type CreateAvailabilityRuleInput = z.infer<typeof createAvailabilityRuleSchema>;

export const updateAvailabilityRuleSchema = z
  .object({
    start_time: timeSchema.optional(),
    end_time: timeSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.end_time > data.start_time;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['end_time'],
    }
  );

export type UpdateAvailabilityRuleInput = z.infer<typeof updateAvailabilityRuleSchema>;

/**
 * Bulk set: replace all rules for an instructor at once.
 * Each entry is one day's schedule.
 */
export const setWeeklyScheduleSchema = z.array(
  z
    .object({
      day_of_week: z.enum(DAYS_OF_WEEK),
      start_time: timeSchema,
      end_time: timeSchema,
    })
    .refine((data) => data.end_time > data.start_time, {
      message: 'End time must be after start time',
      path: ['end_time'],
    })
);

export type SetWeeklyScheduleInput = z.infer<typeof setWeeklyScheduleSchema>;
