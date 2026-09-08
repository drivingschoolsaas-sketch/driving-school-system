-- ==================================================
-- Migration: 00003_driving_school_core
-- Phase 5 — Driving School Core Tables
-- ==================================================
-- Creates: instructors, students, vehicles, service_areas,
--          lesson_types, lesson_packages, school_settings

-- ==================================================
-- Custom Types
-- ==================================================

CREATE TYPE vehicle_status AS ENUM (
  'active',
  'maintenance',
  'retired'
);

CREATE TYPE lesson_type_status AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE transmission_type AS ENUM (
  'automatic',
  'manual',
  'both'
);

CREATE TYPE package_status AS ENUM (
  'active',
  'inactive',
  'archived'
);

-- ==================================================
-- Instructors
-- ==================================================
-- Links a user profile to instructor-specific data.
-- One user can be an instructor in multiple schools.

CREATE TABLE instructors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  bio TEXT,
  photo_url TEXT,
  license_number TEXT,
  license_expiry DATE,
  transmission_type transmission_type NOT NULL DEFAULT 'automatic',
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_daily_lessons INTEGER DEFAULT 8,
  default_lesson_duration INTEGER NOT NULL DEFAULT 60, -- minutes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A user can only be instructor once per organization
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_instructors_org ON instructors(organization_id);
CREATE INDEX idx_instructors_user ON instructors(user_id);
CREATE INDEX idx_instructors_active ON instructors(organization_id, is_active);

-- ==================================================
-- Students
-- ==================================================
-- Links a user profile to student-specific data.

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  pickup_address TEXT,
  pickup_suburb TEXT,
  pickup_postcode TEXT,
  learner_permit_number TEXT,
  permit_expiry DATE,
  preferred_transmission transmission_type DEFAULT 'automatic',
  preferred_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_students_org ON students(organization_id);
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_active ON students(organization_id, is_active);
CREATE INDEX idx_students_instructor ON students(preferred_instructor_id);

-- ==================================================
-- Vehicles
-- ==================================================

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "White Corolla"
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  registration TEXT,
  transmission transmission_type NOT NULL DEFAULT 'automatic',
  status vehicle_status NOT NULL DEFAULT 'active',
  assigned_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX idx_vehicles_status ON vehicles(organization_id, status);
CREATE INDEX idx_vehicles_instructor ON vehicles(assigned_instructor_id);

-- ==================================================
-- Service Areas
-- ==================================================
-- Areas where instructors provide lessons.
-- Can be linked to the organization or specific instructors.

CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Campbelltown"
  suburb TEXT,
  postcode TEXT,
  state TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_areas_org ON service_areas(organization_id);
CREATE INDEX idx_service_areas_active ON service_areas(organization_id, is_active);

-- Junction table: which instructors serve which areas
CREATE TABLE instructor_service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  service_area_id UUID NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE,
  travel_buffer_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(instructor_id, service_area_id)
);

CREATE INDEX idx_instructor_areas_instructor ON instructor_service_areas(instructor_id);
CREATE INDEX idx_instructor_areas_area ON instructor_service_areas(service_area_id);

-- ==================================================
-- Lesson Types
-- ==================================================

CREATE TABLE lesson_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Standard Lesson", "Test Preparation"
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL, -- in smallest currency unit
  transmission transmission_type NOT NULL DEFAULT 'automatic',
  status lesson_type_status NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true, -- visible on booking page
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_types_org ON lesson_types(organization_id);
CREATE INDEX idx_lesson_types_status ON lesson_types(organization_id, status);
CREATE INDEX idx_lesson_types_public ON lesson_types(organization_id, is_public, status);

-- ==================================================
-- Lesson Packages
-- ==================================================

CREATE TABLE lesson_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "5-Lesson Package", "Test-Day Bundle"
  description TEXT,
  lesson_type_id UUID NOT NULL REFERENCES lesson_types(id) ON DELETE CASCADE,
  lesson_count INTEGER NOT NULL, -- number of lessons included
  price_cents INTEGER NOT NULL, -- total package price
  savings_cents INTEGER NOT NULL DEFAULT 0, -- how much saved vs individual
  validity_days INTEGER, -- expiry after purchase (null = no expiry)
  status package_status NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packages_org ON lesson_packages(organization_id);
CREATE INDEX idx_packages_lesson_type ON lesson_packages(lesson_type_id);
CREATE INDEX idx_packages_status ON lesson_packages(organization_id, status);

-- ==================================================
-- School Settings
-- ==================================================
-- Per-organization configuration.
-- One row per organization, created during onboarding.

