// ==================================================
// Lesson Types Management Page
// ==================================================
// Admin-only page listing all lesson types with pricing,
// duration, and status.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import type { LessonType } from '@/types/database';
import type { Metadata } from 'next';
import { AddLessonTypeForm } from './lesson-type-form-client';
import { LessonTypeRowActions } from './lesson-type-row-actions';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Lesson Types',
};

export default async function LessonTypesPage() {
  const { auth, organization, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.LESSON_TYPE_MANAGE);
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const { data } = await client
    .from('lesson_types')
    .select('*')
    .eq('organization_id', orgId)
    .order('sort_order')
    .order('name');

  const lessonTypes = (data ?? []) as LessonType[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lesson Types</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {lessonTypes.length} lesson type{lessonTypes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddLessonTypeForm primaryColor={primaryColor} />
      </div>

      {lessonTypes.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-3xl mb-3">📖</p>
          <p className="font-medium text-gray-900 dark:text-white">No lesson types configured yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create your first lesson type to set up pricing and start taking bookings.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Transmission</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Price</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Public</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {lessonTypes.map((lt) => (
                <tr key={lt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{lt.name}</p>
                    {lt.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {lt.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {lt.duration_minutes} min
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    >
                      {lt.transmission}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {formatPrice(lt.price_cents, organization.currency)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`text-sm ${lt.is_public ? 'text-green-600' : 'text-gray-400'}`}>
                      {lt.is_public ? '✓' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        lt.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {lt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <LessonTypeRowActions lessonType={lt} primaryColor={primaryColor} currency={organization.currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
