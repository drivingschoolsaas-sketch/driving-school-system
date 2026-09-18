-- ==================================================
-- Migration 00021: Booking Confirmation Fields
-- ==================================================
-- Adds columns required for booking confirmation emails,
-- calendar integration, and reminder processing.

-- Confirmation tracking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS booking_reference TEXT;

-- Calendar integration
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS calendar_uid TEXT,
  ADD COLUMN IF NOT EXISTS calendar_sequence INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_token UUID DEFAULT gen_random_uuid();

-- Email/reminder tracking
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ;

-- Unique booking reference per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_reference
  ON bookings (organization_id, booking_reference)
  WHERE booking_reference IS NOT NULL;

-- Index for reminder cron: find confirmed bookings needing 24h reminder
CREATE INDEX IF NOT EXISTS idx_bookings_pending_reminders
  ON bookings (start_datetime)
  WHERE status = 'confirmed'
    AND reminder_24h_sent_at IS NULL;

-- Index for calendar token lookups (public ICS download)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_calendar_token
  ON bookings (calendar_token)
  WHERE calendar_token IS NOT NULL;
