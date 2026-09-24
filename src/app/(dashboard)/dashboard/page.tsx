// ==================================================
// Dashboard Overview — Today View
// ==================================================
// Mobile-first overview showing today's stats, next lessons,
// and quick actions. Spec: Section 44 — SCHOOL DASHBOARD.

import Link from 'next/link';
import { getDashboardContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { isOrgAdminRole } from '@/permissions/roles';
import type { Booking, Instructor } from '@/types/database';
import { SetupChecklist, type SetupStep } from './setup-checklist';
import { formatPrice } from '@/lib/format';

interface DashboardStats {
  todaysLessons: number;
  availableSlots: number;
  instructorsWorking: number;
  expectedRevenueCents: number;
}

export default async function DashboardOverviewPage() {
  const { auth, organization, settings } = await getDashboardContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  // Fetch today's data in parallel
  const [bookingsRes, instructorsRes, upcomingRes, studentsRes] = await Promise.all([
    // Today's bookings (non-cancelled)
    client
      .from('bookings')
      .select('*')
      .eq('organization_id', orgId)
      .gte('start_datetime', todayStart)
      .lt('start_datetime', todayEnd)
      .not('status', 'in', '("cancelled","rejected")'),
    // Active instructors
    client
      .from('instructors')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true),
    // Next upcoming bookings (limit 5)
    client
      .from('bookings')
      .select('*')
      .eq('organization_id', orgId)
      .gte('start_datetime', now.toISOString())
      .not('status', 'in', '("cancelled","rejected")')
      .order('start_datetime')
      .limit(5),
    // Total active students
    client
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_active', true),
  ]);

  const todaysBookings = (bookingsRes.data ?? []) as Booking[];
  const instructors = (instructorsRes.data ?? []) as Instructor[];
  const upcomingBookings = (upcomingRes.data ?? []) as Booking[];
  const totalStudents = studentsRes.count ?? 0;

  // Calculate stats
  const instructorIdsToday = new Set(todaysBookings.map((b) => b.instructor_id));
  const stats: DashboardStats = {
    todaysLessons: todaysBookings.length,
    availableSlots: 0, // Would need availability engine — simplified
    instructorsWorking: instructorIdsToday.size,
    expectedRevenueCents: todaysBookings
      .filter((b) => b.status !== 'cancelled' && b.status !== 'no_show')
      .reduce((sum, b) => sum + (b.price_cents ?? 0), 0),
  };

  const isAdmin = isOrgAdminRole(auth.role);

  // Build setup checklist for admins
  let setupSteps: SetupStep[] = [];
  if (isAdmin) {
    const [lessonTypesCount, availRulesCount, domainsCount] = await Promise.all([
      client.from('lesson_types').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      client.from('availability_rules').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      client.from('organization_domains').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    ]);

    setupSteps = [
      { label: 'Customise your branding & settings', href: '/dashboard/settings', icon: '🎨', done: !!(settings?.primary_color && settings?.hero_title) },
      { label: 'Add your instructors', href: '/dashboard/instructors', icon: '🚗', done: instructors.length > 0 },
      { label: 'Set up lesson types & prices', href: '/dashboard/lesson-types', icon: '📖', done: (lessonTypesCount.count ?? 0) > 0 },
      { label: 'Configure availability', href: '/dashboard/availability', icon: '🕐', done: (availRulesCount.count ?? 0) > 0 },
      { label: 'Add your first student', href: '/dashboard/students', icon: '🎓', done: totalStudents > 0 },
      { label: 'Connect a custom domain', href: '/dashboard/settings', icon: '🌐', done: (domainsCount.count ?? 0) > 1 },
    ];
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {organization.name} — {now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Setup Checklist (for new schools) */}
      {isAdmin && setupSteps.length > 0 && (
        <SetupChecklist steps={setupSteps} primaryColor={primaryColor} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon="📋"
          label="Today's Lessons"
          value={stats.todaysLessons.toString()}
          primaryColor={primaryColor}
        />
        <StatCard
          icon="🚗"
          label="Instructors Working"
          value={`${stats.instructorsWorking} / ${instructors.length}`}
          primaryColor={primaryColor}
        />
        <StatCard
          icon="💰"
          label="Expected Revenue"
          value={formatPrice(stats.expectedRevenueCents, organization.currency)}
          primaryColor={primaryColor}
        />
        <StatCard
          icon="🎓"
          label="Active Students"
          value={totalStudents.toString()}
          primaryColor={primaryColor}
        />
      </div>

      {/* Quick Actions */}
      {isAdmin && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <QuickAction href="/dashboard/today" icon="🎯" label="Today Mode" />
            <QuickAction href="/dashboard/bookings" icon="➕" label="Add Booking" />
            <QuickAction href="/dashboard/students" icon="🎓" label="Add Student" />
            <QuickAction href="/dashboard/availability" icon="🚫" label="Block Time" />
            <QuickAction href="/dashboard/calendar" icon="📅" label="View Calendar" />
          </div>
        </section>
      )}

      {/* Upcoming Lessons */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Lessons
          </h2>
          <Link
            href="/dashboard/bookings"
            className="text-sm font-medium hover:underline"
            style={{ color: primaryColor }}
          >
            View all →
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No upcoming lessons scheduled.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} instructors={instructors} />
            ))}
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
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold" style={{ color: primaryColor }}>
        {value}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center hover:shadow-md transition-shadow"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </Link>
  );
}

function BookingCard({
  booking,
  instructors,
}: {
  booking: Booking;
  instructors: Instructor[];
}) {
  const instructor = instructors.find((i) => i.id === booking.instructor_id);
  const start = new Date(booking.start_datetime);
  const end = new Date(booking.end_datetime);

  const statusColors: Record<string, string> = {
    new_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    contacted: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    no_show: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* Time */}
      <div className="text-center shrink-0 w-16">
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {instructor?.display_name ?? 'Unknown instructor'}
        </p>
        {booking.pickup_address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            📍 {booking.pickup_address}
          </p>
        )}
      </div>
      {/* Status */}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[booking.status] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
      >
        {booking.status.replaceAll('_', ' ')}
      </span>
      {/* Price */}
      <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
        {formatPrice(booking.price_cents ?? 0)}
      </span>
    </div>
  );
}
