// ==================================================
// Students Management Page
// ==================================================
// Lists all students with search. Admin-only for full list;
// instructors see students they have bookings with.

import Link from 'next/link';
import { getDashboardContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { isOrgAdminRole } from '@/permissions/roles';
import type { Student } from '@/types/database';
import type { Metadata } from 'next';
import { AddStudentForm } from './student-form-client';

export const metadata: Metadata = {
  title: 'Students',
};

interface StudentsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const { auth, settings } = await getDashboardContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const params = await searchParams;
  const isAdmin = isOrgAdminRole(auth.role);

  let query = client
    .from('students')
    .select('*')
    .eq('organization_id', orgId)
    .order('display_name')
    .limit(100);

  if (params.q) {
    query = query.ilike('display_name', `%${params.q}%`);
  }

  const { data } = await query;
  const students = (data ?? []) as Student[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {students.length >= 100
              ? 'Showing first 100 students — use search to find more'
              : `${students.length} student${students.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isAdmin && <AddStudentForm primaryColor={primaryColor} />}
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <input
          name="q"
          type="text"
          placeholder="Search students..."
          defaultValue={params.q ?? ''}
          className="flex-1 max-w-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: primaryColor }}
        >
          Search
        </button>
      </form>

      {/* Student list */}
      {students.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-3xl mb-3">🎓</p>
          <p className="font-medium text-gray-900 dark:text-white">No students found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {params.q
              ? 'Try a different search term.'
              : 'Add your first student to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/dashboard/students/${student.id}`}
              className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 shrink-0">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                    {student.display_name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {student.display_name}
                  </h3>
                  {student.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {student.email}
                    </p>
                  )}
                  {student.phone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {student.phone}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    student.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {student.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                {student.preferred_transmission && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 capitalize">
                    {student.preferred_transmission}
                  </span>
                )}
                {student.pickup_suburb && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                    📍 {student.pickup_suburb}
                  </span>
                )}
                {student.learner_permit_number && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                    🪪 Permit
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
