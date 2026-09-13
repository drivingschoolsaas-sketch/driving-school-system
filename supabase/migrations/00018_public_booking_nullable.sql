-- ==================================================
-- Migration: 00018_public_booking_nullable
-- Allow public (unauthenticated) booking requests
-- ==================================================
-- Public visitors submitting booking requests have no
-- auth.users row or students row. Make student_id and
-- created_by nullable so the insert succeeds. The
-- customer info is stored in the notes field.

ALTER TABLE bookings ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN created_by DROP NOT NULL;
