// ==================================================
// Vehicles Management Page
// ==================================================
// Admin-only view of fleet vehicles with status and assignment.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import type { Vehicle, Instructor } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vehicles',
};

export default async function VehiclesPage() {
  const { auth, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.VEHICLE_MANAGE);
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const [vehiclesRes, instructorsRes] = await Promise.all([
    client.from('vehicles').select('*').eq('organization_id', orgId).order('name'),
    client.from('instructors').select('*').eq('organization_id', orgId).eq('is_active', true),
  ]);

  const vehicles = (vehiclesRes.data ?? []) as Vehicle[];
  const instructors = (instructorsRes.data ?? []) as Instructor[];
  const instructorMap = new Map(instructors.map((i) => [i.id, i]));

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    retired: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicles</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No vehicles registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const assignedInstructor = v.assigned_instructor_id
              ? instructorMap.get(v.assigned_instructor_id)
              : null;

            return (
              <div
                key={v.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{v.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {v.make} {v.model} {v.year ? `(${v.year})` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[v.status] ?? ''}`}>
                    {v.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span
                    className="rounded-full px-2 py-0.5 capitalize"
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                  >
                    {v.transmission}
                  </span>
                  {v.registration && (
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                      {v.registration}
                    </span>
                  )}
                </div>

                {assignedInstructor && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Assigned to <span className="font-medium text-gray-700 dark:text-gray-300">{assignedInstructor.display_name}</span>
                  </p>
                )}

                {v.notes && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 line-clamp-2">{v.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
