// ==================================================
// Platform Admin: Organizations Page
// ==================================================
// List and manage all driving school organizations.

import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { listOrganizations } from '@/services/platform-admin-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Organizations — Platform Admin',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  trial: {
    label: 'Trial',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  },
};

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function OrganizationsPage({ searchParams }: PageProps) {
  await getPlatformAdminContext();
  const client = getAdminClient();
  const params = await searchParams;

  const { data: organizations, total } = await listOrganizations(client, {
    status: params.status,
    search: params.search,
    limit: 50,
  });

  const statusFilter = params.status ?? 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Organizations
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {total} organization{total !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'trial', 'suspended', 'cancelled'].map((s) => (
          <a
            key={s}
            href={`/admin/organizations${s === 'all' ? '' : `?status=${s}`}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              statusFilter === s
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Slug
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Plan
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Sub. Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {organizations.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No organizations found
                </td>
              </tr>
            ) : (
              organizations.map((org) => {
                const orgStatus = STATUS_CONFIG[org.status] ?? STATUS_CONFIG.cancelled;
                const sub = Array.isArray(org.subscription)
                  ? org.subscription[0]
                  : org.subscription;
                const plan = sub?.plan;
                const subStatus = sub?.status;

                return (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {org.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {org.slug}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${orgStatus.className}`}
                      >
                        {orgStatus.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {plan ? (
                        <span>{(plan as { name: string }).name}</span>
                      ) : (
                        <span className="text-gray-400">No plan</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {subStatus ? (
                        <span className="capitalize text-gray-700 dark:text-gray-300">
                          {subStatus}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(org.created_at).toLocaleDateString('en-AU')}
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
