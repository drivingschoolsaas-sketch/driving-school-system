-- ==================================================
-- Migration: 00005_bookings
-- Phase 7 — Booking System
-- ==================================================
-- Creates: bookings, booking_status_history
-- Implements: conflict prevention via exclusion constraint

-- ==================================================
-- Extensions
-- ==================================================
-- btree_gist enables exclusion constraints on non-GiST types (UUID)
-- combined with range-based overlap checks.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ==================================================
-- Custom Types
-- ==================================================

CREATE TYPE booking_status AS ENUM (
  'pending',
  'awaiting_payment',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled'
);

-- ==================================================
-- Bookings
-- ==================================================
-- Core booking table. Each booking links an instructor,
-- student, and lesson type within an organization.
--
-- The exclusion constraint prevents double-booking:
-- no two non-cancelled bookings can overlap for the
-- same instructor in the same org.

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_type_id UUID NOT NULL REFERENCES lesson_types(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  pickup_address TEXT,
  pickup_suburb TEXT,
  pickup_postcode TEXT,
  service_area_id UUID REFERENCES service_areas(id) ON DELETE SET NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  admin_notes TEXT,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  rescheduled_from_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_booking_time_order CHECK (end_datetime > start_datetime),
  CONSTRAINT chk_booking_price CHECK (price_cents >= 0)
);

-- Exclusion constraint: prevent overlapping active bookings for the same instructor.
-- Only enforced for non-cancelled and non-rescheduled bookings.
-- Uses tstzrange for time overlap detection + btree_gist for UUID equality.
CREATE OR REPLACE FUNCTION booking_is_active(s booking_status) RETURNS BOOLEAN
  LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT s NOT IN ('cancelled', 'rescheduled');
$$;

ALTER TABLE bookings ADD CONSTRAINT excl_instructor_overlap
  EXCLUDE USING gist (
    organization_id WITH =,
    instructor_id WITH =,
    tstzrange(start_datetime, end_datetime) WITH &&
  )
  WHERE (booking_is_active(status));

-- Indexes
CREATE INDEX idx_bookings_org ON bookings(organization_id);
CREATE INDEX idx_bookings_instructor ON bookings(organization_id, instructor_id, start_datetime);
CREATE INDEX idx_bookings_student ON bookings(organization_id, student_id);
CREATE INDEX idx_bookings_status ON bookings(organization_id, status);
CREATE INDEX idx_bookings_date_range ON bookings(organization_id, start_datetime, end_datetime);

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- Booking Status History
-- ==================================================
-- Audit trail for every status change on a booking.

CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status booking_status,
  new_status booking_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_status_history_booking ON booking_status_history(booking_id);
CREATE INDEX idx_booking_status_history_created ON booking_status_history(booking_id, created_at);

-- ==================================================
-- RLS Policies
-- ==================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

-- Bookings: members can read, admins can write
CREATE POLICY bookings_select ON bookings
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY bookings_insert ON bookings
  FOR INSERT WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY bookings_update ON bookings
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY bookings_delete ON bookings
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

-- Booking status history: members can read, members can insert (via service)
CREATE POLICY booking_status_history_select ON booking_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_status_history.booking_id
      AND is_org_member(b.organization_id, auth.uid())
    )
  );

CREATE POLICY booking_status_history_insert ON booking_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_status_history.booking_id
      AND is_org_member(b.organization_id, auth.uid())
    )
  );
