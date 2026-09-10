// ==================================================
// Student Portal — Bookings
// ==================================================
// Shows all of the student's bookings with status tabs.

import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import type { Booking, Instructor, LessonType } from '@/types/database';
import type { Metadata } from 'next';
import { CancelBookingButton } from './cancel-button';

export const metadata: Metadata = {
  title: 'My Bookings',
};

interface BookingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PortalBookingsPage({ searchParams }: BookingsPageProps) {
  const { auth, student, settings } = await getPortalContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const params = await searchParams;

  const tab = params.tab ?? 'upcoming';
  const now = new Date().toISOString();

  let query = client
    .from('bookings')
    .select('*')
    .eq('organization_id', orgId)
    .eq('student_id', student.id);

  if (tab === 'upcoming') {
    query = query
      .gte('start_datetime', now)
      .not('status', 'in', '("cancelled","rejected")')
      .order('start_datetime', { ascending: true });
  } else if (tab === 'past') {
    query = query
      .lt('start_datetime', now)
      .order('start_datetime', { ascending: false });
  } else {
    // 'all'
    query = query.order('start_datetime', { ascending: false });
  }

  const [bookingsRes, instructorsRes, lessonTypesRes] = await Promise.all([
    query.limit(50),
    client.from('instructors').select('*').eq('organization_id', orgId).eq('is_active', true),
    client.from('lesson_types').select('*').eq('organization_id', orgId),
  ]);

  const bookings = (bookingsRes.data ?? []) as Booking[];
  const instructors = (instructorsRes.data ?? []) as Instructor[];
  const lessonTypes = (lessonTypesRes.data ?? []) as LessonType[];
  const instructorMap = new Map(instructors.map((i) => [i.id, i]));
  const ltMap = new Map(lessonTypes.map((lt) => [lt.id, lt]));

  const tabs = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'all', label: 'All' },
  ];

  const statusColors: Record<string, string> = {
    new_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    contacted: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    no_show: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={`/portal/bookings?tab=${t.key}`}
            className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Bookings list */}
      {bookings.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {tab === 'upcoming' ? 'No upcoming bookings.' : 'No bookings found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const inst = instructorMap.get(booking.instructor_id);
            const lt = ltMap.get(booking.lesson_type_id);
            const start = new Date(booking.start_datetime);
            const end = new Date(booking.end_datetime);

            return (
              <div
                key={booking.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {start.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[booking.status] ?? ''}`}
                  >
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {lt && <span>📖 {lt.name}</span>}
                  {inst && <span>🚗 {inst.display_name}</span>}
                  {booking.pickup_address && (
                    <span className="truncate max-w-[200px]">📍 {booking.pickup_address}</span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  {['new_request', 'contacted', 'confirmed'].includes(booking.status) &&
                    new Date(booking.start_datetime) > new Date() ? (
                    <CancelBookingButton bookingId={booking.id} primaryColor={primaryColor} />
                  ) : (
                    <span />
                  )}
                  <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                    ${(booking.price_cents / 100).toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
