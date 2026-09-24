// ==================================================
// Waitlist Service
// ==================================================
// Manages cancellation waitlist entries. Students
// register interest for specific days/times/instructors.
// When a cancellation opens a matching slot, eligible
// students can be notified.
//
// IMPORTANT: Never auto-book without the school's
// configured policy. Only notify eligible students.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { WaitlistEntry } from '@/types/database';
import { logger } from '@/lib/logging';

/**
 * Get waitlist entries for an organization.
 */
export async function getWaitlistEntries(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: { status?: string; studentId?: string }
): Promise<WaitlistEntry[]> {
  let query = client
    .from('waitlist_entries')
    .select('*, students(display_name)')
    .eq('organization_id', context.organizationId)
    .order('priority', { ascending: false })
    .order('created_at');

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.studentId) {
    query = query.eq('student_id', options.studentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WaitlistEntry[];
}

/**
 * Get a single waitlist entry.
 */
export async function getWaitlistEntry(
  client: SupabaseClient,
  context: AuthorizedContext,
  entryId: string
): Promise<WaitlistEntry | null> {
  const { data, error } = await client
    .from('waitlist_entries')
    .select('*')
    .eq('id', entryId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as WaitlistEntry | null;
}

/**
 * Create a waitlist entry for a student.
 */
export async function createWaitlistEntry(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: {
    student_id: string;
    preferred_days?: string[];
    preferred_time_start?: string;
    preferred_time_end?: string;
    preferred_instructor_id?: string;
    lesson_type_id?: string;
    service_area_id?: string;
    notes?: string;
    expires_at?: string;
  }
): Promise<WaitlistEntry> {
  const { data, error } = await client
    .from('waitlist_entries')
    .insert({
      organization_id: context.organizationId,
      student_id: input.student_id,
      preferred_days: input.preferred_days ?? [],
      preferred_time_start: input.preferred_time_start ?? null,
      preferred_time_end: input.preferred_time_end ?? null,
      preferred_instructor_id: input.preferred_instructor_id ?? null,
      lesson_type_id: input.lesson_type_id ?? null,
      service_area_id: input.service_area_id ?? null,
      notes: input.notes ?? null,
      expires_at: input.expires_at ?? null,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) throw error;

  logger.info('Waitlist entry created', {
    entryId: data.id,
    organizationId: context.organizationId,
    studentId: input.student_id,
  });

  return data as WaitlistEntry;
}

/**
 * Cancel a waitlist entry.
 */
export async function cancelWaitlistEntry(
  client: SupabaseClient,
  context: AuthorizedContext,
  entryId: string
): Promise<WaitlistEntry> {
  const { data, error } = await client
    .from('waitlist_entries')
    .update({ status: 'cancelled' })
    .eq('id', entryId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) throw error;

  logger.info('Waitlist entry cancelled', {
    entryId,
    organizationId: context.organizationId,
  });

  return data as WaitlistEntry;
}

/**
 * Mark a waitlist entry as notified.
 */
export async function markWaitlistNotified(
  client: SupabaseClient,
  context: AuthorizedContext,
  entryId: string
): Promise<WaitlistEntry> {
  const { data, error } = await client
    .from('waitlist_entries')
    .update({
      status: 'notified',
      notified_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) throw error;
  return data as WaitlistEntry;
}

/**
 * Mark a waitlist entry as booked (student accepted the offer).
 */
export async function markWaitlistBooked(
  client: SupabaseClient,
  context: AuthorizedContext,
  entryId: string,
  bookingId: string
): Promise<WaitlistEntry> {
  const { data, error } = await client
    .from('waitlist_entries')
    .update({
      status: 'booked',
      booked_booking_id: bookingId,
    })
    .eq('id', entryId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) throw error;

  logger.info('Waitlist entry converted to booking', {
    entryId,
    bookingId,
    organizationId: context.organizationId,
  });

  return data as WaitlistEntry;
}

/**
 * Find waitlist entries that match a cancelled booking slot.
 * Returns entries sorted by priority (highest first).
 *
 * This ONLY finds matches — it does NOT auto-book.
 * The school decides what to do with the matches.
 */
export async function findMatchingWaitlistEntries(
  client: SupabaseClient,
  organizationId: string,
  slot: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    instructorId?: string;
    lessonTypeId?: string;
    serviceAreaId?: string;
  }
): Promise<WaitlistEntry[]> {
  let query = client
    .from('waitlist_entries')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'waiting')
    .order('priority', { ascending: false })
    .order('created_at');

  // Filter by preferred day (entries with empty preferred_days match any day)
  query = query.or(
    `preferred_days.cs.{${slot.dayOfWeek}},preferred_days.eq.{}`
  );

  if (slot.instructorId) {
    query = query.or(
      `preferred_instructor_id.eq.${slot.instructorId},preferred_instructor_id.is.null`
    );
  }

  if (slot.lessonTypeId) {
    query = query.or(
      `lesson_type_id.eq.${slot.lessonTypeId},lesson_type_id.is.null`
    );
  }

  if (slot.serviceAreaId) {
    query = query.or(
      `service_area_id.eq.${slot.serviceAreaId},service_area_id.is.null`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  // Post-filter by time range (entries with no time preference match any time)
  const entries = (data ?? []) as WaitlistEntry[];
  return entries.filter((entry) => {
    if (!entry.preferred_time_start || !entry.preferred_time_end) {
      return true; // No time preference = matches any time
    }
    // Check if slot time overlaps with preferred time range
    return (
      slot.startTime >= entry.preferred_time_start &&
      slot.startTime < entry.preferred_time_end
    );
  });
}

/**
 * Expire old waitlist entries past their expiry date.
 */
export async function expireWaitlistEntries(
  client: SupabaseClient,
  organizationId: string
): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('waitlist_entries')
    .update({ status: 'expired' })
    .eq('organization_id', organizationId)
    .eq('status', 'waiting')
    .lte('expires_at', now)
    .not('expires_at', 'is', null)
    .select('id');

  if (error) throw error;

  const count = data?.length ?? 0;
  if (count > 0) {
    logger.info('Waitlist entries expired', {
      organizationId,
      count,
    });
  }

  return count;
}
