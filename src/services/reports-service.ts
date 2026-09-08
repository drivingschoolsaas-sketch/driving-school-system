// ==================================================
// Reports Service
// ==================================================
// Advanced reporting for revenue, instructor
// performance, and booking analytics.
// Gated by advanced_reports_enabled entitlement.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';

// --------------------------------------------------
// Revenue Report
// --------------------------------------------------

export interface RevenueReport {
  totalRevenueCents: number;
  periodRevenueCents: number;
  refundedCents: number;
  netRevenueCents: number;
  paymentCount: number;
  averagePaymentCents: number;
  revenueByType: Array<{
    payment_type: string;
    total_cents: number;
    count: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    total_cents: number;
    count: number;
  }>;
}

/**
 * Generate a revenue report for an organization.
 */
export async function getRevenueReport(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: { startDate?: string; endDate?: string }
): Promise<RevenueReport> {
  const orgId = context.organizationId;
  const startDate = options?.startDate ?? getMonthsAgoISO(12);
  const endDate = options?.endDate ?? new Date().toISOString();

  // Get all succeeded payments in the period
  const { data: payments } = await client
    .from('payments')
    .select('amount_cents, amount_refunded_cents, payment_type, paid_at')
    .eq('organization_id', orgId)
    .eq('status', 'succeeded')
    .gte('paid_at', startDate)
    .lte('paid_at', endDate);

  const paymentList = (payments ?? []) as Array<{
    amount_cents: number;
    amount_refunded_cents: number;
    payment_type: string;
    paid_at: string;
  }>;

  // Get total all-time revenue
  const { data: allTimePayments } = await client
    .from('payments')
    .select('amount_cents, amount_refunded_cents')
    .eq('organization_id', orgId)
    .eq('status', 'succeeded');

  const allTime = (allTimePayments ?? []) as Array<{
    amount_cents: number;
    amount_refunded_cents: number;
  }>;

  const totalRevenueCents = allTime.reduce((sum, p) => sum + p.amount_cents, 0);

  const periodRevenueCents = paymentList.reduce(
    (sum, p) => sum + p.amount_cents,
    0
  );
  const refundedCents = paymentList.reduce(
    (sum, p) => sum + p.amount_refunded_cents,
    0
  );
  const netRevenueCents = periodRevenueCents - refundedCents;
  const paymentCount = paymentList.length;
  const averagePaymentCents =
    paymentCount > 0 ? Math.round(periodRevenueCents / paymentCount) : 0;

  // Revenue by type
  const typeMap = new Map<string, { total_cents: number; count: number }>();
  for (const p of paymentList) {
    const existing = typeMap.get(p.payment_type) ?? {
      total_cents: 0,
      count: 0,
    };
    existing.total_cents += p.amount_cents;
    existing.count += 1;
    typeMap.set(p.payment_type, existing);
  }
  const revenueByType = Array.from(typeMap.entries()).map(([type, data]) => ({
    payment_type: type,
    ...data,
  }));

  // Revenue by month
  const monthMap = new Map<string, { total_cents: number; count: number }>();
  for (const p of paymentList) {
    const month = p.paid_at.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(month) ?? { total_cents: 0, count: 0 };
    existing.total_cents += p.amount_cents;
    existing.count += 1;
    monthMap.set(month, existing);
  }
  const revenueByMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalRevenueCents,
    periodRevenueCents,
    refundedCents,
    netRevenueCents,
    paymentCount,
    averagePaymentCents,
    revenueByType,
    revenueByMonth,
  };
}

// --------------------------------------------------
// Instructor Performance Report
// --------------------------------------------------

export interface InstructorPerformance {
  instructorId: string;
  instructorName: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  completionRate: number;
  totalRevenueCents: number;
  averageRating: number | null;
  reviewCount: number;
}

/**
 * Generate instructor performance report.
 */
