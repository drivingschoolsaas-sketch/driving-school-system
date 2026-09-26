'use server';

// ==================================================
// Public Booking Actions
// ==================================================
// Server actions for the public booking flow.
// These do NOT require authentication — visitors can
// submit booking requests that become new_request status.

import { revalidatePath } from 'next/cache';
import { getTenantData } from '@/lib/tenant';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { computeAvailableSlots, type AvailableSlot } from '@/services/availability-engine';
import { notifyPublicBookingReceived } from '@/services/booking-notifications';
import { logger } from '@/lib/logging';
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
  if (!instructorId || typeof instructorId !== 'string') return [];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const safeDuration = Math.max(15, Math.min(480, Math.round(durationMinutes || 60)));

  const data = await getTenantData();
  if (!data) return [];

  // Use admin client — public visitors are unauthenticated,
  // and RLS blocks anon reads on these tables.
  const client = getAdminClient();
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
    lessonDurationMinutes: safeDuration,
  });
}

/**
 * Check which dates in a month have at least one available slot
 * for a given instructor (or any instructor).
 */
export async function getMonthAvailabilityAction(
  instructorIds: string[],
  yearMonth: string,
  durationMinutes: number
): Promise<Record<string, boolean>> {
  if (!instructorIds.length || !/^\d{4}-\d{2}$/.test(yearMonth)) return {};
  const safeDuration = Math.max(15, Math.min(480, Math.round(durationMinutes || 60)));

  const data = await getTenantData();
  if (!data) return {};

  const client = getAdminClient();
  const orgId = data.organization.id;

  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: data.organization.timezone ?? 'UTC' });

  const result: Record<string, boolean> = {};

  // Fetch rules for all requested instructors at once
  const { data: allRules } = await client
    .from('availability_rules')
    .select('*')
    .eq('organization_id', orgId)
    .in('instructor_id', instructorIds);
  const rules = (allRules ?? []) as AvailabilityRule[];

  // Fetch exceptions for the month
  const monthStart = `${yearMonth}-01`;
  const monthEnd = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;
  const { data: allExceptions } = await client
    .from('availability_exceptions')
    .select('*')
    .eq('organization_id', orgId)
    .in('instructor_id', instructorIds)
    .gte('exception_date', monthStart)
    .lte('exception_date', monthEnd);
  const exceptions = (allExceptions ?? []) as AvailabilityException[];

  // Fetch blocked times for the month
  const { data: allBlocked } = await client
    .from('blocked_times')
    .select('*')
    .eq('organization_id', orgId)
    .in('instructor_id', instructorIds)
    .lte('start_datetime', `${monthEnd}T23:59:59`)
    .gte('end_datetime', `${monthStart}T00:00:00`);
  const blocked = (allBlocked ?? []) as BlockedTime[];

  // Fetch bookings for the month
  const { data: allBookings } = await client
    .from('bookings')
    .select('start_datetime, end_datetime, instructor_id')
    .eq('organization_id', orgId)
    .in('instructor_id', instructorIds)
    .in('status', ['new_request', 'contacted', 'confirmed'])
    .gte('start_datetime', `${monthStart}T00:00:00`)
    .lte('start_datetime', `${monthEnd}T23:59:59`);
  const bookings = (allBookings ?? []) as (Pick<Booking, 'start_datetime' | 'end_datetime'> & { instructor_id: string })[];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
    if (dateStr < today) {
      result[dateStr] = false;
      continue;
    }

    let hasSlot = false;
    for (const instId of instructorIds) {
      const instRules = rules.filter((r) => r.instructor_id === instId);
      const instExceptions = exceptions.filter((e) => e.instructor_id === instId && e.exception_date === dateStr);
      const instBlocked = blocked.filter((b) => b.instructor_id === instId && b.start_datetime <= `${dateStr}T23:59:59` && b.end_datetime >= `${dateStr}T00:00:00`);
      const instBookings = bookings.filter((b) => b.instructor_id === instId && b.start_datetime.startsWith(dateStr));

      const slots = computeAvailableSlots({
        date: dateStr,
        rules: instRules.map((r) => ({
          day_of_week: r.day_of_week as Parameters<typeof computeAvailableSlots>[0]['rules'][number]['day_of_week'],
          start_time: r.start_time,
          end_time: r.end_time,
          is_active: r.is_active,
        })),
        exceptions: instExceptions.map((e) => ({
          exception_date: e.exception_date,
          is_available: e.is_available,
          start_time: e.start_time,
          end_time: e.end_time,
        })),
        blockedTimes: instBlocked.map((b) => ({
          start_datetime: b.start_datetime,
          end_datetime: b.end_datetime,
        })),
        existingBookings: instBookings.map((b) => ({
          start_datetime: b.start_datetime,
          end_datetime: b.end_datetime,
        })),
        lessonDurationMinutes: safeDuration,
      });

      if (slots.length > 0) {
        hasSlot = true;
        break;
      }
    }
    result[dateStr] = hasSlot;
  }

  return result;
}

/**
 * Get available slots across multiple instructors for a date.
 * Returns slots with instructor info attached.
 */
export async function getMultiInstructorSlotsAction(
  instructorIds: string[],
  date: string,
  durationMinutes: number
): Promise<Array<AvailableSlot & { instructor_id: string; instructor_name: string }>> {
  if (!instructorIds.length || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const safeDuration = Math.max(15, Math.min(480, Math.round(durationMinutes || 60)));

  const data = await getTenantData();
  if (!data) return [];

  const client = getAdminClient();
  const orgId = data.organization.id;

  // Fetch instructor names
  const { data: instructorData } = await client
    .from('instructors')
    .select('id, display_name')
    .eq('organization_id', orgId)
    .in('id', instructorIds);
  const instructorMap = new Map((instructorData ?? []).map((i: { id: string; display_name: string }) => [i.id, i.display_name]));

  const allSlots: Array<AvailableSlot & { instructor_id: string; instructor_name: string }> = [];

  for (const instId of instructorIds) {
    const slots = await getAvailableSlotsAction(instId, date, safeDuration);
    for (const slot of slots) {
      allSlots.push({
        ...slot,
        instructor_id: instId,
        instructor_name: instructorMap.get(instId) ?? 'Instructor',
      });
    }
  }

  // Sort by start time
  allSlots.sort((a, b) => a.start.localeCompare(b.start));
  return allSlots;
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    // Get the lesson type and instructor info for price + email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lessonTypeRes, instructorNameRes] = await Promise.all([
      (adminClient.from('lesson_types') as any)
        .select('price_cents, name')
        .eq('id', lessonTypeId)
        .eq('organization_id', orgId)
        .single(),
      (adminClient.from('instructors') as any)
        .select('display_name')
        .eq('id', instructorId)
        .eq('organization_id', orgId)
        .single(),
    ]);

    const lessonType = lessonTypeRes.data as { price_cents: number; name: string } | null;
    const instructorData = instructorNameRes.data as { display_name: string } | null;
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
      logger.error('Booking insert error', insertError);
      return { success: false, error: 'Failed to submit booking. Please try again.' };
    }

    // Send confirmation email to the visitor (fire-and-forget)
    // Use admin client — public visitors are unauthenticated so
    // a cookie-based client would have no session and RLS queries
    // inside the notification helper would silently fail.
    notifyPublicBookingReceived(
      adminClient,
      orgId,
      customerEmail,
      customerName,
      instructorData?.display_name ?? 'Your instructor',
      lessonType?.name ?? 'Driving Lesson',
      slotStart,
      slotEnd,
      data.organization.name
    );

    revalidatePath('/book');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return { success: false, error: message };
  }
}
