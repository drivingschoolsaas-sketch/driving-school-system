// ==================================================
// Booking Notification Triggers
// ==================================================
// Fire-and-forget notification triggers for booking
// lifecycle events: confirmation, cancellation,
// completion (review request), and status changes.
// Never throws — failures are logged but don't block
// the booking action.

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendNotification } from '@/services/notification-service';
import { logger } from '@/lib/logging';

interface BookingNotificationParams {
  organizationId: string;
  bookingId: string;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  studentUserId: string;
  instructorName: string;
  lessonTypeName: string;
  startDatetime: string;
  endDatetime: string;
  pickupAddress: string | null;
  priceCents: number;
  schoolName: string;
  cancellationHours?: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildVariables(params: BookingNotificationParams): Record<string, string> {
  return {
    student_name: params.studentName,
    instructor_name: params.instructorName,
    lesson_type: params.lessonTypeName,
    date: formatDate(params.startDatetime),
    start_time: formatTime(params.startDatetime),
    end_time: formatTime(params.endDatetime),
    pickup_address: params.pickupAddress ?? 'TBA',
    school_name: params.schoolName,
    amount: `$${(params.priceCents / 100).toFixed(2)}`,
    cancellation_hours: String(params.cancellationHours ?? 24),
  };
}

/**
 * Safely send a notification — never throws.
 */
async function safeSend(
  client: SupabaseClient,
  params: BookingNotificationParams,
  notificationType: string,
  extraVars?: Record<string, string>
): Promise<void> {
  try {
    const variables = { ...buildVariables(params), ...extraVars };
    await sendNotification(client, {
      organizationId: params.organizationId,
      notificationType: notificationType as Parameters<typeof sendNotification>[1]['notificationType'],
      recipientUserId: params.studentUserId,
      recipientEmail: params.studentEmail ?? undefined,
      recipientPhone: params.studentPhone ?? undefined,
      recipientName: params.studentName,
      variables,
      bookingId: params.bookingId,
    });
  } catch (err) {
    logger.error('Failed to send booking notification', {
      notificationType,
      bookingId: params.bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// --------------------------------------------------
// Public Trigger Functions
// --------------------------------------------------

/**
 * Send booking confirmation email to student.
 * Called when a booking is confirmed.
 */
export function notifyBookingConfirmed(
  client: SupabaseClient,
  params: BookingNotificationParams
): void {
  // Fire and forget
  void safeSend(client, params, 'booking_confirmed');
}

/**
 * Send booking cancellation email to student.
 * Called when a booking is cancelled (by student or admin).
 */
export function notifyBookingCancelled(
  client: SupabaseClient,
  params: BookingNotificationParams,
  cancellationReason?: string
): void {
  void safeSend(client, params, 'booking_cancelled', {
    cancellation_reason: cancellationReason ?? 'No reason provided',
  });
}

/**
 * Send review request email after lesson completion.
 * Called when a booking transitions to 'completed'.
 */
export function notifyLessonCompleted(
  client: SupabaseClient,
  params: BookingNotificationParams,
  reviewUrl?: string
): void {
  void safeSend(client, params, 'review_request', {
    review_url: reviewUrl ?? '',
  });
}

/**
 * Send booking update notification.
 * Called when booking details change (time, instructor, etc.).
 */
export function notifyBookingChanged(
  client: SupabaseClient,
  params: BookingNotificationParams
): void {
  void safeSend(client, params, 'booking_changed');
}

/**
 * Send instructor reassignment notification.
 */
export function notifyInstructorReassigned(
  client: SupabaseClient,
  params: BookingNotificationParams,
  newInstructorName: string
): void {
  void safeSend(client, params, 'instructor_reassigned', {
    instructor_name: newInstructorName,
  });
}

/**
 * Send welcome email when a student is first created.
 */
export function notifyStudentWelcome(
  client: SupabaseClient,
  organizationId: string,
  studentUserId: string,
  studentName: string,
  studentEmail: string | null,
  schoolName: string
): void {
  if (!studentEmail) return;
  void (async () => {
    try {
      await sendNotification(client, {
        organizationId,
        notificationType: 'welcome' as Parameters<typeof sendNotification>[1]['notificationType'],
        recipientUserId: studentUserId,
        recipientEmail: studentEmail,
        recipientName: studentName,
        variables: {
          student_name: studentName,
          school_name: schoolName,
        },
      });
    } catch (err) {
      logger.error('Failed to send welcome notification', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}

/**
 * Send a booking confirmation email for a public (unauthenticated) booking.
 * Since there is no student record, we send directly using the visitor's email.
 */
export function notifyPublicBookingReceived(
  client: SupabaseClient,
  organizationId: string,
  customerEmail: string,
  customerName: string,
  instructorName: string,
  lessonTypeName: string,
  startDatetime: string,
  endDatetime: string,
  schoolName: string
): void {
  void (async () => {
    try {
      await sendNotification(client, {
        organizationId,
        notificationType: 'booking_confirmed' as Parameters<typeof sendNotification>[1]['notificationType'],
        recipientEmail: customerEmail,
        recipientName: customerName,
        variables: {
          student_name: customerName,
          instructor_name: instructorName,
          lesson_type: lessonTypeName,
          date: formatDate(startDatetime),
          start_time: formatTime(startDatetime),
          end_time: formatTime(endDatetime),
          pickup_address: 'TBA',
          school_name: schoolName,
          cancellation_hours: '24',
        },
      });
    } catch (err) {
      logger.error('Failed to send public booking confirmation', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}

// --------------------------------------------------
// Helper: Build params from booking + related data
// --------------------------------------------------

/**
 * Resolve a booking into notification params by fetching
 * related student, instructor, lesson type, and school data.
 * Returns null if any required data is missing.
 */
export async function resolveBookingNotificationParams(
  client: SupabaseClient,
  organizationId: string,
  bookingId: string
): Promise<BookingNotificationParams | null> {
  try {
    const { data: booking } = await client
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('organization_id', organizationId)
      .single();

    if (!booking) return null;

    const [studentRes, instructorRes, ltRes, orgRes, settingsRes] = await Promise.all([
      client
        .from('students')
        .select('display_name, email, phone, user_id')
        .eq('id', booking.student_id)
        .eq('organization_id', organizationId)
        .single(),
      client
        .from('instructors')
        .select('display_name')
        .eq('id', booking.instructor_id)
        .eq('organization_id', organizationId)
        .single(),
      client
        .from('lesson_types')
        .select('name')
        .eq('id', booking.lesson_type_id)
        .eq('organization_id', organizationId)
        .single(),
      client
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single(),
      client
        .from('school_settings')
        .select('cancellation_notice_hours')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ]);

    const student = studentRes.data as { display_name: string; email: string | null; phone: string | null; user_id: string } | null;
    const instructor = instructorRes.data as { display_name: string } | null;
    const lt = ltRes.data as { name: string } | null;
    const org = orgRes.data as { name: string } | null;
    const settings = settingsRes.data as { cancellation_notice_hours: number | null } | null;

    if (!student || !instructor || !lt || !org) return null;

    return {
      organizationId,
      bookingId,
      studentName: student.display_name,
      studentEmail: student.email,
      studentPhone: student.phone,
      studentUserId: student.user_id,
      instructorName: instructor.display_name,
      lessonTypeName: lt.name,
      startDatetime: booking.start_datetime,
      endDatetime: booking.end_datetime,
      pickupAddress: booking.pickup_address,
      priceCents: booking.price_cents,
      schoolName: org.name,
      cancellationHours: settings?.cancellation_notice_hours ?? 24,
    };
  } catch (err) {
    logger.error('Failed to resolve booking notification params', {
      bookingId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
