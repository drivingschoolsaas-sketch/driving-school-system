// ==================================================
// Platform Admin: Subscriptions Page
// ==================================================
// View all subscriptions across organizations.

import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subscriptions — Platform Admin',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  trialing: {
    label: 'Trialing',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  past_due: {
    label: 'Past Due',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  expired: {
    label: 'Expired',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400',
  },
};

function formatCents(cents: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  await getPlatformAdminContext();
  const client = getAdminClient();
  const params = await searchParams;

  let query = client
    .from('subscriptions')
    .select(
      '*, plan:plans(name, price_monthly_cents, currency), organization:organizations(name, slug)',
      { count: 'exact' }
    );

  if (params.status) {
    query = query.eq('status', params.status);
  }

  query = query.order('created_at', { ascending: false }).limit(50);

  const { data: subscriptions, count } = await query;
  const total = count ?? 0;
  const statusFilter = params.status ?? 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Subscriptions
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {total} subscription{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'trialing', 'active', 'past_due', 'cancelled', 'suspended'].map(
          (s) => (
            <a
              key={s}
              href={`/admin/subscriptions${s === 'all' ? '' : `?status=${s}`}`}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusFilter === s
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {s === 'past_due' ? 'Past Due' : s.charAt(0).toUpperCase() + s.slice(1)}
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
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Plan
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Interval
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                MRR
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Period End
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {!subscriptions || subscriptions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => {
                const row = sub as Record<string, unknown>;
                const plan = row.plan as {
                  name: string;
                  price_monthly_cents: number;
                  currency: string;
                } | null;
                const org = row.organization as {
                  name: string;
                  slug: string;
                } | null;
                const status = row.status as string;
                const statusInfo =
                  STATUS_CONFIG[status] ?? STATUS_CONFIG.expired;

                return (
                  <tr key={row.id as string}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {org?.name ?? '—'}
                      <span className="ml-2 text-xs text-gray-400">
                        {org?.slug}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {plan?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-500 dark:text-gray-400">
                      {row.billing_interval as string}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {plan
                        ? formatCents(
                            plan.price_monthly_cents,
                            plan.currency
                          )
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {row.current_period_end
                        ? new Date(
                            row.current_period_end as string
                          ).toLocaleDateString('en-AU')
                        : '—'}
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
