'use server';

// ==================================================
// Public Booking Actions
// ==================================================
// Server actions for the public booking flow.
// These do NOT require authentication — visitors can
// submit booking requests that become new_request status.

import { revalidatePath } from 'next/cache';
import { getTenantData } from '@/lib/tenant';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { computeAvailableSlots, type AvailableSlot } from '@/services/availability-engine';
import type { AvailabilityRule, AvailabilityException, BlockedTime, Booking } from '@/types/database';

export interface BookingRequestState {
  success: boolean;
  error?: string;
}

/**
 * Get available time slots for a given instructor on a date.
 * Called from the client booking widget.
 */
export async function getAvailableSlotsAction(
  instructorId: string,
  date: string,
  durationMinutes: number
): Promise<AvailableSlot[]> {
  const data = await getTenantData();
  if (!data) return [];

  const client = await createServerSupabaseClient();
  const orgId = data.organization.id;

  // Fetch all availability data for this instructor/date
  const [rulesRes, exceptionsRes, blockedRes, bookingsRes] = await Promise.all([
    client
      .from('availability_rules')
      .select('*')
      .eq('organization_id', orgId)
      .eq('instructor_id', instructorId),
    client
      .from('availability_exceptions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('instructor_id', instructorId)
      .eq('exception_date', date),
    client
      .from('blocked_times')
      .select('*')
      .eq('organization_id', orgId)
      .eq('instructor_id', instructorId)
      .lte('start_datetime', `${date}T23:59:59`)
      .gte('end_datetime', `${date}T00:00:00`),
    client
      .from('bookings')
      .select('start_datetime, end_datetime')
      .eq('organization_id', orgId)
      .eq('instructor_id', instructorId)
      .in('status', ['new_request', 'contacted', 'confirmed'])
      .gte('start_datetime', `${date}T00:00:00`)
      .lte('start_datetime', `${date}T23:59:59`),
  ]);

  const rules = (rulesRes.data ?? []) as AvailabilityRule[];
  const exceptions = (exceptionsRes.data ?? []) as AvailabilityException[];
  const blocked = (blockedRes.data ?? []) as BlockedTime[];
  const bookings = (bookingsRes.data ?? []) as Pick<Booking, 'start_datetime' | 'end_datetime'>[];

  return computeAvailableSlots({
    date,
    rules: rules.map((r) => ({
      day_of_week: r.day_of_week as Parameters<typeof computeAvailableSlots>[0]['rules'][number]['day_of_week'],
      start_time: r.start_time,
      end_time: r.end_time,
      is_active: r.is_active,
    })),
    exceptions: exceptions.map((e) => ({
      exception_date: e.exception_date,
      is_available: e.is_available,
      start_time: e.start_time,
      end_time: e.end_time,
    })),
    blockedTimes: blocked.map((b) => ({
      start_datetime: b.start_datetime,
      end_datetime: b.end_datetime,
    })),
    existingBookings: bookings.map((b) => ({
      start_datetime: b.start_datetime,
      end_datetime: b.end_datetime,
    })),
    lessonDurationMinutes: durationMinutes,
  });
}

/**
 * Submit a public booking request.
 * Creates a booking with status "new_request".
 */
export async function submitBookingRequestAction(
  _prev: BookingRequestState,
  formData: FormData
): Promise<BookingRequestState> {
  try {
    const data = await getTenantData();
    if (!data) return { success: false, error: 'School not found.' };

    // Use admin client to bypass RLS for public booking creation
    const adminClient = getAdminClient();
    const orgId = data.organization.id;

    const instructorId = formData.get('instructor_id') as string;
    const lessonTypeId = formData.get('lesson_type_id') as string;
    const slotStart = formData.get('slot_start') as string;
    const slotEnd = formData.get('slot_end') as string;
    const customerName = (formData.get('customer_name') as string)?.trim();
    const customerEmail = (formData.get('customer_email') as string)?.trim();
    const customerPhone = (formData.get('customer_phone') as string)?.trim();
    const pickupAddress = (formData.get('pickup_address') as string)?.trim();
    const notes = (formData.get('notes') as string)?.trim();

    if (!instructorId || !lessonTypeId || !slotStart || !slotEnd) {
      return { success: false, error: 'Please select a lesson type, instructor, and time slot.' };
    }
    if (!customerName || !customerEmail) {
      return { success: false, error: 'Name and email are required.' };
    }

    // Get the lesson type to extract price
    const { data: lessonType } = await adminClient
      .from('lesson_types')
      .select('price_cents')
      .eq('id', lessonTypeId)
      .eq('organization_id', orgId)
      .single() as { data: { price_cents: number } | null };

    const priceCents = lessonType?.price_cents ?? 0;

    // Insert booking directly (no auth user for public visitors)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (adminClient.from('bookings') as any)
      .insert({
        organization_id: orgId,
        instructor_id: instructorId,
        lesson_type_id: lessonTypeId,
        start_datetime: slotStart,
        end_datetime: slotEnd,
        status: 'new_request',
        price_cents: priceCents,
        pickup_address: pickupAddress || null,
        notes: [
          `Public booking by: ${customerName}`,
          `Email: ${customerEmail}`,
          customerPhone ? `Phone: ${customerPhone}` : null,
          notes ? `Notes: ${notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      });

    if (insertError) {
      console.error('Booking insert error:', insertError);
      return { success: false, error: 'Failed to submit booking. Please try again.' };
    }

    revalidatePath('/book');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return { success: false, error: message };
  }
}
