// ==================================================
// Platform Admin: Audit Logs Page
// ==================================================
// View audit log entries across all organizations.

import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { getAuditLogs } from '@/services/platform-admin-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Audit Logs — Platform Admin',
};

interface PageProps {
  searchParams: Promise<{ resource_type?: string }>;
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  await getPlatformAdminContext();
  const client = getAdminClient();
  const params = await searchParams;

  const { data: logs, total } = await getAuditLogs(client, {
    resourceType: params.resource_type,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Audit Logs
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {total} log entr{total !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {/* Resource Type Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'organization', 'subscription', 'member', 'feature_flag'].map(
          (rt) => (
            <a
              key={rt}
              href={`/admin/audit-logs${rt === 'all' ? '' : `?resource_type=${rt}`}`}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                (params.resource_type ?? 'all') === rt
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {rt === 'feature_flag'
                ? 'Feature Flags'
                : rt.charAt(0).toUpperCase() + rt.slice(1) + 's'}
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
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Resource
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(log.created_at).toLocaleString('en-AU')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {log.action}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{log.resource_type}</span>
                    {log.resource_id && (
                      <span className="ml-1 font-mono text-xs text-gray-400">
                        {log.resource_id.substring(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {log.user_email ?? log.user_id.substring(0, 8) + '…'}
                    {log.user_role && (
                      <span className="ml-1 text-xs capitalize text-gray-400">
                        ({log.user_role.replace('_', ' ')})
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {Object.keys(log.details).length > 0
                      ? JSON.stringify(log.details)
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
