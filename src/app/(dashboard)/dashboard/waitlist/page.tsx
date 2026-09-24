// ==================================================
// Dashboard: Waitlist Page
// ==================================================
// View and manage cancellation waitlist entries.
// Gated by waitlist_enabled entitlement.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getWaitlistEntries } from '@/services/waitlist-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Waitlist',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  waiting: {
    label: 'Waiting',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  notified: {
    label: 'Notified',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  booked: {
    label: 'Booked',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  expired: {
    label: 'Expired',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  },
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function WaitlistPage({ searchParams }: PageProps) {
  const { auth } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.BOOKING_VIEW);
  const client = await createServerSupabaseClient();
  const params = await searchParams;

  const entries = await getWaitlistEntries(client, auth, {
    status: params.status,
  });

  const waitingCount = entries.filter((e) => e.status === 'waiting').length;
  const notifiedCount = entries.filter((e) => e.status === 'notified').length;
  const statusFilter = params.status ?? 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Waitlist
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Students waiting for cancellation openings
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Waiting</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {waitingCount}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Notified</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {notifiedCount}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Entries</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {entries.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'waiting', 'notified', 'booked', 'expired', 'cancelled'].map(
          (s) => (
            <a
              key={s}
              href={`/dashboard/waitlist${s === 'all' ? '' : `?status=${s}`}`}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusFilter === s
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </a>
          )
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Preferred Days
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No waitlist entries
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const statusInfo =
                  STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.waiting;
                return (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {(entry as unknown as { students?: { display_name: string } | null }).students?.display_name ?? entry.student_id.substring(0, 8) + '…'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {entry.preferred_days.length > 0
                        ? entry.preferred_days
                            .map(
                              (d) =>
                                d.charAt(0).toUpperCase() + d.slice(1, 3)
                            )
                            .join(', ')
                        : 'Any day'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {entry.preferred_time_start && entry.preferred_time_end
                        ? `${entry.preferred_time_start}–${entry.preferred_time_end}`
                        : 'Any time'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {entry.priority}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString('en-AU')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
