// ==================================================
// Student Portal — Packages
// ==================================================
// Shows the student's purchased packages with balance,
// usage, and expiry information.

import Link from 'next/link';
import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import type { StudentPackagePurchase, LessonPackage } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Packages',
};

export default async function PortalPackagesPage() {
  const { auth, student, settings } = await getPortalContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const [purchasesRes, packagesRes] = await Promise.all([
    client
      .from('student_package_purchases')
      .select('*')
      .eq('organization_id', orgId)
      .eq('student_id', student.id)
      .order('purchased_at', { ascending: false }),
    client
      .from('lesson_packages')
      .select('*')
      .eq('organization_id', orgId),
  ]);

  const purchases = (purchasesRes.data ?? []) as StudentPackagePurchase[];
  const packages = (packagesRes.data ?? []) as LessonPackage[];
  const packageMap = new Map(packages.map((p) => [p.id, p]));

  const activePurchases = purchases.filter((p) => p.status === 'active');
  const otherPurchases = purchases.filter((p) => p.status !== 'active');

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Packages</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track your lesson package balance and usage.
        </p>
      </div>

      {/* Active Packages */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Active Packages
        </h2>
        {activePurchases.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No active packages.</p>
            <Link
              href="/packages"
              className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              View Available Packages
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activePurchases.map((purchase) => {
              const pkg = packageMap.get(purchase.lesson_package_id);
              const remaining = purchase.lessons_total - purchase.lessons_used;
              const usedPercent = (purchase.lessons_used / purchase.lessons_total) * 100;

              return (
                <div
                  key={purchase.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {pkg?.name ?? 'Lesson Package'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Purchased {new Date(purchase.purchased_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[purchase.status]}`}>
                      {purchase.status}
                    </span>
                  </div>

                  {/* Balance */}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold" style={{ color: primaryColor }}>
                        {remaining}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">lessons remaining</p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {purchase.lessons_used} / {purchase.lessons_total} used
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${usedPercent}%`, backgroundColor: primaryColor }}
                    />
                  </div>

                  {purchase.expires_at && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      Expires: {new Date(purchase.expires_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Packages */}
      {otherPurchases.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Past Packages
          </h2>
          <div className="space-y-3">
            {otherPurchases.map((purchase) => {
              const pkg = packageMap.get(purchase.lesson_package_id);

              return (
                <div
                  key={purchase.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 opacity-75"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {pkg?.name ?? 'Lesson Package'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {purchase.lessons_used} / {purchase.lessons_total} lessons used
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[purchase.status]}`}>
                    {purchase.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
