// ==================================================
// Instructors Management Page
// ==================================================
// Admin-only view of all instructors with their status,
// transmission type, and lesson counts.

import Link from 'next/link';
import { getDashboardContext } from '@/lib/auth';
import { requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import type { Instructor } from '@/types/database';
import type { Metadata } from 'next';
import { AddInstructorForm } from './instructor-form-client';

export const metadata: Metadata = {
  title: 'Instructors',
};

export default async function InstructorsPage() {
  const { auth, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.INSTRUCTOR_VIEW);
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const { data } = await client
    .from('instructors')
    .select('*')
    .eq('organization_id', orgId)
    .order('display_name');

  const instructors = (data ?? []) as Instructor[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instructors</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {instructors.length} instructor{instructors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddInstructorForm primaryColor={primaryColor} />
      </div>

      {instructors.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No instructors yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instructors.map((inst) => (
            <Link
              key={inst.id}
              href={`/dashboard/instructors/${inst.id}`}
              className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                {inst.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
                  <img
                    src={inst.photo_url}
                    alt={inst.display_name}
                    className="h-12 w-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 shrink-0">
                    <span className="text-lg font-bold text-gray-500 dark:text-gray-300">
                      {inst.display_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {inst.display_name}
                  </h3>
                  {inst.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {inst.email}
                    </p>
                  )}
                  {inst.phone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{inst.phone}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    inst.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {inst.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span
                  className="rounded-full px-2 py-0.5 capitalize"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  {inst.transmission_type}
                </span>
                <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                  {inst.default_lesson_duration} min default
                </span>
                {inst.max_daily_lessons && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                    Max {inst.max_daily_lessons}/day
                  </span>
                )}
                {inst.license_number && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                    🪪 Licensed
                  </span>
                )}
              </div>

              {inst.bio && (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {inst.bio}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
