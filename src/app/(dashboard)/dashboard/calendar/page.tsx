// ==================================================
// Admin Calendar Page
// ==================================================
// Day/week view of bookings with status colors.
// Spec: Section 45 — ADMIN CALENDAR.
// Note: Drag/drop rescheduling is a later-phase feature.

import Link from 'next/link';
import { getDashboardContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { isOrgAdminRole } from '@/permissions/roles';
import type { Booking, Instructor } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Calendar',
};

interface CalendarPageProps {
  searchParams: Promise<{
    view?: 'day' | 'week';
    date?: string;
    instructor?: string;
  }>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new_request: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-l-yellow-500' },
  contacted: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-200', border: 'border-l-orange-500' },
  confirmed: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', border: 'border-l-green-500' },
  completed: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', border: 'border-l-blue-500' },
  cancelled: { bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-500 dark:text-gray-400', border: 'border-l-gray-400' },
  rejected: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', border: 'border-l-red-500' },
  no_show: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', border: 'border-l-red-500' },
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { auth, settings } = await getDashboardContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const params = await searchParams;

  const isAdmin = isOrgAdminRole(auth.role);
  const view = params.view ?? 'day';

  // Parse date (fallback to today if invalid)
  const parsedDate = params.date ? new Date(params.date) : new Date();
  const baseDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const dayStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  let rangeStart: Date;
  let rangeEnd: Date;
  if (view === 'week') {
    const dayOfWeek = dayStart.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    rangeStart = new Date(dayStart);
    rangeStart.setDate(dayStart.getDate() + mondayOffset);
    rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeStart.getDate() + 7);
  } else {
    rangeStart = dayStart;
    rangeEnd = new Date(dayStart);
    rangeEnd.setDate(dayStart.getDate() + 1);
  }

  // Build query
  let query = client
    .from('bookings')
    .select('*')
    .eq('organization_id', orgId)
    .gte('start_datetime', rangeStart.toISOString())
    .lt('start_datetime', rangeEnd.toISOString())
    .order('start_datetime');

  // Instructor filter
  if (!isAdmin) {
    const { data: instData } = await client
      .from('instructors')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (instData) {
      query = query.eq('instructor_id', instData.id);
    }
  } else if (params.instructor) {
    query = query.eq('instructor_id', params.instructor);
  }

  const [bookingsRes, instructorsRes] = await Promise.all([
    query,
    client.from('instructors').select('*').eq('organization_id', orgId).eq('is_active', true).order('display_name'),
  ]);

  const bookings = (bookingsRes.data ?? []) as Booking[];
  const instructors = (instructorsRes.data ?? []) as Instructor[];
  const instructorMap = new Map(instructors.map((i) => [i.id, i]));

  // Navigation dates
  const prevDate = new Date(dayStart);
  prevDate.setDate(dayStart.getDate() - (view === 'week' ? 7 : 1));
  const nextDate = new Date(dayStart);
  nextDate.setDate(dayStart.getDate() + (view === 'week' ? 7 : 1));
  const todayStr = new Date().toISOString().split('T')[0];

  const formatDateParam = (d: Date) => d.toISOString().split('T')[0];

