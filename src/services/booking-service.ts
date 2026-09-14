// ==================================================
// Booking Service
// ==================================================
// CRUD operations, status transitions, rescheduling,
// and cancellation for bookings. Conflict prevention
// is enforced by the database exclusion constraint —
// the service catches the constraint violation and
// returns a controlled BOOKING_001_SLOT_UNAVAILABLE error.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Booking, BookingStatusHistory } from '@/types/database';
import type { BookingStatus } from '@/config/constants';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type {
  CreateBookingInput,
  UpdateBookingInput,
  CancelBookingInput,
} from '@/validators/booking';
import { BookingErrors } from '@/lib/errors';
import { logger } from '@/lib/logging';
import { audit } from '@/lib/audit';

// --------------------------------------------------
// Valid status transitions
// --------------------------------------------------

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new_request: ['contacted', 'confirmed', 'rejected', 'cancelled'],
  contacted: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// --------------------------------------------------
// Read operations
// --------------------------------------------------

export async function getBookings(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: {
    instructorId?: string;
    studentId?: string;
    status?: BookingStatus;
    from?: string;
    to?: string;
    limit?: number;
  }
): Promise<Booking[]> {
  let query = client
    .from('bookings')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('start_datetime', { ascending: true });

  if (options?.instructorId) {
    query = query.eq('instructor_id', options.instructorId);
  }
  if (options?.studentId) {
    query = query.eq('student_id', options.studentId);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.from) {
    query = query.gte('start_datetime', options.from);
  }
  if (options?.to) {
    query = query.lte('start_datetime', options.to);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch bookings', error, {
      feature: 'bookings',
      operation: 'list',
      organizationId: context.organizationId,
    });
    return [];
  }

  return (data ?? []) as Booking[];
}

export async function getBooking(
  client: SupabaseClient,
  context: AuthorizedContext,
  bookingId: string
): Promise<Booking | null> {
  const { data, error } = await client
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch booking', error, {
      feature: 'bookings',
      operation: 'get',
      organizationId: context.organizationId,
      entityId: bookingId,
    });
    return null;
  }

  return data as Booking | null;
}

// --------------------------------------------------
// Create with conflict protection
// --------------------------------------------------

/**
 * Create a booking. The database exclusion constraint prevents
 * double-booking — if two requests try to book the same instructor
 * at the same time, only one succeeds; the other gets
 * BOOKING_001_SLOT_UNAVAILABLE.
 */
export async function createBooking(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateBookingInput
): Promise<Booking> {
  const { data, error } = await client
    .from('bookings')
    .insert({
      ...input,
      organization_id: context.organizationId,
      created_by: context.userId,
    })
    .select()
    .single();

  if (error) {
    // Check for exclusion constraint violation (conflict)
    if (isConflictError(error)) {
      logger.warn('Booking conflict detected', {
        feature: 'bookings',
        operation: 'create',
        organizationId: context.organizationId,
        instructorId: input.instructor_id,
        startDatetime: input.start_datetime,
      });
      throw BookingErrors.slotUnavailable({
        instructorId: input.instructor_id,
        startDatetime: input.start_datetime,
        endDatetime: input.end_datetime,
      });
    }

    logger.error('Failed to create booking', error, {
      feature: 'bookings',
      operation: 'create',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create booking.');
  }

  // Record initial status in history
  await recordStatusChange(client, data.id, null, 'new_request', context.userId, 'Booking request submitted');

  logger.info('Booking created', {
    feature: 'bookings',
    operation: 'create',
    organizationId: context.organizationId,
    entityId: data.id,
    instructorId: input.instructor_id,
    studentId: input.student_id,
  });

  // P2-5: Audit log
  await audit(client, context, {
    action: 'booking.created',
    resourceType: 'booking',
    resourceId: data.id as string,
    details: { instructor_id: input.instructor_id, student_id: input.student_id },
  });

  return data as Booking;
}

// --------------------------------------------------
// Update (non-status fields)
// --------------------------------------------------

export async function updateBooking(
  client: SupabaseClient,
  context: AuthorizedContext,
  bookingId: string,
  input: UpdateBookingInput
): Promise<Booking> {
  const { data, error } = await client
    .from('bookings')
    .update(input)
    .eq('id', bookingId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update booking', error, {
      feature: 'bookings',
      operation: 'update',
      organizationId: context.organizationId,
      entityId: bookingId,
    });
    throw new Error('Failed to update booking.');
  }

  return data as Booking;
}

