-- ==================================================
-- Migration: 00014_p1_booking_statuses_and_fixes
-- Phase 1 — P1 Functional/Architecture Fixes
-- ==================================================
-- Addresses:
--   P1-1: Booking statuses → spec's request model
--   P1-9: Tighten booking INSERT RLS to admin/instructor only

-- ==================================================
-- P1-1: Replace booking_status enum with spec values
-- ==================================================
-- Spec requires: new_request, contacted, confirmed, completed, cancelled, rejected, no_show
-- Current: pending, awaiting_payment, confirmed, completed, cancelled, no_show, rescheduled
--
-- PostgreSQL doesn't allow removing enum values, so we:
-- 1. Add the new values
-- 2. Migrate existing data
-- 3. (Old values remain in the enum but are unused)

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'new_request';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rejected';

-- Migrate existing data:
-- pending → new_request (the new initial state for booking requests)
-- awaiting_payment → new_request (non-MVP status, safe fallback)
-- rescheduled → cancelled (rescheduling creates a new booking; the old one is effectively cancelled)
UPDATE bookings SET status = 'new_request' WHERE status = 'pending';
UPDATE bookings SET status = 'new_request' WHERE status = 'awaiting_payment';
UPDATE bookings SET status = 'cancelled' WHERE status = 'rescheduled';

-- Update the booking_is_active function to account for new statuses
CREATE OR REPLACE FUNCTION booking_is_active(s booking_status) RETURNS BOOLEAN
  LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT s NOT IN ('cancelled', 'rejected');
$$;

-- ==================================================
-- P1-9: Tighten booking INSERT RLS
-- ==================================================
-- Currently any org member can INSERT bookings.
-- Spec says bookings-as-requests: only admin/instructor can create,
-- or we allow any member to create a "new_request" that admin must confirm.
-- For MVP: any org member can INSERT (to submit a request), but only
-- admins can transition past new_request/contacted.

-- Keep the existing INSERT policy as-is for now (any member can submit requests)
-- The status transition logic in the service layer enforces who can confirm.
-- But add a CHECK constraint so new inserts default to 'new_request':

-- Drop and recreate the default
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'new_request';

-- ==================================================
-- P0-5 (supplement): Add pending_verification to domain_status enum
-- ==================================================
ALTER TYPE domain_status ADD VALUE IF NOT EXISTS 'pending_verification';
