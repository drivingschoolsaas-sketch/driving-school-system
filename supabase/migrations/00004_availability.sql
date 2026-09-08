-- ==================================================
-- Migration: 00004_availability
-- Phase 6 — Availability System
-- ==================================================
-- Creates: availability_rules, availability_exceptions, blocked_times

-- ==================================================
-- Custom Types
-- ==================================================

CREATE TYPE day_of_week AS ENUM (
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);

CREATE TYPE blocked_time_reason AS ENUM (
  'lunch',
  'private_appointment',
  'vehicle_maintenance',
  'driving_test',
  'annual_leave',
  'sick_leave',
  'training',
  'admin_blocked',
  'other'
);

-- ==================================================
-- Availability Rules
-- ==================================================
-- Recurring weekly availability for instructors.
-- Example: John works Monday 08:00–17:00, Tuesday 08:00–17:00.

CREATE TABLE availability_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- An instructor can have at most one rule per day of week per org
  CONSTRAINT uq_availability_rule UNIQUE (organization_id, instructor_id, day_of_week),
  -- End must be after start
  CONSTRAINT chk_availability_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_rules_org ON availability_rules(organization_id);
CREATE INDEX idx_availability_rules_instructor ON availability_rules(instructor_id);
CREATE INDEX idx_availability_rules_lookup ON availability_rules(organization_id, instructor_id, day_of_week)
  WHERE is_active = true;

CREATE TRIGGER set_availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- Availability Exceptions
-- ==================================================
-- Date-specific overrides for an instructor's schedule.
-- Example: 15 September — unavailable; 18 September — 12:00–17:00 only.
-- If start_time/end_time are NULL, the instructor is fully unavailable that day.

CREATE TABLE availability_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One exception per instructor per date per org
  CONSTRAINT uq_availability_exception UNIQUE (organization_id, instructor_id, exception_date),
  -- If available, must have time range; if unavailable, must not
  CONSTRAINT chk_exception_times CHECK (
    (is_available = false AND start_time IS NULL AND end_time IS NULL)
    OR (is_available = true AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE INDEX idx_availability_exceptions_org ON availability_exceptions(organization_id);
CREATE INDEX idx_availability_exceptions_instructor ON availability_exceptions(instructor_id);
CREATE INDEX idx_availability_exceptions_lookup ON availability_exceptions(organization_id, instructor_id, exception_date);

CREATE TRIGGER set_availability_exceptions_updated_at
  BEFORE UPDATE ON availability_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- Blocked Times
-- ==================================================
-- Specific time blocks where an instructor is unavailable.
-- Used for lunch, appointments, leave, vehicle maintenance, etc.

CREATE TABLE blocked_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason blocked_time_reason NOT NULL DEFAULT 'other',
  notes TEXT,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_blocked_time_order CHECK (end_datetime > start_datetime)
);

CREATE INDEX idx_blocked_times_org ON blocked_times(organization_id);
CREATE INDEX idx_blocked_times_instructor ON blocked_times(instructor_id);
CREATE INDEX idx_blocked_times_range ON blocked_times(organization_id, instructor_id, start_datetime, end_datetime);

CREATE TRIGGER set_blocked_times_updated_at
  BEFORE UPDATE ON blocked_times
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- RLS Policies
-- ==================================================

ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- Availability Rules: members can read, admins can write
CREATE POLICY availability_rules_select ON availability_rules
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY availability_rules_insert ON availability_rules
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));

CREATE POLICY availability_rules_update ON availability_rules
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY availability_rules_delete ON availability_rules
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

-- Availability Exceptions: members can read, admins can write
CREATE POLICY availability_exceptions_select ON availability_exceptions
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY availability_exceptions_insert ON availability_exceptions
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));

CREATE POLICY availability_exceptions_update ON availability_exceptions
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY availability_exceptions_delete ON availability_exceptions
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

-- Blocked Times: members can read, admins can write
CREATE POLICY blocked_times_select ON blocked_times
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY blocked_times_insert ON blocked_times
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));

CREATE POLICY blocked_times_update ON blocked_times
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY blocked_times_delete ON blocked_times
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));
