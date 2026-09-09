// ==================================================
// Platform Admin: Domains Health Page
// ==================================================
// Monitor domain health across all organizations.

import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { getDomainHealth, listOrganizations } from '@/services/platform-admin-service';
import { AddDomainForm } from './add-domain-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Domain Health — Platform Admin',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  verified: {
    label: 'Verified',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  verifying: {
    label: 'Verifying',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  },
};

const DOMAIN_TYPE_LABELS: Record<string, string> = {
  platform_subdomain: 'Subdomain',
  custom_root: 'Custom Root',
  custom_subdomain: 'Custom Sub',
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function DomainsPage({ searchParams }: PageProps) {
  await getPlatformAdminContext();
  const client = getAdminClient();
  const params = await searchParams;

  const [domainsResult, orgsResult] = await Promise.all([
    getDomainHealth(client, { status: params.status, limit: 50 }),
    listOrganizations(client, { limit: 200 }),
  ]);
  const { data: domains, total } = domainsResult;
  const orgOptions = orgsResult.data.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
  }));

  const statusFilter = params.status ?? 'all';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Domain Health
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {total} domain{total !== 1 ? 's' : ''} across all organizations
          </p>
        </div>
        <AddDomainForm organizations={orgOptions} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'verified', 'pending', 'verifying', 'failed', 'suspended'].map(
          (s) => (
            <a
              key={s}
              href={`/admin/domains${s === 'all' ? '' : `?status=${s}`}`}
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
                Domain
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                DNS Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                SSL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Primary
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Last Checked
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {domains.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No domains found
                </td>
              </tr>
            ) : (
              domains.map((domain) => {
                const statusInfo =
                  STATUS_CONFIG[domain.status] ?? STATUS_CONFIG.pending;
                return (
                  <tr key={domain.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {domain.hostname}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {domain.organization_name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {DOMAIN_TYPE_LABELS[domain.domain_type] ?? domain.domain_type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {domain.ssl_status ? (
                        <span
                          className={
                            domain.ssl_status === 'active'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }
                        >
                          {domain.ssl_status}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {domain.is_primary ? (
                        <span className="text-green-600 dark:text-green-400">
                          ✓
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {domain.last_checked_at
                        ? new Date(domain.last_checked_at).toLocaleString('en-AU')
                        : 'Never'}
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
