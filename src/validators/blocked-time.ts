import { z } from 'zod';

// ==================================================
// Blocked Time Validators
// ==================================================

const BLOCKED_TIME_REASONS = [
  'lunch',
  'private_appointment',
  'vehicle_maintenance',
  'driving_test',
  'annual_leave',
  'sick_leave',
  'training',
  'admin_blocked',
  'other',
] as const;

export const createBlockedTimeSchema = z
  .object({
    instructor_id: z.string().uuid('Invalid instructor ID'),
    start_datetime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
    end_datetime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
    reason: z.enum(BLOCKED_TIME_REASONS).default('other'),
    notes: z.string().max(1000).optional().nullable(),
    is_all_day: z.boolean().default(false),
  })
  .refine((data) => new Date(data.end_datetime) > new Date(data.start_datetime), {
    message: 'End datetime must be after start datetime',
    path: ['end_datetime'],
  });

export type CreateBlockedTimeInput = z.infer<typeof createBlockedTimeSchema>;

export const updateBlockedTimeSchema = z
  .object({
    start_datetime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }).optional(),
    end_datetime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }).optional(),
    reason: z.enum(BLOCKED_TIME_REASONS).optional(),
    notes: z.string().max(1000).optional().nullable(),
    is_all_day: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.start_datetime && data.end_datetime) {
        return new Date(data.end_datetime) > new Date(data.start_datetime);
      }
      return true;
    },
    {
      message: 'End datetime must be after start datetime',
      path: ['end_datetime'],
    }
  );

export type UpdateBlockedTimeInput = z.infer<typeof updateBlockedTimeSchema>;
