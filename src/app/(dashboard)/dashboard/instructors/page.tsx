// ==================================================
// Instructors Management Page
// ==================================================
// Admin-only view of all instructors with their status,
// transmission type, and lesson counts.

import { getDashboardContext } from '@/lib/auth';
import { requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import type { Instructor } from '@/types/database';
import type { Metadata } from 'next';
import { AddInstructorForm } from './instructor-form-client';
import { InstructorList } from './instructor-list-client';

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

      <InstructorList instructors={instructors} primaryColor={primaryColor} />
    </div>
  );
}
