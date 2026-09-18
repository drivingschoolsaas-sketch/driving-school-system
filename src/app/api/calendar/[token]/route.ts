import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { getBookingByCalendarToken, generateIcs } from '@/services/calendar-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const cleanToken = token.replace(/\.ics$/, '');

  const client = getAdminClient();
  const booking = await getBookingByCalendarToken(client, cleanToken);

  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const org = booking.organizations as { name: string; timezone: string; slug: string };
  const lessonType = booking.lesson_types as { name: string };
  const instructor = booking.instructors as { profiles: { full_name: string; email: string } } | null;

  const ics = generateIcs({
    title: `Driving Lesson — ${lessonType?.name || 'Lesson'}`,
    description: `Instructor: ${instructor?.profiles?.full_name || 'TBA'}\nPickup: ${booking.pickup_address || 'TBA'}`,
    location: booking.pickup_address || '',
    startDatetime: booking.start_datetime,
    endDatetime: booking.end_datetime,
    organizerName: org?.name || 'Driving School',
    organizerEmail: instructor?.profiles?.email || `noreply@${org?.slug || 'school'}.driveflow.app`,
    calendarUid: booking.calendar_uid || `booking-${booking.id}@driveflow.app`,
    sequence: booking.calendar_sequence || 0,
    bookingReference: booking.booking_reference,
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="lesson-${booking.booking_reference || booking.id}.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
