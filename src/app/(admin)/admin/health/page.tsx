// ==================================================
// Platform Admin: System Health Page
// ==================================================
// Detailed view of system health — failed webhooks,
// notifications, pending jobs, and error details.

import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { getSystemHealth } from '@/services/platform-admin-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Health — Platform Admin',
};

export default async function SystemHealthPage() {
  await getPlatformAdminContext();
  const client = getAdminClient();

  const health = await getSystemHealth(client);

  const allClear =
    health.failedWebhooks === 0 &&
    health.failedNotifications === 0 &&
    health.pendingWebhooks === 0 &&
    health.domainsNeedingAttention === 0 &&
    health.pastDueSubscriptions === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          System Health
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {allClear
            ? '✅ All systems operational'
            : '⚠️ Some issues require attention'}
        </p>
      </div>

      {/* Health Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HealthMetric
          label="Failed Webhooks"
          value={health.failedWebhooks}
          description="Webhook events that could not be processed"
          icon="🔗"
          isAlert={health.failedWebhooks > 0}
        />
        <HealthMetric
          label="Failed Notifications"
          value={health.failedNotifications}
          description="Email/SMS notifications that failed to send"
          icon="📨"
          isAlert={health.failedNotifications > 0}
        />
        <HealthMetric
          label="Pending Webhooks"
          value={health.pendingWebhooks}
          description="Webhooks waiting to be processed"
          icon="⏳"
          isAlert={health.pendingWebhooks > 10}
        />
        <HealthMetric
          label="Domains Need Attention"
          value={health.domainsNeedingAttention}
          description="Domains with pending or failed verification"
          icon="🌐"
          isAlert={health.domainsNeedingAttention > 0}
        />
        <HealthMetric
          label="Past Due Subscriptions"
          value={health.pastDueSubscriptions}
          description="Subscriptions with overdue payments"
          icon="💳"
          isAlert={health.pastDueSubscriptions > 0}
        />
      </div>

      {/* Recent Errors */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Recent Failed Webhooks
        </h2>
        {health.recentErrors.length === 0 ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
            <p className="text-green-800 dark:text-green-300">
              ✅ No failed webhooks
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Event Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Last Error
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {health.recentErrors.map((err) => (
                  <tr key={err.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {err.event_type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        {err.status}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-red-600 dark:text-red-400">
                      {err.processing_errors?.[
                        err.processing_errors.length - 1
                      ] ?? 'Unknown error'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(err.created_at).toLocaleString('en-AU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HealthMetric({
  label,
  value,
  description,
  icon,
  isAlert,
}: {
  label: string;
  value: number;
  description: string;
  icon: string;
  isAlert: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        isAlert
          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-medium text-gray-900 dark:text-white">{label}</h3>
      </div>
      <p
        className={`mt-2 text-3xl font-bold ${
          isAlert
            ? 'text-red-600 dark:text-red-400'
            : 'text-green-600 dark:text-green-400'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