  // Group bookings by day for week view
  const dayGroups: Map<string, Booking[]> = new Map();
  if (view === 'week') {
    for (let i = 0; i < 7; i++) {
      const d = new Date(rangeStart);
      d.setDate(rangeStart.getDate() + i);
      dayGroups.set(formatDateParam(d), []);
    }
  }
  for (const b of bookings) {
    const key = new Date(b.start_datetime).toISOString().split('T')[0];
    const group = dayGroups.get(key);
    if (group) group.push(b);
    else dayGroups.set(key, [b]);
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {view === 'day'
              ? dayStart.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              : `Week of ${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(rangeEnd.getTime() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <Link
              href={`/dashboard/calendar?view=day&date=${formatDateParam(dayStart)}${params.instructor ? `&instructor=${params.instructor}` : ''}`}
              className={`px-3 py-1.5 text-xs font-medium ${view === 'day' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
            >
              Day
            </Link>
            <Link
              href={`/dashboard/calendar?view=week&date=${formatDateParam(dayStart)}${params.instructor ? `&instructor=${params.instructor}` : ''}`}
              className={`px-3 py-1.5 text-xs font-medium ${view === 'week' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
            >
              Week
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/calendar?view=${view}&date=${formatDateParam(prevDate)}${params.instructor ? `&instructor=${params.instructor}` : ''}`}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              ←
            </Link>
            <Link
              href={`/dashboard/calendar?view=${view}&date=${todayStr}${params.instructor ? `&instructor=${params.instructor}` : ''}`}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Today
            </Link>
            <Link
              href={`/dashboard/calendar?view=${view}&date=${formatDateParam(nextDate)}${params.instructor ? `&instructor=${params.instructor}` : ''}`}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              →
            </Link>
          </div>
        </div>
      </div>

      {/* Instructor filter (admin only) */}
      {isAdmin && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link
            href={`/dashboard/calendar?view=${view}&date=${formatDateParam(dayStart)}`}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              !params.instructor
                ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All
          </Link>
          {instructors.map((inst) => (
            <Link
              key={inst.id}
              href={`/dashboard/calendar?view=${view}&date=${formatDateParam(dayStart)}&instructor=${inst.id}`}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                params.instructor === inst.id
                  ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {inst.display_name}
            </Link>
          ))}
        </div>
      )}

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-sm ${colors.bg} ${colors.border} border-l-2`} />
            <span className="text-gray-600 dark:text-gray-400 capitalize">
              {status.replaceAll('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar content */}
      {view === 'day' ? (
        <DayView bookings={bookings} instructorMap={instructorMap} />
      ) : (
        <WeekView dayGroups={dayGroups} instructorMap={instructorMap} today={todayStr} />
      )}
    </div>
  );
}

function DayView({
  bookings,
  instructorMap,
}: {
  bookings: Booking[];
  instructorMap: Map<string, Instructor>;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No bookings for this day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bookings.map((booking) => (
        <CalendarBookingCard
          key={booking.id}
          booking={booking}
          instructor={instructorMap.get(booking.instructor_id)}
        />
      ))}
    </div>
  );
}

function WeekView({
  dayGroups,
  instructorMap,
  today,
}: {
  dayGroups: Map<string, Booking[]>;
  instructorMap: Map<string, Instructor>;
  today: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
      {Array.from(dayGroups.entries()).map(([dateStr, dayBookings]) => {
        const d = new Date(dateStr + 'T00:00:00');
        const isToday = dateStr === today;

        return (
          <div
            key={dateStr}
            className={`rounded-lg border bg-white dark:bg-gray-800 p-3 min-h-[120px] ${
              isToday
                ? 'border-blue-300 dark:border-blue-600 ring-1 ring-blue-200 dark:ring-blue-700'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <p className={`text-xs font-medium mb-2 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
            </p>
            {dayBookings.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">No bookings</p>
            ) : (
              <div className="space-y-1">
                {dayBookings.map((b) => {
                  const colors = STATUS_COLORS[b.status] ?? STATUS_COLORS.confirmed;
                  const start = new Date(b.start_datetime);
                  const inst = instructorMap.get(b.instructor_id);

                  return (
                    <div
                      key={b.id}
                      className={`rounded-md px-2 py-1 border-l-2 ${colors.bg} ${colors.border}`}
                    >
                      <p className={`text-[10px] font-medium ${colors.text}`}>
                        {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                        {inst?.display_name ?? '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CalendarBookingCard({
  booking,
  instructor,
}: {
  booking: Booking;
  instructor?: Instructor;
}) {
  const colors = STATUS_COLORS[booking.status] ?? STATUS_COLORS.confirmed;
  const start = new Date(booking.start_datetime);
  const end = new Date(booking.end_datetime);

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border-l-4 p-4 ${colors.bg} ${colors.border}`}
    >
      <div className="text-center shrink-0 w-16">
        <p className={`text-sm font-bold ${colors.text}`}>
          {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${colors.text}`}>
          {instructor?.display_name ?? 'Unknown'}
        </p>
        {booking.pickup_address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            📍 {booking.pickup_address}
          </p>
        )}
      </div>
      <span className={`shrink-0 text-xs font-medium capitalize ${colors.text}`}>
        {booking.status.replaceAll('_', ' ')}
      </span>
      <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
        ${(booking.price_cents / 100).toFixed(0)}
      </span>
    </div>
  );
}
