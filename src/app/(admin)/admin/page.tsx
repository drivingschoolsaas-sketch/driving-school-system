// ==================================================
// Platform Admin: Overview Page
// ==================================================
// High-level platform statistics — total schools,
// subscriptions, bookings, system health at a glance.

import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { getPlatformStats, getSystemHealth } from '@/services/platform-admin-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Overview — Platform Admin',
};

export default async function PlatformAdminOverviewPage() {
  await getPlatformAdminContext();
  const client = getAdminClient();

  const [stats, health] = await Promise.all([
    getPlatformStats(client),
    getSystemHealth(client),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          DriveFlow platform health and statistics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Schools"
          value={stats.totalOrganizations}
          icon="🏢"
        />
        <StatCard
          label="Active Schools"
          value={stats.activeOrganizations}
          icon="✅"
          color="green"
        />
        <StatCard
          label="Trials"
          value={stats.trialOrganizations}
          icon="⏱️"
          color="blue"
        />
        <StatCard
          label="Suspended"
          value={stats.suspendedOrganizations}
          icon="⛔"
          color={stats.suspendedOrganizations > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Usage Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          icon="🎓"
        />
        <StatCard
          label="Total Instructors"
          value={stats.totalInstructors}
          icon="🚗"
        />
        <StatCard
          label="Total Bookings"
          value={stats.totalBookings}
          icon="📋"
        />
        <StatCard
          label="Bookings This Month"
          value={stats.totalBookingsThisMonth}
          icon="📅"
          color="blue"
        />
      </div>

      {/* Subscriptions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Subscriptions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Active"
            value={stats.activeSubscriptions}
            icon="💳"
            color="green"
          />
          <StatCard
            label="Trialing"
            value={stats.trialingSubscriptions}
            icon="🆓"
            color="blue"
          />
          <StatCard
            label="Past Due"
            value={stats.pastDueSubscriptions}
            icon="⚠️"
            color={stats.pastDueSubscriptions > 0 ? 'red' : 'gray'}
          />
        </div>
      </div>

      {/* System Health */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          System Health
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HealthCard
            label="Failed Webhooks"
            value={health.failedWebhooks}
            threshold={0}
          />
          <HealthCard
            label="Failed Notifications"
            value={health.failedNotifications}
            threshold={0}
          />
          <HealthCard
            label="Pending Webhooks"
            value={health.pendingWebhooks}
            threshold={10}
          />
          <HealthCard
            label="Domains Need Attention"
            value={health.domainsNeedingAttention}
            threshold={0}
          />
        </div>
      </div>

      {/* Recent Errors */}
      {health.recentErrors.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Recent Webhook Errors
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Event Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {health.recentErrors.map((err) => (
                  <tr key={err.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {err.event_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
                      {err.processing_errors?.[err.processing_errors.length - 1] ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(err.created_at).toLocaleString('en-AU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = 'gray',
}: {
  label: string;
  value: number;
  icon: string;
  color?: 'gray' | 'green' | 'blue' | 'red';
}) {
  const colorMap = {
    gray: 'text-gray-900 dark:text-white',
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className={`mt-2 text-3xl font-bold ${colorMap[color]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function HealthCard({
  label,
  value,
  threshold,
}: {
  label: string;
  value: number;
  threshold: number;
}) {
  const isHealthy = value <= threshold;
  return (
    <div
      className={`rounded-lg border p-4 ${
        isHealthy
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      }`}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className={`text-2xl font-bold ${isHealthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {value}
        </span>
        <span className="text-lg">
          {isHealthy ? '✅' : '🔴'}
        </span>
      </div>
    </div>
  );
}
