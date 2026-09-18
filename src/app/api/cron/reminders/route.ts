import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { sendReminderEmail } from '@/services/booking-confirmation-service';
import { logger } from '@/lib/logging';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = getAdminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: bookings, error } = await client
    .from('bookings')
    .select('id, organization_id')
    .eq('status', 'confirmed')
    .is('reminder_24h_sent_at', null)
    .gte('start_datetime', now.toISOString())
    .lte('start_datetime', in24h.toISOString())
    .limit(50);

  if (error) {
    logger.error('Reminder cron: query failed', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (bookings ?? []) as Array<{ id: string; organization_id: string }>;

  let sent = 0;
  let failed = 0;

  for (const booking of rows) {
    try {
      const ok = await sendReminderEmail(client, booking.id, booking.organization_id);
      if (ok) sent++;
      else failed++;
    } catch (err) {
      failed++;
      logger.error('Reminder cron: send failed', {
        bookingId: booking.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('Reminder cron completed', { total: rows.length, sent, failed });

  return NextResponse.json({
    processed: rows.length,
    sent,
    failed,
  });
}
