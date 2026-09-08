import { z } from 'zod';

// ==================================================
// Booking Validators
// ==================================================

const BOOKING_STATUSES = [
  'pending',
  'awaiting_payment',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
] as const;

/**
 * Create a booking — used by both students (public) and admins.
 */
export const createBookingSchema = z
  .object({
    instructor_id: z.string().uuid('Invalid instructor ID'),
    student_id: z.string().uuid('Invalid student ID'),
    lesson_type_id: z.string().uuid('Invalid lesson type ID'),
    vehicle_id: z.string().uuid('Invalid vehicle ID').optional().nullable(),
    start_datetime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
    end_datetime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
    pickup_address: z.string().max(500).optional().nullable(),
    pickup_suburb: z.string().max(100).optional().nullable(),
    pickup_postcode: z.string().max(10).optional().nullable(),
    service_area_id: z.string().uuid().optional().nullable(),
    price_cents: z.number().int().min(0, 'Price cannot be negative'),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((data) => new Date(data.end_datetime) > new Date(data.start_datetime), {
    message: 'End datetime must be after start datetime',
    path: ['end_datetime'],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * Update a booking — admin-level edits to non-status fields.
 */
export const updateBookingSchema = z.object({
  vehicle_id: z.string().uuid().optional().nullable(),
  pickup_address: z.string().max(500).optional().nullable(),
  pickup_suburb: z.string().max(100).optional().nullable(),
  pickup_postcode: z.string().max(10).optional().nullable(),
  service_area_id: z.string().uuid().optional().nullable(),
  price_cents: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional().nullable(),
  admin_notes: z.string().max(5000).optional().nullable(),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

/**
 * Reschedule a booking — moves to a new time slot.
 */
export const rescheduleBookingSchema = z
  .object({
    new_start_datetime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
    new_end_datetime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
    new_instructor_id: z.string().uuid().optional(),
    reason: z.string().max(500).optional().nullable(),
  })
  .refine((data) => new Date(data.new_end_datetime) > new Date(data.new_start_datetime), {
    message: 'End datetime must be after start datetime',
    path: ['new_end_datetime'],
  });

export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;

/**
 * Cancel a booking.
 */
export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

/**
 * Transition a booking to a new status (admin action).
 */
export const transitionBookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
  reason: z.string().max(500).optional().nullable(),
});

export type TransitionBookingStatusInput = z.infer<typeof transitionBookingStatusSchema>;
