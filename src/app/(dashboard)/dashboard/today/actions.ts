'use server';

// ==================================================
// Today Mode — Server Actions
// ==================================================
// Instructor quick-actions: start, complete, no-show,
// and add notes to lessons.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { audit } from '@/lib/audit';

export interface TodayActionState {
  success: boolean;
  error?: string;
}

/**
 * Transition a booking to "confirmed" (Start Lesson).
 */
export async function startLessonAction(
  bookingId: string
): Promise<TodayActionState> {
  try {
    const { auth } = await getDashboardContext();
    await requirePermission(auth, PERMISSIONS.BOOKING_EDIT);
    const client = await createServerSupabaseClient();

    const { data: booking, error: fetchError } = await client
      .from('bookings')
      .select('id, status, instructor_id')
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: 'Booking not found.' };
    }

    // Instructors can only act on their own lessons
    if (auth.role === 'instructor') {
      const { data: inst } = await client
        .from('instructors')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('user_id', auth.userId)
        .single();

      if (!inst || inst.id !== booking.instructor_id) {
        return { success: false, error: 'You can only manage your own lessons.' };
      }
    }

    if (booking.status !== 'confirmed' && booking.status !== 'new_request' && booking.status !== 'contacted') {
      return { success: false, error: `Cannot start a lesson with status "${booking.status}".` };
    }

    const { error: updateError } = await client
      .from('bookings')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId);

    if (updateError) throw updateError;

    audit(client, auth, { action: 'booking.started', resourceType: 'booking', resourceId: bookingId });
    revalidatePath('/dashboard/today');
    revalidatePath('/dashboard/bookings');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to start lesson' };
  }
}

/**
 * Mark a booking as "completed".
 */
export async function completeLessonAction(
  bookingId: string
): Promise<TodayActionState> {
  try {
    const { auth } = await getDashboardContext();
    await requirePermission(auth, PERMISSIONS.BOOKING_EDIT);
    const client = await createServerSupabaseClient();

    const { data: booking, error: fetchError } = await client
      .from('bookings')
      .select('id, status, instructor_id')
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (auth.role === 'instructor') {
      const { data: inst } = await client
        .from('instructors')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('user_id', auth.userId)
        .single();

      if (!inst || inst.id !== booking.instructor_id) {
        return { success: false, error: 'You can only manage your own lessons.' };
      }
    }

    if (booking.status !== 'confirmed') {
      return { success: false, error: `Cannot complete a lesson with status "${booking.status}". Start it first.` };
    }

    const { error: updateError } = await client
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId);

    if (updateError) throw updateError;

    audit(client, auth, { action: 'booking.completed', resourceType: 'booking', resourceId: bookingId });
    revalidatePath('/dashboard/today');
    revalidatePath('/dashboard/bookings');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to complete lesson' };
  }
}

/**
 * Mark a booking as "no_show".
 */
export async function markNoShowAction(
  bookingId: string
): Promise<TodayActionState> {
  try {
    const { auth } = await getDashboardContext();
    await requirePermission(auth, PERMISSIONS.BOOKING_EDIT);
    const client = await createServerSupabaseClient();

    const { data: booking, error: fetchError } = await client
      .from('bookings')
      .select('id, status, instructor_id')
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (auth.role === 'instructor') {
      const { data: inst } = await client
        .from('instructors')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('user_id', auth.userId)
        .single();

      if (!inst || inst.id !== booking.instructor_id) {
        return { success: false, error: 'You can only manage your own lessons.' };
      }
    }

    if (booking.status !== 'confirmed') {
      return { success: false, error: `Cannot mark no-show for status "${booking.status}".` };
    }

    const { error: updateError } = await client
      .from('bookings')
      .update({ status: 'no_show', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId);

    if (updateError) throw updateError;

    audit(client, auth, { action: 'booking.no_show', resourceType: 'booking', resourceId: bookingId });
    revalidatePath('/dashboard/today');
    revalidatePath('/dashboard/bookings');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to mark no-show' };
  }
}

/**
 * Add notes to a booking.
 */
export async function addLessonNotesAction(
  _prev: TodayActionState,
  formData: FormData
): Promise<TodayActionState> {
  try {
    const { auth } = await getDashboardContext();
    await requirePermission(auth, PERMISSIONS.BOOKING_EDIT);
    const client = await createServerSupabaseClient();

    const bookingId = formData.get('booking_id') as string;
    const notes = formData.get('notes') as string;

    if (!bookingId || !notes?.trim()) {
      return { success: false, error: 'Notes are required.' };
    }

    const { data: booking, error: fetchError } = await client
      .from('bookings')
      .select('id, instructor_id, admin_notes')
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (auth.role === 'instructor') {
      const { data: inst } = await client
        .from('instructors')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('user_id', auth.userId)
        .single();

      if (!inst || inst.id !== booking.instructor_id) {
        return { success: false, error: 'You can only add notes to your own lessons.' };
      }
    }

    // Append to existing notes
    const existingNotes = booking.admin_notes ?? '';
    const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const updatedNotes = existingNotes
      ? `${existingNotes}\n\n[${timestamp}] ${notes.trim()}`
      : `[${timestamp}] ${notes.trim()}`;

    const { error: updateError } = await client
      .from('bookings')
      .update({ admin_notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('organization_id', auth.organizationId);

    if (updateError) throw updateError;

    revalidatePath('/dashboard/today');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add notes' };
  }
}
