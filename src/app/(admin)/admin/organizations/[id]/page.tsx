// ==================================================
// Platform Admin: Organization Detail Page
// ==================================================
// View and manage a single driving school organization.
// Shows school info, usage stats, subscription, domains,
// members, and admin actions (suspend/activate).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import {
  getOrganizationDetails,
} from '@/services/platform-admin-service';
import { OrgStatusActions } from './org-status-actions';
import { EditLimitsForm } from './edit-limits-form';
import { ResendInviteButton } from './resend-invite-button';
import { EditEmailButton } from './edit-email-button';
import type { Metadata } from 'next';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Organization Detail — Platform Admin',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({ params }: PageProps) {
  const { id } = await params;
  await getPlatformAdminContext();
  const client = getAdminClient();

  const org = await getOrganizationDetails(client, id);
  if (!org) notFound();

  // Fetch usage stats in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ac = client as any;
  const [studentsRes, instructorsRes, bookingsRes, domainsRes, membersRes, recentBookingsRes] =
    await Promise.all([
      ac.from('students').select('id', { count: 'exact', head: true }).eq('organization_id', id),
      ac.from('instructors').select('id', { count: 'exact', head: true }).eq('organization_id', id),
      ac.from('bookings').select('id', { count: 'exact', head: true }).eq('organization_id', id),
      ac.from('organization_domains').select('id, hostname, domain_type, status, is_primary, verified_at').eq('organization_id', id).order('is_primary', { ascending: false }),
      ac.from('organization_members').select('user_id, role, status, created_at').eq('organization_id', id).order('created_at'),
      ac.from('bookings').select('id, status, price_cents').eq('organization_id', id).not('status', 'in', '(cancelled,rejected)'),
    ]);

  const studentCount = studentsRes.count ?? 0;
  const instructorCount = instructorsRes.count ?? 0;
  const bookingCount = bookingsRes.count ?? 0;
  const domains = (domainsRes.data ?? []) as Array<{
    id: string;
    hostname: string;
    domain_type: string;
    status: string;
    is_primary: boolean;
    verified_at: string | null;
  }>;
  const membersRaw = (membersRes.data ?? []) as Array<{
    user_id: string;
    role: string;
    status: string;
    created_at: string;
  }>;

  // Look up user emails for all members
  const memberUserIds = membersRaw.map((m) => m.user_id);
  let userEmailMap = new Map<string, string>();
  if (memberUserIds.length > 0) {
    const { data: { users: authUsers } } = await client.auth.admin.listUsers({
      perPage: 100,
      page: 1,
    });
    if (authUsers) {
      for (const u of authUsers) {
        if (memberUserIds.includes(u.id) && u.email) {
          userEmailMap.set(u.id, u.email);
        }
      }
    }
  }

  const members = membersRaw.map((m) => ({
    ...m,
    email: userEmailMap.get(m.user_id) ?? null,
  }));
  const activeBookings = (recentBookingsRes.data ?? []) as Array<{
    price_cents: number;
    status: string;
  }>;
  const totalRevenueCents = activeBookings.reduce((sum: number, b: { price_cents: number }) => sum + (b.price_cents ?? 0), 0);

  const sub = Array.isArray(org.subscription) ? org.subscription[0] : org.subscription;
  const plan = sub?.plan;

  const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    trial: { label: 'Trial', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  };

  const DOMAIN_STATUS: Record<string, { label: string; className: string }> = {
    verified: { label: 'Verified', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    pending_verification: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  };

  const orgStatus = STATUS_CONFIG[org.status] ?? STATUS_CONFIG.cancelled;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400">
        <Link href="/admin/organizations" className="hover:underline">
          Organizations
        </Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900 dark:text-white">{org.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {org.name}
            </h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${orgStatus.className}`}>
              {orgStatus.label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>🏷️ {org.slug}</span>
            {org.email && <span>✉️ {org.email}</span>}
            {org.phone && <span>📞 {org.phone}</span>}
            <span>🌐 {org.timezone}</span>
            <span>🗓️ Created {new Date(org.created_at).toLocaleDateString('en-AU')}</span>
          </div>
        </div>
        <OrgStatusActions organizationId={id} currentStatus={org.status} />
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Students', value: studentCount, icon: '🎓' },
          { label: 'Instructors', value: instructorCount, icon: '🚗' },
          { label: 'Total Bookings', value: bookingCount, icon: '📋' },
          { label: 'Revenue', value: formatPrice(totalRevenueCents, org.currency), icon: '💰' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center"
          >
            <span className="text-xl">{stat.icon}</span>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Usage Limits */}
      <EditLimitsForm
        organizationId={id}
        currentMaxInstructors={org.max_instructors ?? null}
        currentMaxStudents={org.max_students ?? null}
        currentInstructorCount={instructorCount}
        currentStudentCount={studentCount}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subscription */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Subscription
          </h2>
          {sub ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Plan</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(plan as { name: string } | undefined)?.name ?? 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {sub.status}
                </span>
              </div>
              {sub.current_period_start && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Period Start</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(sub.current_period_start).toLocaleDateString('en-AU')}
                  </span>
                </div>
              )}
              {sub.current_period_end && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Period End</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(sub.current_period_end).toLocaleDateString('en-AU')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No subscription</p>
          )}
        </section>

        {/* Domains */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Domains ({domains.length})
          </h2>
          {domains.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No domains configured</p>
          ) : (
            <div className="space-y-2">
              {domains.map((d) => {
                const ds = DOMAIN_STATUS[d.status] ?? DOMAIN_STATUS.failed;
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {d.hostname}
                        </p>
                        {d.is_primary && (
                          <span className="rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-medium">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {d.domain_type.replaceAll('_', ' ')}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ds.className}`}>
                      {ds.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Members */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No members</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {members.map((m) => (
                  <tr key={m.user_id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2 pr-4 text-xs max-w-[300px]">
                      <div className="flex items-center gap-1">
                        <span className="truncate">{m.email ?? <span className="font-mono text-gray-400">{m.user_id.slice(0, 8)}…</span>}</span>
                        {m.email && (
                          <EditEmailButton
                            userId={m.user_id}
                            currentEmail={m.email}
                            organizationId={id}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 capitalize">
                      {m.role.replaceAll('_', ' ')}
                    </td>
                    <td className="py-2 pr-4 capitalize">{m.status}</td>
                    <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(m.created_at).toLocaleDateString('en-AU')}
                    </td>
                    <td className="py-2">
                      {m.email && (
                        <ResendInviteButton email={m.email} organizationId={id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
