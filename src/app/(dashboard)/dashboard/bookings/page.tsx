// ==================================================
// Bookings Management Page
// ==================================================
// Lists all bookings with status filters, instructor filter,
// and date range. Admin can view all; instructors see their own.

import { getDashboardContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { isOrgAdminRole } from '@/permissions/roles';
import type { Booking, Instructor, Student, LessonType } from '@/types/database';
import type { Metadata } from 'next';

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
  const { auth, settings } = await getDashboardContext();
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
    // Get this user's instructor record
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

  // Date range filter
  if (params.from) {
    query = query.gte('start_datetime', params.from);
  }
  if (params.to) {
    query = query.lte('start_datetime', params.to);
  }

  const [bookingsRes, instructorsRes, studentsRes, lessonTypesRes] = await Promise.all([
    query,
    client.from('instructors').select('*').eq('organization_id', orgId).eq('is_active', true).order('display_name'),
    client.from('students').select('*').eq('organization_id', orgId).eq('is_active', true).order('display_name'),
    client.from('lesson_types').select('*').eq('organization_id', orgId).eq('status', 'active').order('name'),
  ]);

  const bookings = (bookingsRes.data ?? []) as Booking[];
  const instructors = (instructorsRes.data ?? []) as Instructor[];
  const students = (studentsRes.data ?? []) as Student[];
  const lessonTypes = (lessonTypesRes.data ?? []) as LessonType[];

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
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <form className="flex flex-wrap gap-3" method="GET">
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
      </form>

      {/* Bookings table */}
      {bookings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No bookings match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Date / Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Instructor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Lesson
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {bookings.map((booking) => {
                const inst = instructorMap.get(booking.instructor_id);
                const student = studentMap.get(booking.student_id);
                const lt = lessonTypeMap.get(booking.lesson_type_id);
                const start = new Date(booking.start_datetime);

                return (
                  <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {student?.display_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {inst?.display_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {lt?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[booking.status] ?? ''}`}
                      >
                        {booking.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      ${(booking.price_cents / 100).toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
