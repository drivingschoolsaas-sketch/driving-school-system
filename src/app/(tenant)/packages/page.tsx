import { getTenantData } from '@/lib/tenant';
import { getAdminClient } from '@/lib/database/supabase-admin';
import type { LessonPackage } from '@/types/database';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Packages',
};

export default async function PackagesPage() {
  const data = await getTenantData();
  if (!data) return <PageNotConfigured />;

  const client = getAdminClient();
  const { data: packages } = await client
    .from('lesson_packages')
    .select('*')
    .eq('organization_id', data.organization.id)
    .eq('status', 'active')
    .eq('is_public', true)
    .order('sort_order')
    .order('name');

  const pkgs = (packages ?? []) as LessonPackage[];
  const primaryColor = data.settings?.primary_color ?? '#2563eb';

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Lesson Packages
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Save with our multi-lesson packages — the more you book, the more you save.
          </p>
        </div>

        {pkgs.length === 0 ? (
          <p className="mt-12 text-center text-gray-500 dark:text-gray-400">
            Package information coming soon.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {pkgs.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex flex-col hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {pkg.name}
                </h2>
                {pkg.description && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex-1">
                    {pkg.description}
                  </p>
                )}
                <div className="mt-6">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: primaryColor }}
                  >
                    ${(pkg.price_cents / 100).toFixed(0)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    for {pkg.lesson_count} lesson{pkg.lesson_count !== 1 ? 's' : ''}
                  </span>
                </div>
                {pkg.savings_cents > 0 && (
                  <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                    💰 Save ${(pkg.savings_cents / 100).toFixed(0)} compared to individual lessons
                  </p>
                )}
                {pkg.validity_days && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Valid for {pkg.validity_days} days from purchase
                  </p>
                )}
                <Link
                  href="/book"
                  className="mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  Get This Package
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageNotConfigured() {
  return (
    <div className="py-24 text-center">
      <p className="text-gray-500 dark:text-gray-400">This page is not available.</p>
    </div>
  );
}
