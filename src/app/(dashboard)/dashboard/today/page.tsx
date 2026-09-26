// ==================================================
// Dashboard: Today Mode — Instructor View
// ==================================================
// Mobile-first view showing the instructor's lessons for
// today with quick actions: call, directions, start,
// complete, add notes, update progress.
// Spec: Section 46 — TODAY MODE.

import Link from 'next/link';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import type { Booking, Student, LessonType } from '@/types/database';
import type { Metadata } from 'next';
import { TodayLessonActions } from './today-actions-client';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Today',
};

export default async function TodayModePage() {
  const { auth, organization, settings } = await getDashboardContext();
  await requirePermission(auth, PERMISSIONS.BOOKING_VIEW);
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  // If instructor, find their instructor record to filter
  let instructorId: string | null = null;
  if (auth.role === 'instructor') {
    const { data: inst } = await client
      .from('instructors')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', auth.userId)
      .single();
    instructorId = inst?.id ?? null;
  }

  // Fetch today's bookings
  let bookingsQuery = client
    .from('bookings')
    .select('*')
    .eq('organization_id', orgId)
    .gte('start_datetime', todayStart)
    .lt('start_datetime', todayEnd)
    .not('status', 'in', '("cancelled","rejected")')
    .order('start_datetime');

  if (instructorId) {
    bookingsQuery = bookingsQuery.eq('instructor_id', instructorId);
  }

  const { data: bookingsData } = await bookingsQuery;
  const bookings = (bookingsData ?? []) as Booking[];

  // Fetch related data
  const studentIds = [...new Set(bookings.map((b) => b.student_id).filter(Boolean))] as string[];
  const lessonTypeIds = [...new Set(bookings.map((b) => b.lesson_type_id))];

  let students: Student[] = [];
  let lessonTypes: LessonType[] = [];

  if (studentIds.length > 0) {
    const { data } = await client
      .from('students')
      .select('*')
      .eq('organization_id', orgId)
      .in('id', studentIds);
    students = (data ?? []) as Student[];
  }

  if (lessonTypeIds.length > 0) {
    const { data } = await client
      .from('lesson_types')
      .select('*')
      .eq('organization_id', orgId)
      .in('id', lessonTypeIds);
    lessonTypes = (data ?? []) as LessonType[];
  }

  const studentMap = new Map(students.map((s) => [s.id, s]));
  const lessonTypeMap = new Map(lessonTypes.map((lt) => [lt.id, lt]));

  // Split into upcoming vs done
  const upcoming = bookings.filter(
    (b) => b.status !== 'completed' && b.status !== 'no_show'
  );
  const completed = bookings.filter(
    (b) => b.status === 'completed' || b.status === 'no_show'
  );

  const nextLesson = upcoming[0] ?? null;

  const statusColors: Record<string, string> = {
    new_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    contacted: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    no_show: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          {' · '}
          {bookings.length} lesson{bookings.length !== 1 ? 's' : ''} scheduled
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: primaryColor }}>
            {upcoming.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Remaining</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completed.filter((b) => b.status === 'completed').length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPrice(bookings.reduce((sum, b) => sum + b.price_cents, 0), organization.currency)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Revenue</p>
        </div>
      </div>

      {/* Next Lesson (highlighted) */}
      {nextLesson && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Next Lesson
          </h2>
          <LessonCard
            booking={nextLesson}
            student={nextLesson.student_id ? studentMap.get(nextLesson.student_id) : undefined}
            lessonType={lessonTypeMap.get(nextLesson.lesson_type_id)}
            statusColors={statusColors}
            primaryColor={primaryColor}
            currency={organization.currency}
            isNext
          />
        </section>
      )}

      {/* Remaining Lessons */}
      {upcoming.length > 1 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Later Today
          </h2>
          <div className="space-y-3">
            {upcoming.slice(1).map((booking) => (
              <LessonCard
                key={booking.id}
                booking={booking}
                student={booking.student_id ? studentMap.get(booking.student_id) : undefined}
                lessonType={lessonTypeMap.get(booking.lesson_type_id)}
                statusColors={statusColors}
                primaryColor={primaryColor}
                currency={organization.currency}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Today */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Completed
          </h2>
          <div className="space-y-3">
            {completed.map((booking) => (
              <LessonCard
                key={booking.id}
                booking={booking}
                student={booking.student_id ? studentMap.get(booking.student_id) : undefined}
                lessonType={lessonTypeMap.get(booking.lesson_type_id)}
                statusColors={statusColors}
                primaryColor={primaryColor}
                currency={organization.currency}
                isDone
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {bookings.length === 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <span className="text-4xl">🌴</span>
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            No lessons today
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enjoy your day off!
          </p>
        </div>
      )}
    </div>
  );
}

function LessonCard({
  booking,
  student,
  lessonType,
  statusColors,
  primaryColor,
  isNext,
  isDone,
  currency,
}: {
  booking: Booking;
  student?: Student;
  lessonType?: LessonType;
  statusColors: Record<string, string>;
  primaryColor: string;
  isNext?: boolean;
  isDone?: boolean;
  currency?: string | null;
}) {
  const start = new Date(booking.start_datetime);
  const end = new Date(booking.end_datetime);

  return (
    <div
      className={`rounded-xl border bg-white dark:bg-gray-800 p-5 ${
        isNext
          ? 'border-2 shadow-md'
          : 'border-gray-200 dark:border-gray-700'
      } ${isDone ? 'opacity-60' : ''}`}
      style={isNext ? { borderColor: primaryColor } : undefined}
    >
      {/* Time + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">–</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[booking.status] ?? ''}`}
        >
          {booking.status.replaceAll('_', ' ')}
        </span>
      </div>

      {/* Student info */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {student?.display_name ?? (() => {
              if (booking.notes) {
                const match = booking.notes.match(/^Public booking by:\s*(.+)/m);
                if (match) return match[1].trim();
              }
              return 'Walk-in';
            })()}
          </p>
          {student && (
            <Link
              href={`/dashboard/students/${student.id}`}
              className="text-xs font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              Progress →
            </Link>
          )}
        </div>

        {student?.phone && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            📞 {student.phone}
          </p>
        )}

        {booking.pickup_address && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            📍 {booking.pickup_address}
            {booking.pickup_suburb ? `, ${booking.pickup_suburb}` : ''}
          </p>
        )}

        {lessonType && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            📖 {lessonType.name} · {lessonType.duration_minutes} min · {formatPrice(booking.price_cents, currency)}
          </p>
        )}
      </div>

      {/* Notes */}
      {booking.admin_notes && (
        <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 p-2">
          <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {booking.admin_notes}
          </p>
        </div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="mt-4">
          <TodayLessonActions
            bookingId={booking.id}
            status={booking.status}
            studentPhone={student?.phone ?? null}
            pickupAddress={booking.pickup_address}
            primaryColor={primaryColor}
          />
        </div>
      )}
    </div>
  );
}