// --------------------------------------------------
// Status transitions
// --------------------------------------------------

/**
 * Transition a booking to a new status with validation.
 * Throws BOOKING_006_INVALID_STATUS_TRANSITION on bad transitions.
 */
export async function transitionBookingStatus(
  client: SupabaseClient,
  context: AuthorizedContext,
  bookingId: string,
  newStatus: BookingStatus,
  reason?: string | null
): Promise<Booking> {
  // Fetch current booking
  const current = await getBooking(client, context, bookingId);
  if (!current) {
    throw BookingErrors.notFound({ bookingId });
  }

  // Validate transition
  if (!isValidTransition(current.status, newStatus)) {
    throw BookingErrors.invalidStatusTransition(current.status, newStatus);
  }

  // Update status — include current status check to prevent TOCTOU race
  const { data, error } = await client
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', bookingId)
    .eq('organization_id', context.organizationId)
    .eq('status', current.status)
    .select()
    .single();

  if (error) {
    if (isConflictError(error)) {
      throw BookingErrors.slotUnavailable({ bookingId });
    }
    logger.error('Failed to transition booking status', error, {
      feature: 'bookings',
      operation: 'transition_status',
      organizationId: context.organizationId,
      entityId: bookingId,
      from: current.status,
      to: newStatus,
    });
    throw new Error('Failed to update booking status.');
  }

  // Record in history
  await recordStatusChange(client, bookingId, current.status, newStatus, context.userId, reason);

  logger.info('Booking status transitioned', {
    feature: 'bookings',
    operation: 'transition_status',
    organizationId: context.organizationId,
    entityId: bookingId,
    from: current.status,
    to: newStatus,
  });

  await audit(client, context, {
    action: 'booking.status_changed',
    resourceType: 'booking',
    resourceId: bookingId,
    details: { from: current.status, to: newStatus, reason },
  });

  return data as Booking;
}

// --------------------------------------------------
// Cancellation
// --------------------------------------------------

/**
 * Cancel a booking. Records who cancelled and why.
 */
export async function cancelBooking(
  client: SupabaseClient,
  context: AuthorizedContext,
  bookingId: string,
  input: CancelBookingInput
): Promise<Booking> {
  const current = await getBooking(client, context, bookingId);
  if (!current) {
    throw BookingErrors.notFound({ bookingId });
  }

  if (!isValidTransition(current.status, 'cancelled')) {
    throw BookingErrors.invalidStatusTransition(current.status, 'cancelled');
  }

  const { data, error } = await client
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_by: context.userId,
      cancellation_reason: input.reason ?? null,
    })
    .eq('id', bookingId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to cancel booking', error, {
      feature: 'bookings',
      operation: 'cancel',
      organizationId: context.organizationId,
      entityId: bookingId,
    });
    throw new Error('Failed to cancel booking.');
  }

  await recordStatusChange(
    client,
    bookingId,
    current.status,
    'cancelled',
    context.userId,
    input.reason
  );

  logger.info('Booking cancelled', {
    feature: 'bookings',
    operation: 'cancel',
    organizationId: context.organizationId,
    entityId: bookingId,
    cancelledBy: context.userId,
  });

  await audit(client, context, {
    action: 'booking.cancelled',
    resourceType: 'booking',
    resourceId: bookingId,
    details: { reason: input.reason, from: current.status },
  });

  return data as Booking;
}

// --------------------------------------------------
// Reschedule
// --------------------------------------------------

import type { RescheduleBookingInput } from '@/validators/booking';