export async function getInstructorPerformanceReport(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: { startDate?: string; endDate?: string }
): Promise<InstructorPerformance[]> {
  const orgId = context.organizationId;
  const startDate = options?.startDate ?? getMonthsAgoISO(3);
  const endDate = options?.endDate ?? new Date().toISOString();

  // Get instructors
  const { data: instructors } = await client
    .from('instructors')
    .select('id, display_name')
    .eq('organization_id', orgId)
    .eq('is_active', true);

  if (!instructors || instructors.length === 0) return [];

  const results: InstructorPerformance[] = [];

  for (const instructor of instructors) {
    const inst = instructor as { id: string; display_name: string };

    // Get bookings in period
    const { data: bookings } = await client
      .from('bookings')
      .select('status, price_cents')
      .eq('organization_id', orgId)
      .eq('instructor_id', inst.id)
      .gte('start_datetime', startDate)
      .lte('start_datetime', endDate);

    const bookingList = (bookings ?? []) as Array<{
      status: string;
      price_cents: number;
    }>;

    const totalBookings = bookingList.length;
    const completedBookings = bookingList.filter(
      (b) => b.status === 'completed'
    ).length;
    const cancelledBookings = bookingList.filter(
      (b) => b.status === 'cancelled'
    ).length;
    const noShowBookings = bookingList.filter(
      (b) => b.status === 'no_show'
    ).length;
    const completionRate =
      totalBookings > 0 ? completedBookings / totalBookings : 0;
    const totalRevenueCents = bookingList
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + b.price_cents, 0);

    // Get reviews
    const { data: reviews } = await client
      .from('reviews')
      .select('rating')
      .eq('organization_id', orgId)
      .eq('instructor_id', inst.id)
      .in('status', ['approved', 'featured']);

    const reviewList = (reviews ?? []) as Array<{ rating: number }>;
    const reviewCount = reviewList.length;
    const averageRating =
      reviewCount > 0
        ? reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : null;

    results.push({
      instructorId: inst.id,
      instructorName: inst.display_name,
      totalBookings,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      completionRate,
      totalRevenueCents,
      averageRating,
      reviewCount,
    });
  }

  // Sort by completed bookings (most active first)
  return results.sort((a, b) => b.completedBookings - a.completedBookings);
}

// --------------------------------------------------
// Booking Analytics
// --------------------------------------------------

export interface BookingAnalytics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  completionRate: number;
  cancellationRate: number;
  bookingsByDay: Array<{ day: string; count: number }>;
  bookingsByLessonType: Array<{
    lesson_type_id: string;
    lesson_type_name: string;
    count: number;
  }>;
  peakHours: Array<{ hour: number; count: number }>;
}

/**
 * Generate booking analytics for an organization.
 */
export async function getBookingAnalytics(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: { startDate?: string; endDate?: string }
): Promise<BookingAnalytics> {
  const orgId = context.organizationId;
  const startDate = options?.startDate ?? getMonthsAgoISO(3);
  const endDate = options?.endDate ?? new Date().toISOString();

  // Get bookings with lesson type
  const { data: bookings } = await client
    .from('bookings')
    .select('status, start_datetime, lesson_type_id')
    .eq('organization_id', orgId)
    .gte('start_datetime', startDate)
    .lte('start_datetime', endDate);

  const bookingList = (bookings ?? []) as Array<{
    status: string;
    start_datetime: string;
    lesson_type_id: string;
  }>;

  // Get lesson types for names
  const { data: lessonTypes } = await client
    .from('lesson_types')
    .select('id, name')
    .eq('organization_id', orgId);

  const ltMap = new Map<string, string>();
  for (const lt of (lessonTypes ?? []) as Array<{
    id: string;
    name: string;
  }>) {
    ltMap.set(lt.id, lt.name);
  }

  const totalBookings = bookingList.length;
  const completedBookings = bookingList.filter(
    (b) => b.status === 'completed'
  ).length;
  const cancelledBookings = bookingList.filter(
    (b) => b.status === 'cancelled'
  ).length;
  const noShowBookings = bookingList.filter(
    (b) => b.status === 'no_show'
  ).length;
  const completionRate =
    totalBookings > 0 ? completedBookings / totalBookings : 0;
  const cancellationRate =
    totalBookings > 0 ? cancelledBookings / totalBookings : 0;

  // Bookings by day of week
  const dayMap = new Map<string, number>();
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  for (const b of bookingList) {
    const dayIndex = new Date(b.start_datetime).getDay();
    const day = days[dayIndex];
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const bookingsByDay = days.map((day) => ({
    day,
    count: dayMap.get(day) ?? 0,
  }));

  // Bookings by lesson type
  const ltCountMap = new Map<string, number>();
  for (const b of bookingList) {
    ltCountMap.set(
      b.lesson_type_id,
      (ltCountMap.get(b.lesson_type_id) ?? 0) + 1
    );
  }
  const bookingsByLessonType = Array.from(ltCountMap.entries())
    .map(([id, count]) => ({
      lesson_type_id: id,
      lesson_type_name: ltMap.get(id) ?? 'Unknown',
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Peak hours
  const hourMap = new Map<number, number>();
  for (const b of bookingList) {
    const hour = new Date(b.start_datetime).getHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }
  const peakHours = Array.from(hourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  return {
    totalBookings,
    completedBookings,
    cancelledBookings,
    noShowBookings,
    completionRate,
    cancellationRate,
    bookingsByDay,
    bookingsByLessonType,
    peakHours,
  };
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getMonthsAgoISO(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}
