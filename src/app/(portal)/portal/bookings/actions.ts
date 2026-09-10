'use server';

// ==================================================
// Portal Booking Actions
// ==================================================
// Students can cancel their own upcoming bookings.

import { revalidatePath } from 'next/cache';
import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';

export interface PortalBookingActionState {
  success: boolean;
  error?: string;
}

export async function cancelOwnBookingAction(
  bookingId: string,
  reason?: string
): Promise<PortalBookingActionState> {
  try {
    const { auth, student } = await getPortalContext();
    const client = await createServerSupabaseClient();

    // Verify this booking belongs to the student
    const { data: booking, error: fetchError } = await client
      .from('bookings')
      .select('id, student_id, status, start_datetime')
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (booking.student_id !== student.id) {
      return { success: false, error: 'You can only cancel your own bookings.' };
    }

    // Only allow cancellation of certain statuses
    const cancellableStatuses = ['new_request', 'contacted', 'confirmed'];
    if (!cancellableStatuses.includes(booking.status)) {
      return { success: false, error: `Cannot cancel a booking with status "${booking.status}".` };
    }

    // Check if the booking is too close (e.g., within 24 hours)
    const bookingStart = new Date(booking.start_datetime);
    const hoursUntil = (bookingStart.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      return {
        success: false,
        error: 'Cannot cancel within 24 hours of the lesson. Please contact the school directly.',
      };
    }

    const { error: updateError } = await client
      .from('bookings')
      .update({
        status: 'cancelled',
        notes: reason
          ? `Cancelled by student: ${reason}`
          : 'Cancelled by student',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId);

    if (updateError) throw updateError;

    revalidatePath('/portal/bookings');
    revalidatePath('/portal');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel booking';
    return { success: false, error: message };
  }
}
