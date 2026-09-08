// ==================================================
// Dashboard: Billing & Subscription Page
// ==================================================
// View current plan, usage, billing interval,
// and manage subscription. School owner only.

import { getDashboardContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { getSubscription, getPlans, getCurrentUsage } from '@/services/subscription-service';
import { getEntitlements } from '@/services/entitlement-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing',
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  trialing: {
    label: 'Trial',
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
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300',
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function BillingPage() {
  const { auth } = await getDashboardContext();
  const client = await createServerSupabaseClient();

  const [subscription, plans, usage, entitlements] = await Promise.all([
    getSubscription(client, auth.organizationId),
    getPlans(client),
    getCurrentUsage(client, auth.organizationId),
    getEntitlements(client, auth.organizationId),
  ]);

  const plan = subscription?.plan;
  const status = subscription?.status ?? 'expired';
  const statusInfo = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Billing & Subscription
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage your plan, billing, and usage limits
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Current Plan
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {plan?.description ?? 'No active plan'}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
        </div>

        {plan && subscription && (
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {plan.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {subscription.billing_interval === 'yearly'
                  ? formatCents(plan.price_yearly_cents, plan.currency)
                  : formatCents(plan.price_monthly_cents, plan.currency)}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  /{subscription.billing_interval === 'yearly' ? 'year' : 'month'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Billing Interval
              </p>
              <p className="mt-1 text-lg font-medium capitalize text-gray-900 dark:text-white">
                {subscription.billing_interval}
              </p>
            </div>
          </div>
        )}

        {subscription?.status === 'trialing' && subscription.trial_end && (
          <div className="mt-4 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your trial ends on{' '}
              <strong>{formatDate(subscription.trial_end)}</strong>. Add a
              payment method to continue after the trial.
            </p>
          </div>
        )}

        {subscription?.status === 'suspended' && subscription.suspension_reason && (
          <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">
              Your subscription has been suspended:{' '}
              <strong>{subscription.suspension_reason}</strong>
            </p>
          </div>
        )}

        {subscription && (
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Period start:</span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {formatDate(subscription.current_period_start)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Period end:</span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {formatDate(subscription.current_period_end)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Started:</span>{' '}
                <span className="text-gray-900 dark:text-white">
                  {formatDate(subscription.created_at)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage */}
      {entitlements && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Usage
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Current resource usage against your plan limits
          </p>

          <div className="mt-4 space-y-4">
            {renderUsageRow(
              'Instructors',
              usage?.instructors_count ?? 0,
              entitlements.maxInstructors
            )}
            {renderUsageRow(
              'Students',
              usage?.students_count ?? 0,
              entitlements.maxStudents
            )}
            {renderUsageRow(
              'Locations',
              usage?.locations_count ?? 0,
              entitlements.maxLocations
            )}
            {renderUsageRow(
              'Vehicles',
              usage?.vehicles_count ?? 0,
              entitlements.maxVehicles
            )}
            {renderUsageRow(
              'Bookings (this month)',
              usage?.bookings_count ?? 0,
              entitlements.maxBookingsPerMonth
            )}
          </div>
        </div>
      )}

      {/* Features */}
      {entitlements && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Features
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Features included in your {entitlements.planName} plan
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {renderFeature('Custom Domain', entitlements.customDomainEnabled)}
            {renderFeature('SMS Notifications', entitlements.smsEnabled)}
            {renderFeature('Student Progress Tracking', entitlements.studentProgressEnabled)}
            {renderFeature('Advanced Reports', entitlements.advancedReportsEnabled)}
            {renderFeature('Waitlist', entitlements.waitlistEnabled)}
            {renderFeature('Custom Branding', entitlements.customBrandingEnabled)}
            {renderFeature('API Access', entitlements.apiAccessEnabled)}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Available Plans
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Compare plans and upgrade when you need more
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = plan?.id === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-lg border p-4 ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {p.name}
                  {isCurrent && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                      Current
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {p.description}
                </p>
                <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCents(p.price_monthly_cents, p.currency)}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    /month
                  </span>
                </p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>
                    {p.max_instructors === null ? '∞' : p.max_instructors} instructors
                  </li>
                  <li>
                    {p.max_students === null ? '∞' : p.max_students} students
                  </li>
                  <li>
                    {p.max_locations === null ? '∞' : p.max_locations} locations
                  </li>
                  <li>
                    {p.max_bookings_per_month === null
                      ? 'Unlimited'
                      : p.max_bookings_per_month}{' '}
                    bookings/mo
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderUsageRow(
  label: string,
  current: number,
  limit: number | null
): React.ReactElement {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span
          className={
            isAtLimit
              ? 'font-medium text-red-600 dark:text-red-400'
              : isNearLimit
                ? 'font-medium text-yellow-600 dark:text-yellow-400'
                : 'text-gray-900 dark:text-white'
          }
        >
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-2 rounded-full ${
              isAtLimit
                ? 'bg-red-500'
                : isNearLimit
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function renderFeature(
  label: string,
  enabled: boolean
): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          enabled
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-400 dark:text-gray-600'
        }
      >
        {enabled ? '✓' : '✗'}
      </span>
      <span
        className={
          enabled
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-400 dark:text-gray-500'
        }
      >
        {label}
      </span>
    </div>
  );
}
