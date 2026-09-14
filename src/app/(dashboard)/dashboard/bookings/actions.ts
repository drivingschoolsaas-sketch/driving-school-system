'use server';

// ==================================================
// Booking Server Actions
// ==================================================
// Status transitions, creation, and cancellation.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { PERMISSIONS } from '@/permissions/roles';
import {
  createBooking,
  transitionBookingStatus,
  cancelBooking,
  rescheduleBooking,
} from '@/services/booking-service';
import {
  createBookingSchema,
  transitionBookingStatusSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
} from '@/validators/booking';
import { audit } from '@/lib/audit';
import {
  resolveBookingNotificationParams,
  notifyBookingConfirmed,
  notifyBookingCancelled,
  notifyBookingChanged,
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

    // Notify student of new booking (fire-and-forget, use admin client to survive after response)
    const ac = getAdminClient();
    resolveBookingNotificationParams(ac, auth.organizationId, booking.id).then((params) => {
      if (params) notifyBookingConfirmed(ac, params);
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

    // Send appropriate notification based on new status (admin client survives after response)
    const ac2 = getAdminClient();
    resolveBookingNotificationParams(ac2, auth.organizationId, bookingId).then((params) => {
      if (!params) return;
      if (input.status === 'confirmed') notifyBookingConfirmed(ac2, params);
      else if (input.status === 'completed') notifyLessonCompleted(ac2, params);
      else if (input.status === 'cancelled') notifyBookingCancelled(ac2, params, input.reason ?? undefined);
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

export async function rescheduleBookingAction(
  bookingId: string,
  formData: FormData
): Promise<BookingActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.BOOKING_EDIT);
    const client = await createServerSupabaseClient();

    const newDate = formData.get('new_date') as string;
    const newStartTime = formData.get('new_start_time') as string;
    const newEndTime = formData.get('new_end_time') as string;
    const newInstructorId = (formData.get('new_instructor_id') as string) || undefined;
    const reason = (formData.get('reason') as string) || undefined;

    const newStartDatetime = `${newDate}T${newStartTime}:00`;
    const newEndDatetime = `${newDate}T${newEndTime}:00`;

    const input = rescheduleBookingSchema.parse({
      new_start_datetime: new Date(newStartDatetime).toISOString(),
      new_end_datetime: new Date(newEndDatetime).toISOString(),
      new_instructor_id: newInstructorId,
      reason,
    });

    await rescheduleBooking(client, auth, bookingId, input);
    audit(client, auth, {
      action: 'booking.rescheduled',
      resourceType: 'booking',
      resourceId: bookingId,
      details: { new_start: input.new_start_datetime, reason },
    });

    // Notify student of the change (fire-and-forget, admin client survives after response)
    const ac3 = getAdminClient();
    resolveBookingNotificationParams(ac3, auth.organizationId, bookingId).then((params) => {
      if (params) notifyBookingChanged(ac3, params);
    });

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/calendar');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reschedule booking';
    return { success: false, error: message };
  }
}
