import { z } from 'zod';

// ==================================================
// Availability Exception Validators
// ==================================================

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:MM format (e.g. 08:00)');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format');

/**
 * Create an availability exception.
 * - If is_available=false: the instructor is off that entire day (no times needed).
 * - If is_available=true: the instructor works only the given time range.
 */
export const createAvailabilityExceptionSchema = z
  .object({
    instructor_id: z.string().uuid('Invalid instructor ID'),
    exception_date: dateSchema,
    is_available: z.boolean(),
    start_time: timeSchema.optional().nullable(),
    end_time: timeSchema.optional().nullable(),
    reason: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.is_available) {
        return data.start_time != null && data.end_time != null;
      }
      return data.start_time == null && data.end_time == null;
    },
    {
      message:
        'When available, start_time and end_time are required. When unavailable, they must be omitted.',
      path: ['start_time'],
    }
  )
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

export type CreateAvailabilityExceptionInput = z.infer<typeof createAvailabilityExceptionSchema>;

export const updateAvailabilityExceptionSchema = z
  .object({
    is_available: z.boolean().optional(),
    start_time: timeSchema.optional().nullable(),
    end_time: timeSchema.optional().nullable(),
    reason: z.string().max(500).optional().nullable(),
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

export type UpdateAvailabilityExceptionInput = z.infer<typeof updateAvailabilityExceptionSchema>;
