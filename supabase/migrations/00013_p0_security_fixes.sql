-- ==================================================
-- Migration: 00013_p0_security_fixes
-- Phase 0 — P0 Security Fixes
-- ==================================================
-- Addresses:
--   P0-1: SECURITY DEFINER functions lack SET search_path
--   P0-6: organization_domains public SELECT too broad
--   P0-7: Cross-tenant foreign keys (composite FK protection)

-- ==================================================
-- P0-1: Add SET search_path to all SECURITY DEFINER functions
-- ==================================================
-- Without SET search_path, these functions are vulnerable to
-- search-path hijack attacks where an attacker creates objects
-- in the public schema that shadow system functions.

CREATE OR REPLACE FUNCTION is_org_member(
  _organization_id UUID,
  _user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_org_admin(
  _organization_id UUID,
  _user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND status = 'active'
      AND role IN ('school_owner', 'school_admin', 'platform_owner', 'platform_support')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_org_owner(
  _organization_id UUID,
  _user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND status = 'active'
      AND role IN ('school_owner', 'platform_owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- handle_new_user is also SECURITY DEFINER
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ==================================================
-- P0-6: Replace overly broad public SELECT on organization_domains
-- ==================================================
-- The current policy allows ANY user (or anon) to enumerate all
-- domain records. Replace with a function-based lookup that only
-- the tenant resolver (running as service role) can use broadly,
-- while regular users can only see their own org's domains.

DROP POLICY IF EXISTS org_domains_public_hostname_lookup ON organization_domains;

-- Org members can read their own org's domains
CREATE POLICY org_domains_select_member ON organization_domains
  FOR SELECT USING (
    is_org_member(organization_id, auth.uid())
  );

-- Note: The tenant resolver uses the service-role (admin) client
-- which bypasses RLS, so it can still look up any hostname.
-- No public policy is needed.

-- ==================================================
-- P0-7: Cross-tenant FK protection via composite unique constraints
-- ==================================================
-- Without composite FKs, a booking in Org A could reference an
-- instructor from Org B. We add composite unique constraints on
-- the parent tables, then replace simple FKs with composite ones.

-- Step 1: Add composite unique constraints on parent tables
-- These allow composite foreign keys to reference (id, organization_id)

ALTER TABLE instructors
  ADD CONSTRAINT uq_instructors_id_org UNIQUE (id, organization_id);

ALTER TABLE students
  ADD CONSTRAINT uq_students_id_org UNIQUE (id, organization_id);

ALTER TABLE vehicles
  ADD CONSTRAINT uq_vehicles_id_org UNIQUE (id, organization_id);

ALTER TABLE lesson_types
  ADD CONSTRAINT uq_lesson_types_id_org UNIQUE (id, organization_id);

ALTER TABLE service_areas
  ADD CONSTRAINT uq_service_areas_id_org UNIQUE (id, organization_id);

-- Step 2: Drop old simple FKs on bookings and re-add as composite

-- Drop the exclusion constraint first (it depends on columns)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS excl_instructor_overlap;

-- Drop old FKs
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_instructor_id_fkey;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_student_id_fkey;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_fkey;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_lesson_type_id_fkey;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_area_id_fkey;

-- Add composite FKs
ALTER TABLE bookings
  ADD CONSTRAINT bookings_instructor_org_fkey
    FOREIGN KEY (instructor_id, organization_id)
    REFERENCES instructors(id, organization_id)
    ON DELETE CASCADE;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_student_org_fkey
    FOREIGN KEY (student_id, organization_id)
    REFERENCES students(id, organization_id)
    ON DELETE CASCADE;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_vehicle_org_fkey
    FOREIGN KEY (vehicle_id, organization_id)
    REFERENCES vehicles(id, organization_id)
    ON DELETE SET NULL;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_lesson_type_org_fkey
    FOREIGN KEY (lesson_type_id, organization_id)
    REFERENCES lesson_types(id, organization_id)
    ON DELETE CASCADE;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_service_area_org_fkey
    FOREIGN KEY (service_area_id, organization_id)
    REFERENCES service_areas(id, organization_id)
    ON DELETE SET NULL;

-- Re-add the exclusion constraint for double-booking prevention
ALTER TABLE bookings ADD CONSTRAINT excl_instructor_overlap
  EXCLUDE USING gist (
    organization_id WITH =,
    instructor_id WITH =,
    tstzrange(start_datetime, end_datetime) WITH &&
  )
  WHERE (booking_is_active(status));

-- ==================================================
-- P0-5: Domain verification support
-- ==================================================
-- Add verification_token column for DNS TXT record verification.
-- Custom domains must prove DNS ownership before being marked verified.

ALTER TABLE organization_domains
  ADD COLUMN IF NOT EXISTS verification_token TEXT;