CREATE TABLE school_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Branding
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#2563eb', -- blue-600
  secondary_color TEXT DEFAULT '#1e40af', -- blue-800

  -- Contact
  contact_phone TEXT,
  contact_email TEXT,
  contact_address TEXT,

  -- Website content
  about_text TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  meta_title TEXT,
  meta_description TEXT,

  -- Social links
  social_facebook TEXT,
  social_instagram TEXT,
  social_google_review TEXT,
  social_tiktok TEXT,

  -- Booking rules
  min_booking_notice_hours INTEGER NOT NULL DEFAULT 24,
  max_advance_booking_days INTEGER NOT NULL DEFAULT 30,
  cancellation_notice_hours INTEGER NOT NULL DEFAULT 24,
  allow_online_booking BOOLEAN NOT NULL DEFAULT true,

  -- Operational
  default_lesson_duration INTEGER NOT NULL DEFAULT 60,
  default_travel_buffer_minutes INTEGER NOT NULL DEFAULT 15,
  default_transmission transmission_type NOT NULL DEFAULT 'automatic',

  -- Website sections visibility
  sections_enabled JSONB NOT NULL DEFAULT '["hero","packages","instructors","reviews","contact"]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(organization_id)
);

CREATE INDEX idx_school_settings_org ON school_settings(organization_id);

-- ==================================================
-- Updated-at Triggers
-- ==================================================

CREATE TRIGGER set_instructors_updated_at
  BEFORE UPDATE ON instructors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_service_areas_updated_at
  BEFORE UPDATE ON service_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_lesson_types_updated_at
  BEFORE UPDATE ON lesson_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_lesson_packages_updated_at
  BEFORE UPDATE ON lesson_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_school_settings_updated_at
  BEFORE UPDATE ON school_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- Row Level Security
-- ==================================================

ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

-- All Phase 5 tables: members can SELECT
CREATE POLICY instructors_select ON instructors
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY students_select ON students
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY vehicles_select ON vehicles
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY service_areas_select ON service_areas
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY lesson_types_select ON lesson_types
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY lesson_packages_select ON lesson_packages
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));
CREATE POLICY school_settings_select ON school_settings
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

-- Public access for lesson types and packages (visible on booking page)
CREATE POLICY lesson_types_public_select ON lesson_types
  FOR SELECT USING (is_public = true AND status = 'active');
CREATE POLICY lesson_packages_public_select ON lesson_packages
  FOR SELECT USING (is_public = true AND status = 'active');

-- Junction table: members can read
CREATE POLICY instructor_areas_select ON instructor_service_areas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instructors
      WHERE instructors.id = instructor_service_areas.instructor_id
      AND is_org_member(instructors.organization_id, auth.uid())
    )
  );

-- Admins can INSERT/UPDATE/DELETE
CREATE POLICY instructors_insert ON instructors
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));
CREATE POLICY instructors_update ON instructors
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));
CREATE POLICY instructors_delete ON instructors
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY students_insert ON students
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));
CREATE POLICY students_update ON students
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));
CREATE POLICY students_delete ON students
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY vehicles_insert ON vehicles
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));
CREATE POLICY vehicles_update ON vehicles
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));
CREATE POLICY vehicles_delete ON vehicles
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY service_areas_insert ON service_areas
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));
CREATE POLICY service_areas_update ON service_areas
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));
CREATE POLICY service_areas_delete ON service_areas
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY instructor_areas_insert ON instructor_service_areas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM instructors
      WHERE instructors.id = instructor_service_areas.instructor_id
      AND is_org_admin(instructors.organization_id, auth.uid())
    )
  );
CREATE POLICY instructor_areas_delete ON instructor_service_areas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM instructors
      WHERE instructors.id = instructor_service_areas.instructor_id
      AND is_org_admin(instructors.organization_id, auth.uid())
    )
  );

CREATE POLICY lesson_types_insert ON lesson_types
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));
CREATE POLICY lesson_types_update ON lesson_types
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));
CREATE POLICY lesson_types_delete ON lesson_types
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY lesson_packages_insert ON lesson_packages
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));
CREATE POLICY lesson_packages_update ON lesson_packages
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));
CREATE POLICY lesson_packages_delete ON lesson_packages
  FOR DELETE USING (is_org_admin(organization_id, auth.uid()));

CREATE POLICY school_settings_insert ON school_settings
  FOR INSERT WITH CHECK (is_org_admin(organization_id, auth.uid()));
CREATE POLICY school_settings_update ON school_settings
  FOR UPDATE USING (is_org_admin(organization_id, auth.uid()));
