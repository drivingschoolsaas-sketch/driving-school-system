// ==================================================
// Dashboard: Reports Page
// ==================================================
// Revenue, instructor performance, and booking analytics.
// Gated by advanced_reports_enabled entitlement.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import {
  getRevenueReport,
  getInstructorPerformanceReport,
  getBookingAnalytics,
} from '@/services/reports-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports',
};

function formatCents(cents: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  booking_full: 'Full Booking',
  booking_deposit: 'Deposit',
  package_purchase: 'Package',
  outstanding_balance: 'Balance',
};

export default async function ReportsPage() {
  const { auth } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.REPORT_VIEW);
  const client = await createServerSupabaseClient();

  const [revenue, instructors, bookingAnalytics] = await Promise.all([
    getRevenueReport(client, auth),
    getInstructorPerformanceReport(client, auth),
    getBookingAnalytics(client, auth),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reports & Analytics
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Revenue, performance, and booking insights
        </p>
      </div>

      {/* Revenue Summary */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Revenue
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Revenue (All Time)
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {formatCents(revenue.totalRevenueCents)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Period Revenue
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCents(revenue.periodRevenueCents)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Refunded</p>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCents(revenue.refundedCents)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Net Revenue
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {formatCents(revenue.netRevenueCents)}
            </p>
          </div>
        </div>

        {/* Revenue by Type */}
        {revenue.revenueByType.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Payment Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Count
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {revenue.revenueByType.map((rt) => (
                  <tr key={rt.payment_type}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {PAYMENT_TYPE_LABELS[rt.payment_type] ?? rt.payment_type}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                      {rt.count}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCents(rt.total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Revenue by Month */}
        {revenue.revenueByMonth.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Month
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Payments
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {revenue.revenueByMonth.map((rm) => (
                  <tr key={rm.month}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {rm.month}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                      {rm.count}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCents(rm.total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Instructor Performance */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Instructor Performance
        </h2>
        {instructors.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No instructor data available
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Instructor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Bookings
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    No-Shows
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {instructors.map((inst) => (
                  <tr key={inst.instructorId}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {inst.instructorName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                      {inst.totalBookings}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                      {inst.completedBookings}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <span
                        className={
                          inst.completionRate >= 0.8
                            ? 'text-green-600 dark:text-green-400'
                            : inst.completionRate >= 0.6
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {formatPercent(inst.completionRate)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCents(inst.totalRevenueCents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                      {inst.averageRating !== null
                        ? `${inst.averageRating.toFixed(1)} ⭐ (${inst.reviewCount})`
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <span
                        className={
                          inst.noShowBookings > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }
                      >
                        {inst.noShowBookings}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Booking Analytics */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Booking Analytics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Bookings
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {bookingAnalytics.totalBookings}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Completion Rate
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPercent(bookingAnalytics.completionRate)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cancellation Rate
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {formatPercent(bookingAnalytics.cancellationRate)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">No-Shows</p>
            <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {bookingAnalytics.noShowBookings}
            </p>
          </div>
        </div>

        {/* Bookings by Day */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
              Bookings by Day
            </h3>
            <div className="space-y-2">
              {bookingAnalytics.bookingsByDay.map((d) => {
                const maxCount = Math.max(
                  ...bookingAnalytics.bookingsByDay.map((x) => x.count),
                  1
                );
                const pct = (d.count / maxCount) * 100;
                return (
                  <div key={d.day} className="flex items-center gap-2">
                    <span className="w-12 text-xs capitalize text-gray-500 dark:text-gray-400">
                      {d.day.substring(0, 3)}
                    </span>
                    <div className="flex-1">
                      <div className="h-4 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-4 rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-xs text-gray-600 dark:text-gray-400">
                      {d.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bookings by Lesson Type */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
              Bookings by Lesson Type
            </h3>
            {bookingAnalytics.bookingsByLessonType.length === 0 ? (
              <p className="text-sm text-gray-400">No data</p>
            ) : (
              <div className="space-y-2">
                {bookingAnalytics.bookingsByLessonType.map((lt) => (
                  <div
                    key={lt.lesson_type_id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {lt.lesson_type_name}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {lt.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
