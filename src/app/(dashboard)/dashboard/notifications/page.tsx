// ==================================================
// Dashboard: Notification Logs Page
// ==================================================
// View notification delivery history and status.

import Link from 'next/link';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getNotifications } from '@/services/notification-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  queued: {
    label: 'Queued',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  sending: {
    label: 'Sending',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  sent: {
    label: 'Sent',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  bounced: {
    label: 'Bounced',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
};

const TYPE_LABELS: Record<string, string> = {
  booking_confirmed: 'Booking Confirmed',
  booking_reminder: 'Reminder',
  booking_changed: 'Booking Changed',
  booking_cancelled: 'Cancellation',
  payment_receipt: 'Payment Receipt',
  payment_failed: 'Payment Failed',
  instructor_reassigned: 'Instructor Change',
  review_request: 'Review Request',
  test_congratulations: 'Congratulations',
  welcome: 'Welcome',
  custom: 'Custom',
};

export default async function NotificationsPage(props: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { auth } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.NOTIFICATION_MANAGE);

  const client = await createServerSupabaseClient();
  const notifications = await getNotifications(client, auth, {
    status: searchParams.status,
    notification_type: searchParams.type,
    limit: 100,
  });

  // Stats
  const sentCount = notifications.filter(
    (n) => n.status === 'sent' || n.status === 'delivered'
  ).length;
  const failedCount = notifications.filter(
    (n) => n.status === 'failed' || n.status === 'bounced'
  ).length;
  const queuedCount = notifications.filter(
    (n) => n.status === 'queued' || n.status === 'sending'
  ).length;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View notification delivery logs and status.
          </p>
        </div>
        <Link
          href="/dashboard/notifications/templates"
          className="shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          ✉️ Email Templates
        </Link>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Sent
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {sentCount}
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
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Queued
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-600 dark:text-gray-400">
            {queuedCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: undefined, label: 'All' },
          { value: 'sent', label: 'Sent' },
          { value: 'failed', label: 'Failed' },
          { value: 'queued', label: 'Queued' },
        ].map((filter) => {
          const isActive =
            filter.value === searchParams.status ||
            (!filter.value && !searchParams.status);
          return (
            <a
              key={filter.label}
              href={
                filter.value
                  ? `/dashboard/notifications?status=${filter.value}`
                  : '/dashboard/notifications'
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

      {/* Notification Log */}
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchParams.status
              ? `No ${searchParams.status} notifications found.`
              : 'No notifications sent yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Channel</th>
                <th className="pb-3 pr-4">Recipient</th>
                <th className="pb-3 pr-4">Subject</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notif) => {
                const statusInfo = STATUS_CONFIG[notif.status] ?? {
                  label: notif.status,
                  className: 'bg-gray-100 text-gray-800',
                };

                return (
                  <tr
                    key={notif.id}
                    className="text-gray-700 dark:text-gray-300"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap text-xs">
                      {new Date(notif.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {TYPE_LABELS[notif.notification_type] ??
                        notif.notification_type}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="text-xs">
                        {notif.channel === 'email' ? '✉️' : '📱'}{' '}
                        {notif.channel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-xs">
                      {notif.recipient_name ??
                        notif.recipient_email ??
                        notif.recipient_phone ??
                        '—'}
                    </td>
                    <td className="py-3 pr-4 truncate max-w-[200px] text-xs text-gray-500 dark:text-gray-400">
                      {notif.subject ?? '—'}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                      {notif.failure_reason && (
                        <p className="mt-1 text-xs text-red-500 truncate max-w-[150px]">
                          {notif.failure_reason}
                        </p>
                      )}
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
