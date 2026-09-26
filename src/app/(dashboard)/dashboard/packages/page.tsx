// ==================================================
// Packages Management Page
// ==================================================
// Admin-only view of lesson packages with pricing and savings.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import type { LessonPackage, LessonType } from '@/types/database';
import type { Metadata } from 'next';
import { AddPackageForm } from './package-form-client';
import { PackageCardActions } from './package-card-actions';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Packages',
};

export default async function PackagesPage() {
  const { auth, organization, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.PACKAGE_MANAGE);
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const [packagesRes, lessonTypesRes] = await Promise.all([
    client
      .from('lesson_packages')
      .select('*')
      .eq('organization_id', orgId)
      .order('sort_order')
      .order('name'),
    client
      .from('lesson_types')
      .select('*')
      .eq('organization_id', orgId),
  ]);

  const packages = (packagesRes.data ?? []) as LessonPackage[];
  const lessonTypes = (lessonTypesRes.data ?? []) as LessonType[];
  const lessonTypeMap = new Map(lessonTypes.map((lt) => [lt.id, lt]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Packages</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {packages.length} package{packages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddPackageForm
          lessonTypes={lessonTypes.filter((lt) => lt.status === 'active').map((lt) => ({ id: lt.id, name: lt.name }))}
          primaryColor={primaryColor}
        />
      </div>

      {packages.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-3xl mb-3">📦</p>
          <p className="font-medium text-gray-900 dark:text-white">No packages configured yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create lesson bundles to offer discounts and encourage multi-lesson bookings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const lt = lessonTypeMap.get(pkg.lesson_type_id);

            return (
              <div
                key={pkg.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {pkg.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        pkg.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : pkg.status === 'archived'
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {pkg.status}
                    </span>
                    <PackageCardActions
                      pkg={pkg}
                      lessonTypes={lessonTypes.map((lt) => ({ id: lt.id, name: lt.name }))}
                      primaryColor={primaryColor}
                      currency={organization.currency}
                    />
                  </div>
                </div>

                {pkg.description && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {pkg.description}
                  </p>
                )}

                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Lessons</span>
                    <span className="font-medium text-gray-900 dark:text-white">{pkg.lesson_count}×</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Price</span>
                    <span className="font-bold" style={{ color: primaryColor }}>
                      {formatPrice(pkg.price_cents, organization.currency)}
                    </span>
                  </div>
                  {pkg.savings_cents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Savings</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        Save {formatPrice(pkg.savings_cents, organization.currency)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {lt && (
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                      {lt.name}
                    </span>
                  )}
                  {pkg.validity_days && (
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                      {pkg.validity_days} day validity
                    </span>
                  )}
                  {pkg.is_public && (
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-blue-700 dark:text-blue-300">
                      Public
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
