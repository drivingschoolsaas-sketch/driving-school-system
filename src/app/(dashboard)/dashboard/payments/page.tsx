// ==================================================
// Dashboard: Payments Page
// ==================================================
// View and manage payments, refunds, and transaction
// history. Admin-only.

import { redirect } from 'next/navigation';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS, isOrgAdminRole } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { isFeatureFlagEnabled } from '@/services/platform-admin-service';
import { getPayments } from '@/services/payment-service';
import { RecordPaymentForm } from './record-payment-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payments',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  succeeded: {
    label: 'Paid',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  partially_refunded: {
    label: 'Partial Refund',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
};

const TYPE_LABELS: Record<string, string> = {
  booking_full: 'Full Payment',
  booking_deposit: 'Deposit',
  package_purchase: 'Package',
  outstanding_balance: 'Balance',
};

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export default async function PaymentsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { auth, organization, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.PAYMENT_VIEW);
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const currency = organization.currency ?? 'AUD';
  const isAdmin = isOrgAdminRole(auth.role);

  // P1-8: Payments are non-MVP — gated behind feature flag
  const adminClient = getAdminClient();
  const paymentsEnabled = await isFeatureFlagEnabled(adminClient, 'payments', auth.organizationId);
  if (!paymentsEnabled) {
    redirect('/dashboard');
  }

  const client = await createServerSupabaseClient();
  const statusFilter = searchParams.status;

  const [payments, studentsRes] = await Promise.all([
    getPayments(client, auth, { status: statusFilter }),
    isAdmin
      ? client
          .from('students')
          .select('id, display_name')
          .eq('organization_id', auth.organizationId)
          .eq('is_active', true)
          .order('display_name')
      : Promise.resolve({ data: [] }),
  ]);

  const students = (studentsRes.data ?? []) as Array<{ id: string; display_name: string }>;

  // Summary stats
  const totalRevenue = payments
    .filter((p) => p.status === 'succeeded' || p.status === 'partially_refunded')
    .reduce((sum, p) => sum + p.amount_cents - p.amount_refunded_cents, 0);
  const pendingCount = payments.filter((p) => p.status === 'pending' || p.status === 'processing').length;
  const failedCount = payments.filter((p) => p.status === 'failed').length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Payments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View transaction history and manage payments.
          </p>
        </div>
        {isAdmin && (
          <RecordPaymentForm students={students} primaryColor={primaryColor} />
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Net Revenue
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCents(totalRevenue, currency)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Pending
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Failed
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {failedCount}
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: undefined, label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'succeeded', label: 'Paid' },
          { value: 'failed', label: 'Failed' },
          { value: 'refunded', label: 'Refunded' },
        ].map((filter) => {
          const isActive =
            filter.value === statusFilter ||
            (!filter.value && !statusFilter);
          return (
            <a
              key={filter.label}
              href={
                filter.value
                  ? `/dashboard/payments?status=${filter.value}`
                  : '/dashboard/payments'
              }
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </a>
          );
        })}
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {statusFilter
              ? `No ${statusFilter} payments found.`
              : 'No payments yet. Payments will appear here once online payments are configured.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Refunded</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {payments.map((payment) => {
                const statusInfo = STATUS_CONFIG[payment.status] ?? {
                  label: payment.status,
                  className: 'bg-gray-100 text-gray-800',
                };

                return (
                  <tr key={payment.id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {new Date(payment.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {TYPE_LABELS[payment.payment_type] ?? payment.payment_type}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap font-medium">
                      {formatCents(payment.amount_cents, payment.currency)}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {payment.amount_refunded_cents > 0 ? (
                        <span className="text-purple-600 dark:text-purple-400">
                          -{formatCents(payment.amount_refunded_cents, payment.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                      {payment.description ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
