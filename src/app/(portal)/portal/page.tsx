// ==================================================
// Student Portal — Dashboard
// ==================================================
// Shows student's upcoming bookings, progress summary,
// package balance, and quick actions.

import Link from 'next/link';
import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import type { Booking, Instructor, StudentPackagePurchase } from '@/types/database';

export default async function PortalDashboardPage() {
  const { auth, student, settings } = await getPortalContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const now = new Date();

  const [upcomingRes, packagesRes, completedRes] = await Promise.all([
    // Upcoming bookings
    client
      .from('bookings')
      .select('*')
      .eq('organization_id', orgId)
      .eq('student_id', student.id)
      .gte('start_datetime', now.toISOString())
      .not('status', 'in', '("cancelled","rejected")')
      .order('start_datetime')
      .limit(3),
    // Active packages
    client
      .from('student_package_purchases')
      .select('*')
      .eq('organization_id', orgId)
      .eq('student_id', student.id)
      .eq('status', 'active'),
    // Completed lessons count
    client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('student_id', student.id)
      .eq('status', 'completed'),
  ]);

  const upcomingBookings = (upcomingRes.data ?? []) as Booking[];
  const activePackages = (packagesRes.data ?? []) as StudentPackagePurchase[];
  const completedCount = completedRes.count ?? 0;

  // Get instructors for upcoming bookings
  const instructorIds = [...new Set(upcomingBookings.map((b) => b.instructor_id))];
  let instructors: Instructor[] = [];
  if (instructorIds.length > 0) {
    const { data } = await client
      .from('instructors')
      .select('*')
      .in('id', instructorIds);
    instructors = (data ?? []) as Instructor[];
  }
  const instructorMap = new Map(instructors.map((i) => [i.id, i]));

  // Package balance
  const totalLessonsRemaining = activePackages.reduce(
    (sum, p) => sum + (p.lessons_total - p.lessons_used),
    0
  );

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome, {student.display_name.split(' ')[0]}! 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s your driving journey at a glance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: primaryColor }}>
            {completedCount}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lessons Done</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: primaryColor }}>
            {upcomingBookings.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upcoming</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: primaryColor }}>
            {totalLessonsRemaining}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Package Balance</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/book"
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow"
        >
          <span className="text-2xl">📅</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Book a Lesson</span>
        </Link>
        <Link
          href="/portal/progress"
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow"
        >
          <span className="text-2xl">📈</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">View Progress</span>
        </Link>
        {completedCount > 0 && (
          <Link
            href="/portal/reviews"
            className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">⭐</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Leave a Review</span>
          </Link>
        )}
        <Link
          href="/portal/profile"
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow"
        >
          <span className="text-2xl">👤</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">My Profile</span>
        </Link>
      </div>

      {/* Next Booking */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Lessons
          </h2>
          <Link
            href="/portal/bookings"
            className="text-sm font-medium hover:underline"
            style={{ color: primaryColor }}
          >
            View all →
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No upcoming lessons.</p>
            <Link
              href="/book"
              className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Book Now
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((booking) => {
              const inst = instructorMap.get(booking.instructor_id);
              const start = new Date(booking.start_datetime);

              return (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                >
                  <div className="text-center shrink-0">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {start.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {start.getDate()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {start.toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {inst?.display_name ?? 'Instructor TBD'}
                    </p>
                    {booking.pickup_address && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        📍 {booking.pickup_address}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    {booking.status.replaceAll('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
