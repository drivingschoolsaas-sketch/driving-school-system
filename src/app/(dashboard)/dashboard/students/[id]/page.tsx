// ==================================================
// Student Detail Page
// ==================================================
// Shows student info, booking history, and progress tracking.
// Instructors and admins can update skill levels.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getDrivingSkills, getStudentProgress } from '@/services/student-progress-service';
import type { Student } from '@/types/database';
import type { Metadata } from 'next';
import { ProgressEditor } from './progress-editor';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Student Detail',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: PageProps) {
  const { id: studentId } = await params;
  const { auth, organization, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.STUDENT_VIEW);
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  // Fetch student
  const { data: studentData, error: studentError } = await client
    .from('students')
    .select('*')
    .eq('id', studentId)
    .eq('organization_id', orgId)
    .single();

  if (studentError || !studentData) notFound();
  const student = studentData as Student;

  // Fetch related data in parallel
  const [bookingsRes, allBookingsRes, skills, progress, paymentsRes] = await Promise.all([
    // Recent bookings with instructor + lesson type names
    client
      .from('bookings')
      .select('id, start_datetime, end_datetime, status, price_cents, pickup_address, notes, instructor_id, lesson_type_id, instructors(display_name), lesson_types(name)')
      .eq('organization_id', orgId)
      .eq('student_id', studentId)
      .order('start_datetime', { ascending: false })
      .limit(20),
    // All bookings for stats (count only)
    client
      .from('bookings')
      .select('status, price_cents')
      .eq('organization_id', orgId)
      .eq('student_id', studentId),
    getDrivingSkills(client, auth),
    getStudentProgress(client, auth, studentId),
    // Total payments
    client
      .from('payments')
      .select('amount_cents')
      .eq('organization_id', orgId)
      .eq('student_id', studentId)
      .eq('status', 'succeeded'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBookings = (bookingsRes.data ?? []) as any[];
  const bookings = rawBookings.map((b) => ({
    id: b.id as string,
    start_datetime: b.start_datetime as string,
    end_datetime: b.end_datetime as string,
    status: b.status as string,
    price_cents: b.price_cents as number,
    pickup_address: b.pickup_address as string | null,
    notes: b.notes as string | null,
    instructor_id: b.instructor_id as string,
    lesson_type_id: b.lesson_type_id as string | null,
    instructorName: (b.instructors?.display_name ?? b.instructors?.[0]?.display_name ?? null) as string | null,
    lessonTypeName: (b.lesson_types?.name ?? b.lesson_types?.[0]?.name ?? null) as string | null,
  }));
  const allBookings = (allBookingsRes.data ?? []) as Array<{ status: string; price_cents: number }>;
  const activeSkills = skills.filter((s) => s.is_active);
  const payments = (paymentsRes.data ?? []) as Array<{ amount_cents: number }>;

  const completedLessons = allBookings.filter((b) => b.status === 'completed').length;
  const totalSpentCents = payments.reduce((sum, p) => sum + p.amount_cents, 0);
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.start_datetime) > new Date() && !['cancelled', 'rejected'].includes(b.status)
  );

  const statusColors: Record<string, string> = {
    new_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    contacted: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    no_show: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard/students" className="hover:underline">Students</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900 dark:text-white">{student.display_name}</span>
      </nav>

      {/* Student Header */}
      <div className="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          {student.display_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{student.display_name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            {student.email && <span>✉️ {student.email}</span>}
            {student.phone && <span>📞 {student.phone}</span>}
            {student.preferred_transmission && (
              <span className="capitalize">🚗 {student.preferred_transmission}</span>
            )}
          </div>
          {student.pickup_address && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              📍 {student.pickup_address}{student.pickup_suburb ? `, ${student.pickup_suburb}` : ''}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
              student.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {student.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Completed', value: String(completedLessons), icon: '✅' },
          { label: 'Upcoming', value: String(upcomingBookings.length), icon: '📅' },
          { label: 'Total Bookings', value: String(allBookings.length), icon: '📋' },
          { label: 'Total Spent', value: formatPrice(totalSpentCents, organization.currency), icon: '💰' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center"
          >
            <span className="text-xl">{stat.icon}</span>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Progress Tracking */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Progress Tracking
          </h2>
          <ProgressEditor
            studentId={studentId}
            skills={activeSkills.map((s) => ({ id: s.id, name: s.name, category: s.category }))}
            progress={progress.map((p) => ({
              skill_id: p.skill_id,
              level: p.level,
              notes: p.notes,
              assessed_at: p.assessed_at,
            }))}
            primaryColor={primaryColor}
          />
        </div>

        {/* Recent Bookings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Bookings
          </h2>
          {bookings.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No bookings yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => {
                const start = new Date(b.start_datetime);
                const instructorName = b.instructorName;
                const lessonName = b.lessonTypeName;
                return (
                  <div
                    key={b.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {start.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                            {' '}
                            {start.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatPrice(b.price_cents, organization.currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lessonName && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">{lessonName}</span>
                          )}
                          {instructorName && (
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              with {instructorName}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap ${
                          statusColors[b.status] ?? ''
                        }`}
                      >
                        {b.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {student.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {student.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
