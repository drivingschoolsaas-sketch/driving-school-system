// ==================================================
// Student Portal — Payments
// ==================================================
// Shows payment history based on bookings.
// Full payment integration (Stripe) is Phase 12.
// This page shows booking costs as a payment ledger.

import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import type { Booking, LessonType, StudentPackagePurchase, LessonPackage } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Payments',
};

export default async function PortalPaymentsPage() {
  const { auth, student, settings } = await getPortalContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const [bookingsRes, purchasesRes, lessonTypesRes, packagesRes] = await Promise.all([
    // Completed/confirmed bookings as payment records
    client
      .from('bookings')
      .select('*')
      .eq('organization_id', orgId)
      .eq('student_id', student.id)
      .in('status', ['completed', 'confirmed', 'awaiting_payment'])
      .order('start_datetime', { ascending: false })
      .limit(50),
    // Package purchases
    client
      .from('student_package_purchases')
      .select('*')
      .eq('organization_id', orgId)
      .eq('student_id', student.id)
      .order('purchased_at', { ascending: false }),
    client
      .from('lesson_types')
      .select('*')
      .eq('organization_id', orgId),
    client
      .from('lesson_packages')
      .select('*')
      .eq('organization_id', orgId),
  ]);

  const bookings = (bookingsRes.data ?? []) as Booking[];
  const purchases = (purchasesRes.data ?? []) as StudentPackagePurchase[];
  const ltMap = new Map((lessonTypesRes.data ?? []).map((lt: LessonType) => [lt.id, lt]));
  const pkgMap = new Map((packagesRes.data ?? []).map((p: LessonPackage) => [p.id, p]));

  // Build unified payment timeline
  type PaymentItem = {
    id: string;
    date: string;
    description: string;
    amountCents: number;
    type: 'lesson' | 'package';
    status: string;
  };

  const items: PaymentItem[] = [
    ...bookings.map((b) => ({
      id: b.id,
      date: b.start_datetime,
      description: ltMap.get(b.lesson_type_id)?.name ?? 'Lesson',
      amountCents: b.price_cents,
      type: 'lesson' as const,
      status: b.status,
    })),
    ...purchases.map((p) => ({
      id: p.id,
      date: p.purchased_at,
      description: pkgMap.get(p.lesson_package_id)?.name ?? 'Package',
      amountCents: p.price_paid_cents,
      type: 'package' as const,
      status: p.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPaidCents = items.reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your lesson and package payment history.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
        <p className="text-3xl font-bold mt-1" style={{ color: primaryColor }}>
          ${(totalPaidCents / 100).toFixed(2)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {items.length} transaction{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Payment list */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No payment history yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((item) => {
            const date = new Date(item.date);

            return (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                <span className="text-lg shrink-0">
                  {item.type === 'package' ? '📦' : '📋'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                  ${(item.amountCents / 100).toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center italic">
        Online payment processing coming soon. Contact your school for payment arrangements.
      </p>
    </div>
  );
}
