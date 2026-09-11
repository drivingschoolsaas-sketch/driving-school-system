'use server';

// ==================================================
// Booking Server Actions
// ==================================================
// Status transitions, creation, and cancellation.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import {
  createBooking,
  transitionBookingStatus,
  cancelBooking,
} from '@/services/booking-service';
import {
  createBookingSchema,
  transitionBookingStatusSchema,
  cancelBookingSchema,
} from '@/validators/booking';
import { audit } from '@/lib/audit';
import {
  resolveBookingNotificationParams,
  notifyBookingConfirmed,
  notifyBookingCancelled,
  notifyLessonCompleted,
} from '@/services/booking-notifications';

export interface BookingActionState {
  success: boolean;
  error?: string;
}

export async function createBookingAction(
  _prev: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.BOOKING_CREATE);
    const client = await createServerSupabaseClient();

    const startDatetime = `${formData.get('date')}T${formData.get('start_time')}:00`;
    const endDatetime = `${formData.get('date')}T${formData.get('end_time')}:00`;

    const input = createBookingSchema.parse({
      instructor_id: formData.get('instructor_id'),
      student_id: formData.get('student_id'),
      lesson_type_id: formData.get('lesson_type_id'),
      vehicle_id: formData.get('vehicle_id') || null,
      start_datetime: new Date(startDatetime).toISOString(),
      end_datetime: new Date(endDatetime).toISOString(),
      pickup_address: formData.get('pickup_address') || null,
      price_cents: parseInt(formData.get('price_cents') as string, 10) || 0,
      notes: formData.get('notes') || null,
    });

    const booking = await createBooking(client, auth, input);
    audit(client, auth, { action: 'booking.created', resourceType: 'booking', resourceId: booking.id });

    // Notify student of new booking (fire-and-forget)
    resolveBookingNotificationParams(client, auth.organizationId, booking.id).then((params) => {
      if (params) notifyBookingConfirmed(client, params);
    });

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create booking';
    return { success: false, error: message };
  }
}

export async function transitionStatusAction(
  bookingId: string,
  newStatus: string,
  reason?: string
): Promise<BookingActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.BOOKING_EDIT);
    const client = await createServerSupabaseClient();

    const input = transitionBookingStatusSchema.parse({
      status: newStatus,
      reason: reason || null,
    });

    await transitionBookingStatus(client, auth, bookingId, input.status, input.reason);
    audit(client, auth, { action: `booking.${input.status}`, resourceType: 'booking', resourceId: bookingId });

    // Send appropriate notification based on new status
    resolveBookingNotificationParams(client, auth.organizationId, bookingId).then((params) => {
      if (!params) return;
      if (input.status === 'confirmed') notifyBookingConfirmed(client, params);
      else if (input.status === 'completed') notifyLessonCompleted(client, params);
      else if (input.status === 'cancelled') notifyBookingCancelled(client, params, input.reason ?? undefined);
    });

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/calendar');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update status';
    return { success: false, error: message };
  }
}

export async function cancelBookingAction(
  bookingId: string,
  reason?: string
): Promise<BookingActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.BOOKING_CANCEL);
    const client = await createServerSupabaseClient();

    const input = cancelBookingSchema.parse({ reason: reason || null });

    // Resolve notification params before cancellation (need booking data)
    const notifParams = await resolveBookingNotificationParams(client, auth.organizationId, bookingId);

    await cancelBooking(client, auth, bookingId, input);
    audit(client, auth, { action: 'booking.cancelled', resourceType: 'booking', resourceId: bookingId, details: { reason } });

    // Notify student of cancellation (fire-and-forget)
    if (notifParams) {
      notifyBookingCancelled(client, notifParams, reason ?? 'Cancelled by admin');
    }

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/calendar');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel booking';
    return { success: false, error: message };
  }
}
