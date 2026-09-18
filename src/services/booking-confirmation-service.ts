import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import { logger } from '@/lib/logging';
import { getEmailProvider } from '@/lib/notification-provider';
import {
  generateCalendarUid,
  generateBookingReference,
  generateIcs,
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
} from '@/services/calendar-service';
import {
  renderConfirmationEmail,
  renderReminderEmail,
  renderRescheduleEmail,
  renderCancellationEmail,
} from '@/services/email-templates';

interface ConfirmationContext {
  booking: Record<string, unknown>;
  student: { display_name: string; email: string | null; user_id: string };
  instructor: { display_name: string; email: string | null };
  lessonType: { name: string };
  org: { name: string; timezone: string; slug: string };
  settings: {
    primary_color: string | null;
    logo_url: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    cancellation_notice_hours: number | null;
  } | null;
}

async function resolveConfirmationContext(
  client: SupabaseClient,
  organizationId: string,
  bookingId: string
): Promise<ConfirmationContext | null> {
  const { data: booking } = await client
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('organization_id', organizationId)
    .single();

  if (!booking || !booking.student_id) return null;

  const [studentRes, instructorRes, ltRes, orgRes, settingsRes] = await Promise.all([
    client.from('students').select('display_name, email, user_id')
      .eq('id', booking.student_id).eq('organization_id', organizationId).single(),
    client.from('instructors').select('display_name, email')
      .eq('id', booking.instructor_id).eq('organization_id', organizationId).single(),
    client.from('lesson_types').select('name')
      .eq('id', booking.lesson_type_id).eq('organization_id', organizationId).single(),
    client.from('organizations').select('name, timezone, slug')
      .eq('id', organizationId).single(),
    client.from('school_settings').select('primary_color, logo_url, contact_phone, contact_email, cancellation_notice_hours')
      .eq('organization_id', organizationId).maybeSingle(),
  ]);

  if (!studentRes.data || !instructorRes.data || !ltRes.data || !orgRes.data) return null;

  return {
    booking,
    student: studentRes.data as ConfirmationContext['student'],
    instructor: instructorRes.data as ConfirmationContext['instructor'],
    lessonType: ltRes.data as ConfirmationContext['lessonType'],
    org: orgRes.data as ConfirmationContext['org'],
    settings: settingsRes.data as ConfirmationContext['settings'],
  };
}

function formatDateInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz,
  });
}

function formatTimeInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: '2-digit', minute: '2-digit', timeZone: tz,
  });
}

function buildEmailData(ctx: ConfirmationContext, appUrl: string) {
  const tz = ctx.org.timezone || 'Australia/Sydney';
  const calendarUid = (ctx.booking.calendar_uid as string) || '';
  const calendarToken = (ctx.booking.calendar_token as string) || '';
  const bookingRef = (ctx.booking.booking_reference as string) || '';

  const calParams = {
    title: `Driving Lesson — ${ctx.lessonType.name}`,
    description: `Instructor: ${ctx.instructor.display_name}\nPickup: ${(ctx.booking.pickup_address as string) || 'TBA'}\nRef: ${bookingRef}`,
    location: (ctx.booking.pickup_address as string) || '',
    startDatetime: ctx.booking.start_datetime as string,
    endDatetime: ctx.booking.end_datetime as string,
  };

  return {
    studentName: ctx.student.display_name,
    lessonType: ctx.lessonType.name,
    date: formatDateInTz(ctx.booking.start_datetime as string, tz),
    startTime: formatTimeInTz(ctx.booking.start_datetime as string, tz),
    endTime: formatTimeInTz(ctx.booking.end_datetime as string, tz),
    instructorName: ctx.instructor.display_name,
    pickupAddress: (ctx.booking.pickup_address as string) || '',
    bookingReference: bookingRef,
    schoolName: ctx.org.name,
    schoolPhone: ctx.settings?.contact_phone || undefined,
    schoolEmail: ctx.settings?.contact_email || undefined,
    primaryColor: ctx.settings?.primary_color || undefined,
    logoUrl: ctx.settings?.logo_url || undefined,
    cancellationHours: ctx.settings?.cancellation_notice_hours ?? 24,
    googleCalendarUrl: buildGoogleCalendarUrl(calParams),
    outlookCalendarUrl: buildOutlookCalendarUrl(calParams),
    icsDownloadUrl: calendarToken ? `${appUrl}/api/calendar/${calendarToken}.ics` : undefined,
  };
}

