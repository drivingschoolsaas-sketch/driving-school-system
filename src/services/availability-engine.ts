// ==================================================
// Availability Engine
// ==================================================
// Pure-logic module that computes available time slots
// for an instructor on a given date. No database calls —
// all data is passed in, making it fully testable.
//
// The spec says: "Generate availability from availability
// rules and existing constraints." — NOT pre-created slots.

import type { DayOfWeek } from '@/config/constants';
import { DAYS_OF_WEEK_ORDERED } from '@/config/constants';

// --------------------------------------------------
// Types
// --------------------------------------------------

/** A time range within a single day (HH:MM strings). */
export interface TimeRange {
  start: string; // HH:MM
  end: string; // HH:MM
}

/** An available time slot offered for booking. */
export interface AvailableSlot {
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
}

/** Recurring weekly rule for one day. */
export interface RuleInput {
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM or HH:MM:SS
  end_time: string; // HH:MM or HH:MM:SS
  is_active: boolean;
}

/** Date-specific override. */
export interface ExceptionInput {
  exception_date: string; // YYYY-MM-DD
  is_available: boolean;
  start_time: string | null; // HH:MM or HH:MM:SS
  end_time: string | null; // HH:MM or HH:MM:SS
}

/** A blocked time period (absolute datetimes). */
export interface BlockedTimeInput {
  start_datetime: string; // ISO 8601
  end_datetime: string; // ISO 8601
}

/** An existing booking (absolute datetimes). */
export interface BookingInput {
  start_datetime: string; // ISO 8601
  end_datetime: string; // ISO 8601
}

/** Parameters for computing available slots. */
export interface AvailabilityQuery {
  date: string; // YYYY-MM-DD
  rules: RuleInput[];
  exceptions: ExceptionInput[];
  blockedTimes: BlockedTimeInput[];
  existingBookings: BookingInput[];
  lessonDurationMinutes: number;
  travelBufferMinutes?: number;
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

/** Normalize HH:MM:SS or HH:MM to minutes since midnight. */
export function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/** Convert minutes since midnight back to HH:MM. */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Get the DayOfWeek for a YYYY-MM-DD date string. */
export function dateToDayOfWeek(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + 'T00:00:00');
  // JS getDay(): 0=Sun, 1=Mon, ...6=Sat
  const jsDay = date.getDay();
  // Convert to our enum order: Mon=0, Tue=1, ...Sun=6
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return DAYS_OF_WEEK_ORDERED[idx];
}

/**
 * Subtract a list of blocked intervals from a list of available intervals.
 * All values are minutes since midnight.
 * Returns the remaining available intervals.
 */
export function subtractIntervals(
  available: Array<[number, number]>,
  blocked: Array<[number, number]>
): Array<[number, number]> {
  let result = [...available];

  for (const [bStart, bEnd] of blocked) {
    const next: Array<[number, number]> = [];
    for (const [aStart, aEnd] of result) {
      // No overlap
      if (bEnd <= aStart || bStart >= aEnd) {
        next.push([aStart, aEnd]);
        continue;
      }
      // Left remainder
      if (bStart > aStart) {
        next.push([aStart, bStart]);
      }
      // Right remainder
      if (bEnd < aEnd) {
        next.push([bEnd, aEnd]);
      }
    }
    result = next;
  }

  return result;
}

// --------------------------------------------------
// Main Engine
// --------------------------------------------------

/**
 * Compute available time slots for an instructor on a specific date.
 *
 * Algorithm:
 * 1. Determine the day's working hours from rules or exception override.
 * 2. Subtract blocked times.
 * 3. Subtract existing bookings (+ travel buffer).
 * 4. Generate bookable lesson-duration slots from remaining windows.
 */
export function computeAvailableSlots(query: AvailabilityQuery): AvailableSlot[] {
  const {
    date,
    rules,
    exceptions,
    blockedTimes,
    existingBookings,
    lessonDurationMinutes,
    travelBufferMinutes = 0,
  } = query;

  if (lessonDurationMinutes <= 0) return [];

  // 1. Determine base working hours
  const dayOfWeek = dateToDayOfWeek(date);
  const workingWindows = getWorkingWindows(date, dayOfWeek, rules, exceptions);

  if (workingWindows.length === 0) return [];

  // 2. Build blocked intervals in minutes-since-midnight
  const blockedIntervals = getBlockedIntervals(date, blockedTimes);

  // 3. Build booking intervals (with travel buffer)
  const bookingIntervals = getBookingIntervals(date, existingBookings, travelBufferMinutes);

  // 4. Subtract blocked and booked from working windows
  const allBlocked = [...blockedIntervals, ...bookingIntervals];
  const freeWindows = subtractIntervals(workingWindows, allBlocked);

  // 5. Generate slots from free windows
  return generateSlots(date, freeWindows, lessonDurationMinutes);
}

