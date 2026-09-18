import type { SupabaseClient } from '@supabase/supabase-js';

interface CalendarEventParams {
  title: string;
  description: string;
  location: string;
  startDatetime: string; // ISO 8601
  endDatetime: string;   // ISO 8601
  organizerName: string;
  organizerEmail: string;
  attendeeName?: string;
  attendeeEmail?: string;
  calendarUid: string;
  sequence: number;
  bookingReference?: string;
}

function formatIcsDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  const lines: string[] = [];
  let remaining = line;
  while (remaining.length > 75) {
    lines.push(remaining.substring(0, 75));
    remaining = ' ' + remaining.substring(75);
  }
  lines.push(remaining);
  return lines.join('\r\n');
}

export function generateIcs(params: CalendarEventParams, method?: string): string {
  const now = formatIcsDate(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriveFlow//Booking//EN',
    'CALSCALE:GREGORIAN',
  ];

  if (method) {
    lines.push(`METHOD:${method}`);
  }

  lines.push(
    'BEGIN:VEVENT',
    `UID:${params.calendarUid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(params.startDatetime)}`,
    `DTEND:${formatIcsDate(params.endDatetime)}`,
    `SUMMARY:${escapeIcsText(params.title)}`,
    `DESCRIPTION:${escapeIcsText(params.description)}`,
    `LOCATION:${escapeIcsText(params.location)}`,
    `ORGANIZER;CN=${escapeIcsText(params.organizerName)}:mailto:${params.organizerEmail}`,
    `SEQUENCE:${params.sequence}`,
    `STATUS:CONFIRMED`,
  );

  if (params.attendeeEmail) {
    lines.push(
      `ATTENDEE;CN=${escapeIcsText(params.attendeeName || '')};RSVP=FALSE:mailto:${params.attendeeEmail}`
    );
  }

  // 24-hour reminder alarm
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Driving lesson reminder - ${escapeIcsText(params.title)}`,
    'END:VALARM',
    // 1-hour reminder alarm
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:Driving lesson in 1 hour - ${escapeIcsText(params.title)}`,
    'END:VALARM',
  );

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n');
}

export function generateCancellationIcs(params: CalendarEventParams): string {
  const now = formatIcsDate(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DriveFlow//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:CANCEL',
    'BEGIN:VEVENT',
    `UID:${params.calendarUid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(params.startDatetime)}`,
    `DTEND:${formatIcsDate(params.endDatetime)}`,
    `SUMMARY:CANCELLED: ${escapeIcsText(params.title)}`,
    `SEQUENCE:${params.sequence}`,
    `STATUS:CANCELLED`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n');
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  description: string;
  location: string;
  startDatetime: string;
  endDatetime: string;
}): string {
  const base = 'https://calendar.google.com/calendar/render';
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    details: params.description,
    location: params.location,
    dates: `${formatIcsDate(params.startDatetime)}/${formatIcsDate(params.endDatetime)}`,
  });
  return `${base}?${q.toString()}`;
}

export function buildOutlookCalendarUrl(params: {
  title: string;
  description: string;
  location: string;
  startDatetime: string;
  endDatetime: string;
}): string {
  const base = 'https://outlook.live.com/calendar/0/action/compose';
  const q = new URLSearchParams({
    rru: 'addevent',
    subject: params.title,
    body: params.description,
    location: params.location,
    startdt: params.startDatetime,
    enddt: params.endDatetime,
    path: '/calendar/action/compose',
  });
  return `${base}?${q.toString()}`;
}

export function generateCalendarUid(orgId: string, bookingId: string): string {
  return `booking-${bookingId}@${orgId}.driveflow.app`;
}

export function generateBookingReference(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `BMS-${hex}`;
}

export async function getBookingByCalendarToken(
  client: SupabaseClient,
  token: string
) {
  const { data, error } = await client
    .from('bookings')
    .select(`
      *,
      lesson_types(name),
      organizations(name, timezone, slug),
      instructors:instructor_id(
        profiles(full_name, email)
      )
    `)
    .eq('calendar_token', token)
    .single();

  if (error || !data) return null;
  return data;
}