export async function confirmBookingAndNotify(
  client: SupabaseClient,
  auth: AuthorizedContext,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await resolveConfirmationContext(client, auth.organizationId, bookingId);
  if (!ctx) return { success: false, error: 'Could not resolve booking data' };

  if (!ctx.student.email) {
    logger.warn('No student email for confirmation', { bookingId });
    return { success: false, error: 'Student has no email address' };
  }

  const calendarUid = generateCalendarUid(auth.organizationId, bookingId);
  const bookingReference = (ctx.booking.booking_reference as string) || generateBookingReference();

  const { error: updateErr } = await client
    .from('bookings')
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_by: auth.userId,
      calendar_uid: calendarUid,
      booking_reference: bookingReference,
    })
    .eq('id', bookingId)
    .eq('organization_id', auth.organizationId);

  if (updateErr) {
    logger.error('Failed to update booking confirmation fields', { bookingId, error: updateErr.message });
    return { success: false, error: updateErr.message };
  }

  ctx.booking.calendar_uid = calendarUid;
  ctx.booking.booking_reference = bookingReference;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://driveflow.com.au';
  const emailData = buildEmailData(ctx, appUrl);
  const { subject, html } = renderConfirmationEmail(emailData);

  const provider = getEmailProvider();
  const fromEmail = process.env.RESEND_FROM_EMAIL || `noreply@${ctx.org.slug}.driveflow.app`;

  const result = await provider.send({
    to: ctx.student.email!,
    from: fromEmail,
    fromName: ctx.org.name,
    subject,
    html,
    replyTo: ctx.settings?.contact_email || undefined,
  });

  if (result.success) {
    await client.from('bookings').update({
      confirmation_email_sent_at: new Date().toISOString(),
    }).eq('id', bookingId).eq('organization_id', auth.organizationId);
  } else {
    logger.error('Confirmation email failed', { bookingId, error: result.error });
  }

  return { success: true };
}

export async function sendRescheduleNotification(
  client: SupabaseClient,
  organizationId: string,
  bookingId: string
): Promise<void> {
  const ctx = await resolveConfirmationContext(client, organizationId, bookingId);
  if (!ctx || !ctx.student.email) return;

  const newSequence = ((ctx.booking.calendar_sequence as number) || 0) + 1;
  await client.from('bookings').update({
    calendar_sequence: newSequence,
    reminder_24h_sent_at: null,
  }).eq('id', bookingId).eq('organization_id', organizationId);

  ctx.booking.calendar_sequence = newSequence;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://driveflow.com.au';
  const emailData = buildEmailData(ctx, appUrl);
  const { subject, html } = renderRescheduleEmail(emailData);

  const provider = getEmailProvider();
  const fromEmail = process.env.RESEND_FROM_EMAIL || `noreply@${ctx.org.slug}.driveflow.app`;

  await provider.send({
    to: ctx.student.email!,
    from: fromEmail,
    fromName: ctx.org.name,
    subject,
    html,
    replyTo: ctx.settings?.contact_email || undefined,
  });
}

export async function sendCancellationNotification(
  client: SupabaseClient,
  organizationId: string,
  bookingId: string,
  reason?: string
): Promise<void> {
  const ctx = await resolveConfirmationContext(client, organizationId, bookingId);
  if (!ctx || !ctx.student.email) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://driveflow.com.au';
  const emailData = { ...buildEmailData(ctx, appUrl), cancellationReason: reason };
  const { subject, html } = renderCancellationEmail(emailData);

  const provider = getEmailProvider();
  const fromEmail = process.env.RESEND_FROM_EMAIL || `noreply@${ctx.org.slug}.driveflow.app`;

  await provider.send({
    to: ctx.student.email!,
    from: fromEmail,
    fromName: ctx.org.name,
    subject,
    html,
    replyTo: ctx.settings?.contact_email || undefined,
  });
}

export async function sendReminderEmail(
  client: SupabaseClient,
  bookingId: string,
  organizationId: string
): Promise<boolean> {
  const ctx = await resolveConfirmationContext(client, organizationId, bookingId);
  if (!ctx || !ctx.student.email) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://driveflow.com.au';
  const emailData = buildEmailData(ctx, appUrl);
  const { subject, html } = renderReminderEmail(emailData);

  const provider = getEmailProvider();
  const fromEmail = process.env.RESEND_FROM_EMAIL || `noreply@${ctx.org.slug}.driveflow.app`;

  const result = await provider.send({
    to: ctx.student.email!,
    from: fromEmail,
    fromName: ctx.org.name,
    subject,
    html,
    replyTo: ctx.settings?.contact_email || undefined,
  });

  if (result.success) {
    await client.from('bookings').update({
      reminder_24h_sent_at: new Date().toISOString(),
    }).eq('id', bookingId).eq('organization_id', organizationId);
  }

  return result.success;
}