/**
 * Reschedule a booking to a new date/time (and optionally new instructor).
 * Validates the booking exists and isn't in a terminal state.
 * The DB exclusion constraint enforces no-overlap.
 */
export async function rescheduleBooking(
  client: SupabaseClient,
  context: AuthorizedContext,
  bookingId: string,
  input: RescheduleBookingInput
): Promise<Booking> {
  const current = await getBooking(client, context, bookingId);
  if (!current) {
    throw BookingErrors.notFound({ bookingId });
  }

  // Can only reschedule non-terminal bookings
  const terminalStatuses: BookingStatus[] = ['completed', 'cancelled', 'rejected', 'no_show'];
  if (terminalStatuses.includes(current.status)) {
    throw BookingErrors.invalidStatusTransition(current.status, current.status);
  }

  const updates: Record<string, unknown> = {
    start_datetime: input.new_start_datetime,
    end_datetime: input.new_end_datetime,
  };

  if (input.new_instructor_id) {
    updates.instructor_id = input.new_instructor_id;
  }

  const { data, error } = await client
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    if (isConflictError(error)) {
      throw BookingErrors.slotUnavailable({ bookingId });
    }
    logger.error('Failed to reschedule booking', error, {
      feature: 'bookings',
      operation: 'reschedule',
      organizationId: context.organizationId,
      entityId: bookingId,
    });
    throw new Error('Failed to reschedule booking.');
  }

  logger.info('Booking rescheduled', {
    feature: 'bookings',
    operation: 'reschedule',
    organizationId: context.organizationId,
    entityId: bookingId,
    from: { start: current.start_datetime, instructor: current.instructor_id },
    to: { start: input.new_start_datetime, instructor: input.new_instructor_id ?? current.instructor_id },
  });

  await audit(client, context, {
    action: 'booking.rescheduled',
    resourceType: 'booking',
    resourceId: bookingId,
    details: {
      old_start: current.start_datetime,
      new_start: input.new_start_datetime,
      new_instructor_id: input.new_instructor_id ?? null,
      reason: input.reason ?? null,
    },
  });

  return data as Booking;
}

/**
 * Reject a booking request. Only admins/instructors should call this.
 */
export async function rejectBooking(
  client: SupabaseClient,
  context: AuthorizedContext,
  bookingId: string,
  reason?: string | null
): Promise<Booking> {
  return transitionBookingStatus(client, context, bookingId, 'rejected', reason);
}

// --------------------------------------------------
// Status history
// --------------------------------------------------

export async function getBookingHistory(
  client: SupabaseClient,
  context: AuthorizedContext,
  bookingId: string
): Promise<BookingStatusHistory[]> {
  // Verify booking belongs to org
  const booking = await getBooking(client, context, bookingId);
  if (!booking) return [];

  const { data, error } = await client
    .from('booking_status_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch booking history', error, {
      feature: 'bookings',
      operation: 'get_history',
      organizationId: context.organizationId,
      entityId: bookingId,
    });
    return [];
  }

  return (data ?? []) as BookingStatusHistory[];
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

async function recordStatusChange(
  client: SupabaseClient,
  bookingId: string,
  previousStatus: BookingStatus | null,
  newStatus: BookingStatus,
  changedBy: string,
  reason?: string | null
): Promise<void> {
  const { error } = await client.from('booking_status_history').insert({
    booking_id: bookingId,
    previous_status: previousStatus,
    new_status: newStatus,
    changed_by: changedBy,
    reason: reason ?? null,
  });

  if (error) {
    // Non-critical — log but don't throw
    logger.error('Failed to record booking status change', error, {
      feature: 'bookings',
      operation: 'record_status_change',
      bookingId,
      previousStatus,
      newStatus,
    });
  }
}

/**
 * Check if a Supabase error is an exclusion constraint violation
 * (indicating a booking conflict).
 */
function isConflictError(error: { code?: string; message?: string }): boolean {
  // PostgreSQL exclusion violation code: 23P01
  return error.code === '23P01' || error.message?.includes('excl_instructor_overlap') === true;
}
