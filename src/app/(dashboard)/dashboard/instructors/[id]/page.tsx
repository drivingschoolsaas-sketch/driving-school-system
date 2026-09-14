// ==================================================
// Instructor Detail Page
// ==================================================
// Shows instructor profile, upcoming schedule, assigned
// students, performance stats, and reviews.
// Spec: Section 45 (Admin Calendar — Instructor View)
// and Section 46 (Today Mode).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import type {
  Instructor,
  Booking,
  LessonType,
  Review,
} from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instructor Details',
};

const STATUS_COLORS: Record<string, string> = {
  new_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  contacted: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  no_show: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InstructorDetailPage({ params }: PageProps) {
  const { id: instructorId } = await params;
  const { auth, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.INSTRUCTOR_VIEW);
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  // Fetch instructor
  const { data: instData, error: instError } = await client
    .from('instructors')
    .select('*')
    .eq('id', instructorId)
    .eq('organization_id', orgId)
    .single();

  if (instError || !instData) notFound();
  const instructor = instData as Instructor;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

  // Parallel data fetch
  const [upcomingRes, recentRes, allBookingsRes, lessonTypesRes, reviewsRes] = await Promise.all([
    // Upcoming bookings (next 7 days)
    client
      .from('bookings')
      .select('*')
      .eq('organization_id', orgId)
      .eq('instructor_id', instructorId)
      .gte('start_datetime', todayStart)
      .lt('start_datetime', weekEnd)
      .not('status', 'in', '("cancelled","rejected")')
      .order('start_datetime'),
    // Recent completed bookings
    client
      .from('bookings')
      .select('*')
      .eq('organization_id', orgId)
      .eq('instructor_id', instructorId)
      .eq('status', 'completed')
      .order('start_datetime', { ascending: false })
      .limit(20),
    // All-time stats
    client
      .from('bookings')
      .select('id, status, price_cents, student_id')
      .eq('organization_id', orgId)
      .eq('instructor_id', instructorId),
    // Lesson types
    client
      .from('lesson_types')
      .select('id, name')
      .eq('organization_id', orgId),
    // Reviews for this instructor
    client
      .from('reviews')
      .select('*')
      .eq('organization_id', orgId)
      .eq('instructor_id', instructorId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const upcomingBookings = (upcomingRes.data ?? []) as Booking[];
  const recentBookings = (recentRes.data ?? []) as Booking[];
  const allBookings = (allBookingsRes.data ?? []) as Pick<Booking, 'id' | 'status' | 'price_cents' | 'student_id'>[];
  const lessonTypes = (lessonTypesRes.data ?? []) as LessonType[];
  const reviews = (reviewsRes.data ?? []) as Review[];

  const ltMap = new Map(lessonTypes.map((lt) => [lt.id, lt]));

  // Compute stats
  const completedCount = allBookings.filter((b) => b.status === 'completed').length;
  const noShowCount = allBookings.filter((b) => b.status === 'no_show').length;
  const cancelledCount = allBookings.filter((b) => b.status === 'cancelled').length;
  const totalRevenueCents = allBookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.price_cents ?? 0), 0);
  const uniqueStudentIds = new Set(allBookings.map((b) => b.student_id).filter(Boolean));
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  // Get student names for upcoming bookings
  const upcomingStudentIds = [...new Set(upcomingBookings.map((b) => b.student_id).filter((id): id is string => id !== null))];
  let studentMap = new Map<string, string>();
  if (upcomingStudentIds.length > 0) {
    const { data: students } = await client
      .from('students')
      .select('id, display_name')
      .eq('organization_id', orgId)
      .in('id', upcomingStudentIds);
    studentMap = new Map((students ?? []).map((s: { id: string; display_name: string }) => [s.id, s.display_name]));
  }

  // Group upcoming by date
  const upcomingByDate = new Map<string, Booking[]>();
  for (const b of upcomingBookings) {
    const dateKey = new Date(b.start_datetime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!upcomingByDate.has(dateKey)) upcomingByDate.set(dateKey, []);
    upcomingByDate.get(dateKey)!.push(b);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard/instructors" className="hover:underline">
          Instructors
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900 dark:text-white">{instructor.display_name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        {instructor.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
          <img
            src={instructor.photo_url}
            alt={instructor.display_name}
            className="h-16 w-16 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            {instructor.display_name.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {instructor.display_name}
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            {instructor.email && <span>✉️ {instructor.email}</span>}
            {instructor.phone && (
              <a href={`tel:${instructor.phone}`} className="hover:underline" style={{ color: primaryColor }}>
                📞 {instructor.phone}
              </a>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              {instructor.transmission_type}
            </span>
            <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
              {instructor.default_lesson_duration} min default
            </span>
            {instructor.max_daily_lessons && (
              <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                Max {instructor.max_daily_lessons} lessons/day
              </span>
            )}
            {instructor.license_number && (
              <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                🪪 {instructor.license_number}
                {instructor.license_expiry && (
                  <> · exp {new Date(instructor.license_expiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>
                )}
              </span>
            )}
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            instructor.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {instructor.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Bio */}
      {instructor.bio && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <p className="text-sm text-gray-700 dark:text-gray-300">{instructor.bio}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard icon="✅" label="Completed" value={completedCount.toString()} primaryColor={primaryColor} />
        <StatCard icon="👥" label="Students" value={uniqueStudentIds.size.toString()} primaryColor={primaryColor} />
        <StatCard icon="💰" label="Revenue" value={`$${(totalRevenueCents / 100).toFixed(0)}`} primaryColor={primaryColor} />
        <StatCard
          icon="⭐"
          label="Rating"
          value={avgRating ? `${avgRating}/5` : '—'}
          primaryColor={primaryColor}
        />
        <StatCard
          icon="📊"
          label="Reliability"
          value={
            completedCount + noShowCount + cancelledCount > 0
              ? `${Math.round((completedCount / (completedCount + noShowCount + cancelledCount)) * 100)}%`
              : '—'
          }
          primaryColor={primaryColor}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Schedule */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            📅 Schedule (Next 7 Days)
          </h2>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming lessons.</p>
          ) : (
            <div className="space-y-4">
              {Array.from(upcomingByDate.entries()).map(([dateLabel, dayBookings]) => (
                <div key={dateLabel}>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    {dateLabel}
                  </p>
                  <div className="space-y-2">
                    {dayBookings.map((b) => {
                      const start = new Date(b.start_datetime);
                      const end = new Date(b.end_datetime);
                      const studentName = (b.student_id ? studentMap.get(b.student_id) : null) ?? 'Walk-in';
                      const lt = ltMap.get(b.lesson_type_id);

                      return (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-gray-700 p-3"
                        >
                          <div className="text-center shrink-0 w-14">
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/dashboard/students/${b.student_id}`}
                              className="text-sm font-medium hover:underline"
                              style={{ color: primaryColor }}
                            >
                              {studentName}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {lt?.name ?? 'Lesson'}
                              {b.pickup_address && ` · 📍 ${b.pickup_address}`}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                              STATUS_COLORS[b.status] ?? ''
                            }`}
                          >
                            {b.status.replaceAll('_', ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Reviews */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            ⭐ Recent Reviews
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No approved reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border border-gray-100 dark:border-gray-700 p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm" aria-label={`${review.rating} stars`}>
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {review.title && (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {review.title}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                    {review.body}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                    — {review.is_anonymous ? 'Anonymous' : review.reviewer_name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Completed */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Recent Completed Lessons ({recentBookings.length})
        </h2>
        {recentBookings.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No completed lessons yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Time</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentBookings.map((b) => {
                  const start = new Date(b.start_datetime);
                  const lt = ltMap.get(b.lesson_type_id);

                  return (
                    <tr key={b.id} className="text-gray-700 dark:text-gray-300">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">
                        {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-xs">
                        {lt?.name ?? '—'}
                      </td>
                      <td className="py-2 whitespace-nowrap text-xs text-right font-medium">
                        ${(b.price_cents / 100).toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  primaryColor,
}: {
  icon: string;
  label: string;
  value: string;
  primaryColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-center">
      <span className="text-lg">{icon}</span>
      <p className="mt-1 text-xl font-bold" style={{ color: primaryColor }}>
        {value}
      </p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
