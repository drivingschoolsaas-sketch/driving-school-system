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

    await createBooking(client, auth, input);
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
    await cancelBooking(client, auth, bookingId, input);
    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/calendar');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel booking';
    return { success: false, error: message };
  }
}