/**
 * Get available working windows for a date, considering rules and exceptions.
 * Returns intervals as [startMinutes, endMinutes] pairs.
 */
function getWorkingWindows(
  date: string,
  dayOfWeek: DayOfWeek,
  rules: RuleInput[],
  exceptions: ExceptionInput[]
): Array<[number, number]> {
  // Check for an exception on this specific date
  const exception = exceptions.find((e) => e.exception_date === date);

  if (exception) {
    if (!exception.is_available) {
      // Day off — no availability
      return [];
    }
    // Override hours
    if (exception.start_time && exception.end_time) {
      return [[timeToMinutes(exception.start_time), timeToMinutes(exception.end_time)]];
    }
    return [];
  }

  // Fall back to recurring rules
  const rule = rules.find((r) => r.day_of_week === dayOfWeek && r.is_active);
  if (!rule) return [];

  return [[timeToMinutes(rule.start_time), timeToMinutes(rule.end_time)]];
}

/**
 * Convert blocked time entries to minute intervals on the given date.
 */
function getBlockedIntervals(
  date: string,
  blockedTimes: BlockedTimeInput[]
): Array<[number, number]> {
  const dayStart = new Date(date + 'T00:00:00').getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const intervals: Array<[number, number]> = [];

  for (const bt of blockedTimes) {
    const btStart = new Date(bt.start_datetime).getTime();
    const btEnd = new Date(bt.end_datetime).getTime();

    // Skip if blocked time doesn't overlap with this day
    if (btEnd <= dayStart || btStart >= dayEnd) continue;

    const overlapStart = Math.max(btStart, dayStart);
    const overlapEnd = Math.min(btEnd, dayEnd);

    const startMin = Math.floor((overlapStart - dayStart) / 60000);
    const endMin = Math.ceil((overlapEnd - dayStart) / 60000);

    intervals.push([startMin, endMin]);
  }

  return intervals;
}

/**
 * Convert existing booking entries to minute intervals on the given date.
 * Includes travel buffer around each booking.
 */
function getBookingIntervals(
  date: string,
  bookings: BookingInput[],
  bufferMinutes: number
): Array<[number, number]> {
  const dayStart = new Date(date + 'T00:00:00').getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const intervals: Array<[number, number]> = [];

  for (const bk of bookings) {
    const bkStart = new Date(bk.start_datetime).getTime();
    const bkEnd = new Date(bk.end_datetime).getTime();

    // Skip if booking doesn't overlap with this day
    if (bkEnd <= dayStart || bkStart >= dayEnd) continue;

    // Add buffer around the booking
    const bufferedStart = bkStart - bufferMinutes * 60000;
    const bufferedEnd = bkEnd + bufferMinutes * 60000;

    const overlapStart = Math.max(bufferedStart, dayStart);
    const overlapEnd = Math.min(bufferedEnd, dayEnd);

    const startMin = Math.floor((overlapStart - dayStart) / 60000);
    const endMin = Math.ceil((overlapEnd - dayStart) / 60000);

    intervals.push([startMin, endMin]);
  }

  return intervals;
}

/**
 * Generate bookable slots from free windows.
 * Slots start on the hour or half-hour (every 30 minutes).
 */
function generateSlots(
  date: string,
  windows: Array<[number, number]>,
  durationMinutes: number
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const stepMinutes = 30; // Slot start granularity

  for (const [winStart, winEnd] of windows) {
    // Align to next step boundary
    const firstSlot = Math.ceil(winStart / stepMinutes) * stepMinutes;

    for (let start = firstSlot; start + durationMinutes <= winEnd; start += stepMinutes) {
      const startTime = minutesToTime(start);
      const endTime = minutesToTime(start + durationMinutes);

      slots.push({
        start: `${date}T${startTime}:00`,
        end: `${date}T${endTime}:00`,
      });
    }
  }

  return slots;
}
