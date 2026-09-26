// ==================================================
// Bookings Management Page
// ==================================================
// Lists all bookings with status filters, instructor filter,
// date range, status transition actions, and booking creation.

import { getDashboardContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { isOrgAdminRole } from '@/permissions/roles';
import type { Booking, Instructor, Student, LessonType, Vehicle } from '@/types/database';
import type { Metadata } from 'next';
import { BookingActions } from './booking-actions-client';
import { CreateBookingForm } from './create-booking-form';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Bookings',
};

interface BookingsPageProps {
  searchParams: Promise<{
    status?: string;
    instructor?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const { auth, organization, settings } = await getDashboardContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const params = await searchParams;

  const isAdmin = isOrgAdminRole(auth.role);

  // Build query
  let query = client
    .from('bookings')
    .select('*')
    .eq('organization_id', orgId)
    .order('start_datetime', { ascending: false })
    .limit(50);

  // Status filter
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  // Instructor filter (admins can filter by instructor; instructors only see own)
  if (!isAdmin) {
    const { data: instData } = await client
      .from('instructors')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', auth.userId)
      .maybeSingle();

    if (instData) {
      query = query.eq('instructor_id', instData.id);
    } else {
      query = query.eq('instructor_id', '00000000-0000-0000-0000-000000000000');
    }
  } else if (params.instructor) {
    query = query.eq('instructor_id', params.instructor);
  }

  // Date range filter
  if (params.from) {
    query = query.gte('start_datetime', params.from);
  }
  if (params.to) {
    // Append end-of-day time so bookings ON the "to" date are included
    const nextDay = new Date(params.to + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    query = query.lt('start_datetime', nextDay.toISOString().split('T')[0] + 'T00:00:00');
  }

  const [bookingsRes, instructorsRes, studentsRes, lessonTypesRes, vehiclesRes] = await Promise.all([
    query,
    client.from('instructors').select('*').eq('organization_id', orgId).eq('is_active', true).order('display_name'),
    client.from('students').select('*').eq('organization_id', orgId).eq('is_active', true).order('display_name'),
    client.from('lesson_types').select('*').eq('organization_id', orgId).eq('status', 'active').order('name'),
    client.from('vehicles').select('*').eq('organization_id', orgId).eq('status', 'active').order('name'),
  ]);

  const bookings = (bookingsRes.data ?? []) as Booking[];
  const instructors = (instructorsRes.data ?? []) as Instructor[];
  const students = (studentsRes.data ?? []) as Student[];
  const lessonTypes = (lessonTypesRes.data ?? []) as LessonType[];
  const vehicles = (vehiclesRes.data ?? []) as Vehicle[];

  // Create lookup maps
  const instructorMap = new Map(instructors.map((i) => [i.id, i]));
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const lessonTypeMap = new Map(lessonTypes.map((lt) => [lt.id, lt]));

  const statusColors: Record<string, string> = {
    new_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    contacted: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    no_show: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {bookings.length >= 50
              ? 'Showing latest 50 bookings — use filters to narrow results'
              : `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        {isAdmin && (
          <CreateBookingForm
            instructors={instructors.map((i) => ({ id: i.id, display_name: i.display_name }))}
            students={students.map((s) => ({ id: s.id, display_name: s.display_name }))}
            lessonTypes={lessonTypes.map((lt) => ({ id: lt.id, name: lt.name, price_cents: lt.price_cents, duration_minutes: lt.duration_minutes }))}
            vehicles={vehicles.map((v) => ({ id: v.id, name: v.name }))}
            primaryColor={primaryColor}
            currency={organization.currency}
          />
        )}
      </div>

      {/* Filter bar */}
      <form className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3" method="GET">
        <select
          name="status"
          defaultValue={params.status ?? 'all'}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All statuses</option>
          <option value="new_request">New Request</option>
          <option value="contacted">Contacted</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
          <option value="no_show">No Show</option>
        </select>

        {isAdmin && (
          <select
            name="instructor"
            defaultValue={params.instructor ?? ''}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          >
            <option value="">All instructors</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.display_name}
              </option>
            ))}
          </select>
        )}

        <input
          type="date"
          name="from"
          defaultValue={params.from ?? ''}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
        />
        <input
          type="date"
          name="to"
          defaultValue={params.to ?? ''}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
        />

        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: primaryColor }}
        >
          Filter
        </button>
        {(params.status || params.instructor || params.from || params.to) && (
          <a
            href="/dashboard/bookings"
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Clear
          </a>
        )}
      </form>

      {/* Bookings list */}
      {bookings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-medium text-gray-900 dark:text-white">No bookings found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {params.status || params.instructor || params.from || params.to
              ? 'Try adjusting your filters to see more results.'
              : 'Create your first booking to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const inst = instructorMap.get(booking.instructor_id);
            const student = booking.student_id ? studentMap.get(booking.student_id) : undefined;
            const lt = lessonTypeMap.get(booking.lesson_type_id);
            const start = new Date(booking.start_datetime);
            const end = new Date(booking.end_datetime);

            let studentName = student?.display_name ?? null;
            if (!studentName && booking.notes) {
              const match = booking.notes.match(/^Public booking by:\s*(.+)/m);
              if (match) studentName = match[1].trim();
            }

            const isToday = start.toDateString() === new Date().toDateString();

            return (
              <div
                key={booking.id}
                className={`rounded-lg border bg-white dark:bg-gray-800 p-4 space-y-3 ${
                  isToday
                    ? 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-200 dark:ring-blue-800'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start gap-4">
                  {/* Date/Time */}
                  <div className="shrink-0 w-24">
                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {isToday && (
                        <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                          TODAY
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {studentName ?? 'Walk-in'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {inst?.display_name ?? 'Unknown'} · {lt?.name ?? 'Unknown lesson'}
                    </p>
                    {booking.pickup_address && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        📍 {booking.pickup_address}
                      </p>
                    )}
                  </div>

                  {/* Status & Price */}
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[booking.status] ?? ''}`}
                    >
                      {booking.status.replaceAll('_', ' ')}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {formatPrice(booking.price_cents ?? 0, organization.currency)}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                {isAdmin && (
                  <BookingActions
                    bookingId={booking.id}
                    currentStatus={booking.status}
                    confirmationSentAt={booking.confirmation_email_sent_at}
                    bookingReference={booking.booking_reference}
                    studentName={student?.display_name}
                    lessonType={lt?.name}
                    date={start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    time={`${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
