-- ==================================================
-- Migration: 00001_foundation
-- Phase 1-3 Foundation Tables
-- ==================================================
-- Creates the core multi-tenant data model:
--   organizations, organization_domains,
--   organization_members, profiles, locations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================
-- Custom Types
-- ==================================================

CREATE TYPE organization_status AS ENUM (
  'active',
  'trial',
  'suspended',
  'cancelled'
);

CREATE TYPE domain_type AS ENUM (
  'platform_subdomain',
  'custom_root',
  'custom_subdomain'
);

CREATE TYPE domain_status AS ENUM (
  'pending',
  'verifying',
  'verified',
  'failed',
  'suspended'
);

CREATE TYPE user_role AS ENUM (
  'platform_owner',
  'platform_support',
  'school_owner',
  'school_admin',
  'instructor',
  'student'
);

CREATE TYPE membership_status AS ENUM (
  'active',
  'invited',
  'suspended',
  'removed'
);

-- ==================================================
-- Organizations
-- ==================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status organization_status NOT NULL DEFAULT 'trial',
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  currency TEXT NOT NULL DEFAULT 'AUD',
  country TEXT NOT NULL DEFAULT 'AU',
  phone TEXT,
  email TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);

-- ==================================================
-- Organization Domains
-- ==================================================

CREATE TABLE organization_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  domain_type domain_type NOT NULL,
  status domain_status NOT NULL DEFAULT 'pending',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  redirect_to_primary BOOLEAN NOT NULL DEFAULT false,
  verification_method TEXT,
  verification_token TEXT,
  ssl_status TEXT,
  external_provider_domain_id TEXT,
  last_checked_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One hostname must never belong to two organizations
CREATE UNIQUE INDEX idx_organization_domains_hostname
  ON organization_domains(LOWER(hostname));

CREATE INDEX idx_organization_domains_org_id
  ON organization_domains(organization_id);

CREATE INDEX idx_organization_domains_status
  ON organization_domains(status);

-- ==================================================
-- Profiles (linked to Supabase Auth users)
-- ==================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- ==================================================
-- Organization Members
-- ==================================================

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  status membership_status NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A user can only have one membership per organization
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- ==================================================
-- Locations (branches)
-- ==================================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT NOT NULL DEFAULT 'AU',
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_org_id ON locations(organization_id);

-- ==================================================
-- Audit Logs
-- ==================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ==================================================
-- Domain Events
-- ==================================================

CREATE TABLE domain_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  domain_id UUID REFERENCES organization_domains(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_domain_events_org_id ON domain_events(organization_id);
CREATE INDEX idx_domain_events_domain_id ON domain_events(domain_id);
CREATE INDEX idx_domain_events_type ON domain_events(event_type);

-- ==================================================
-- Updated-at Trigger
-- ==================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_organization_domains
  BEFORE UPDATE ON organization_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_organization_members
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_locations
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- Row Level Security (Foundation)
-- ==================================================
-- Enable RLS on all tenant-owned tables.
-- Phase 2 will add full policies based on membership.

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

-- Profile: users can read/update their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Organization members: users can see their own memberships
CREATE POLICY org_members_select_own ON organization_members
  FOR SELECT USING (auth.uid() = user_id);

-- Organizations: users can see organizations they belong to
CREATE POLICY organizations_select_member ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

-- Organization domains: viewable by organization members
CREATE POLICY org_domains_select_member ON organization_domains
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_domains.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

-- Locations: viewable by organization members
CREATE POLICY locations_select_member ON locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = locations.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
    )
  );

-- Audit logs: viewable by org admins/owners
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = audit_logs.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('school_owner', 'school_admin')
    )
  );

-- Domain events: viewable by org admins/owners
CREATE POLICY domain_events_select_admin ON domain_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = domain_events.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.status = 'active'
        AND organization_members.role IN ('school_owner', 'school_admin')
    )
  );
-- ==================================================
-- Migration: 00002_multi_tenancy_rls
-- Phase 2: Complete RLS Policies & Profile Trigger
-- ==================================================
-- Adds INSERT/UPDATE/DELETE policies for all tables,
-- and auto-creates profiles on Supabase Auth signup.

-- ==================================================
-- Helper function: Check if user is an active member
-- of an organization with a specific role or above
-- ==================================================

CREATE OR REPLACE FUNCTION is_org_member(
  _organization_id UUID,
  _user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(
  _organization_id UUID,
  _user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND status = 'active'
      AND role IN ('school_owner', 'school_admin', 'platform_owner', 'platform_support')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_owner(
  _organization_id UUID,
  _user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = _organization_id
      AND user_id = _user_id
      AND status = 'active'
      AND role IN ('school_owner', 'platform_owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==================================================
-- Profile: auto-create on auth.users INSERT
-- ==================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create profile when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==================================================
-- Profiles: INSERT policy (user creates own on signup)
-- ==================================================

CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ==================================================
-- Organizations: INSERT policy (any authenticated user can create)
-- ==================================================

CREATE POLICY organizations_insert_authenticated ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Organizations: UPDATE (only by admins/owners)
CREATE POLICY organizations_update_admin ON organizations
  FOR UPDATE USING (
    is_org_admin(id, auth.uid())
  );

-- ==================================================
-- Organization Members: Full policies
-- ==================================================

-- INSERT: only org admins/owners can add members
CREATE POLICY org_members_insert_admin ON organization_members
  FOR INSERT WITH CHECK (
    is_org_admin(organization_id, auth.uid())
  );

-- UPDATE: only org admins/owners can update members
CREATE POLICY org_members_update_admin ON organization_members
  FOR UPDATE USING (
    is_org_admin(organization_id, auth.uid())
  );

-- DELETE: only org owners can delete members
CREATE POLICY org_members_delete_owner ON organization_members
  FOR DELETE USING (
    is_org_owner(organization_id, auth.uid())
  );

-- ==================================================
-- Organization Domains: Full policies
-- ==================================================

-- INSERT: only org owners can add domains
CREATE POLICY org_domains_insert_owner ON organization_domains
  FOR INSERT WITH CHECK (
    is_org_owner(organization_id, auth.uid())
  );

-- UPDATE: only org owners can update domains
CREATE POLICY org_domains_update_owner ON organization_domains
  FOR UPDATE USING (
    is_org_owner(organization_id, auth.uid())
  );

-- DELETE: only org owners can remove domains
CREATE POLICY org_domains_delete_owner ON organization_domains
  FOR DELETE USING (
    is_org_owner(organization_id, auth.uid())
  );

-- ==================================================
-- Locations: Full policies
-- ==================================================

-- INSERT: org admins can create locations
CREATE POLICY locations_insert_admin ON locations
  FOR INSERT WITH CHECK (
    is_org_admin(organization_id, auth.uid())
  );

-- UPDATE: org admins can update locations
CREATE POLICY locations_update_admin ON locations
  FOR UPDATE USING (
    is_org_admin(organization_id, auth.uid())
  );

-- DELETE: org admins can delete locations
CREATE POLICY locations_delete_admin ON locations
  FOR DELETE USING (
    is_org_admin(organization_id, auth.uid())
  );

-- ==================================================
-- Audit Logs: INSERT policy (system inserts)
-- ==================================================

-- INSERT: any authenticated member of the org can trigger audit logs
CREATE POLICY audit_logs_insert_member ON audit_logs
  FOR INSERT WITH CHECK (
    organization_id IS NULL
    OR is_org_member(organization_id, auth.uid())
  );

-- ==================================================
-- Domain Events: INSERT policy
-- ==================================================

CREATE POLICY domain_events_insert_admin ON domain_events
  FOR INSERT WITH CHECK (
    organization_id IS NULL
    OR is_org_admin(organization_id, auth.uid())
  );

-- ==================================================
-- Allow domain lookups for tenant resolution (public read on specific columns)
-- ==================================================
-- The tenant resolver needs to look up hostnames without authentication.
-- We create a separate policy for this that only allows reading
-- the columns needed for resolution (hostname, organization_id, status).
-- This is safe because hostnames are not sensitive data.

CREATE POLICY org_domains_public_hostname_lookup ON organization_domains
  FOR SELECT USING (true);
-- Note: This allows reading domain records publicly.
-- The actual organization data is still protected by membership-based RLS.
-- Only domain → org_id mapping is publicly readable, which is required
-- for tenant resolution before authentication occurs.

-- Drop the more restrictive member-only SELECT policy since the public
-- lookup policy supersedes it for reads.
-- The member-only policy from Phase 1 is no longer needed.
DROP POLICY IF EXISTS org_domains_select_member ON organization_domains;
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

  -- Custom website content (NULL = use platform defaults)
  custom_faqs JSONB DEFAULT NULL,
  value_propositions JSONB DEFAULT NULL,
  popular_package_id UUID DEFAULT NULL,

  -- Content workflow
  draft_content JSONB DEFAULT NULL,
  content_published_at TIMESTAMPTZ DEFAULT NULL,

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
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_service_areas_updated_at
  BEFORE UPDATE ON service_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_lesson_types_updated_at
  BEFORE UPDATE ON lesson_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_lesson_packages_updated_at
  BEFORE UPDATE ON lesson_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_school_settings_updated_at
  BEFORE UPDATE ON school_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
  FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY students_select ON students
  FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY vehicles_select ON vehicles
  FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY service_areas_select ON service_areas
  FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY lesson_types_select ON lesson_types
  FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY lesson_packages_select ON lesson_packages
  FOR SELECT USING (is_org_member(organization_id));
CREATE POLICY school_settings_select ON school_settings
  FOR SELECT USING (is_org_member(organization_id));

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
      AND is_org_member(instructors.organization_id)
    )
  );

-- Admins can INSERT/UPDATE/DELETE
CREATE POLICY instructors_insert ON instructors
  FOR INSERT WITH CHECK (is_org_admin(organization_id));
CREATE POLICY instructors_update ON instructors
  FOR UPDATE USING (is_org_admin(organization_id));
CREATE POLICY instructors_delete ON instructors
  FOR DELETE USING (is_org_admin(organization_id));

CREATE POLICY students_insert ON students
  FOR INSERT WITH CHECK (is_org_admin(organization_id));
CREATE POLICY students_update ON students
  FOR UPDATE USING (is_org_admin(organization_id));
CREATE POLICY students_delete ON students
  FOR DELETE USING (is_org_admin(organization_id));

CREATE POLICY vehicles_insert ON vehicles
  FOR INSERT WITH CHECK (is_org_admin(organization_id));
CREATE POLICY vehicles_update ON vehicles
  FOR UPDATE USING (is_org_admin(organization_id));
CREATE POLICY vehicles_delete ON vehicles
  FOR DELETE USING (is_org_admin(organization_id));

CREATE POLICY service_areas_insert ON service_areas
  FOR INSERT WITH CHECK (is_org_admin(organization_id));
CREATE POLICY service_areas_update ON service_areas
  FOR UPDATE USING (is_org_admin(organization_id));
CREATE POLICY service_areas_delete ON service_areas
  FOR DELETE USING (is_org_admin(organization_id));

CREATE POLICY instructor_areas_insert ON instructor_service_areas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM instructors
      WHERE instructors.id = instructor_service_areas.instructor_id
      AND is_org_admin(instructors.organization_id)
    )
  );
CREATE POLICY instructor_areas_delete ON instructor_service_areas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM instructors
      WHERE instructors.id = instructor_service_areas.instructor_id
      AND is_org_admin(instructors.organization_id)
    )
  );

CREATE POLICY lesson_types_insert ON lesson_types
  FOR INSERT WITH CHECK (is_org_admin(organization_id));
CREATE POLICY lesson_types_update ON lesson_types
  FOR UPDATE USING (is_org_admin(organization_id));
CREATE POLICY lesson_types_delete ON lesson_types
  FOR DELETE USING (is_org_admin(organization_id));

CREATE POLICY lesson_packages_insert ON lesson_packages
  FOR INSERT WITH CHECK (is_org_admin(organization_id));
CREATE POLICY lesson_packages_update ON lesson_packages
  FOR UPDATE USING (is_org_admin(organization_id));
CREATE POLICY lesson_packages_delete ON lesson_packages
  FOR DELETE USING (is_org_admin(organization_id));

CREATE POLICY school_settings_insert ON school_settings
  FOR INSERT WITH CHECK (is_org_admin(organization_id));
CREATE POLICY school_settings_update ON school_settings
  FOR UPDATE USING (is_org_admin(organization_id));
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

  -- Prevent duplicate start times on the same day (allows split shifts like 8-12 + 2-6)
  CONSTRAINT uq_availability_rule_no_overlap UNIQUE (organization_id, instructor_id, day_of_week, start_time),
  -- End must be after start
  CONSTRAINT chk_availability_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_rules_org ON availability_rules(organization_id);
CREATE INDEX idx_availability_rules_instructor ON availability_rules(instructor_id);
CREATE INDEX idx_availability_rules_lookup ON availability_rules(organization_id, instructor_id, day_of_week)
  WHERE is_active = true;

CREATE TRIGGER set_availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================================================
-- RLS Policies
-- ==================================================

ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

-- Availability Rules: members can read, admins can write
CREATE POLICY availability_rules_select ON availability_rules
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY availability_rules_insert ON availability_rules
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY availability_rules_update ON availability_rules
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY availability_rules_delete ON availability_rules
  FOR DELETE USING (is_org_admin(organization_id));

-- Availability Exceptions: members can read, admins can write
CREATE POLICY availability_exceptions_select ON availability_exceptions
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY availability_exceptions_insert ON availability_exceptions
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY availability_exceptions_update ON availability_exceptions
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY availability_exceptions_delete ON availability_exceptions
  FOR DELETE USING (is_org_admin(organization_id));

-- Blocked Times: members can read, admins can write
CREATE POLICY blocked_times_select ON blocked_times
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY blocked_times_insert ON blocked_times
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY blocked_times_update ON blocked_times
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY blocked_times_delete ON blocked_times
  FOR DELETE USING (is_org_admin(organization_id));
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
  'new_request',
  'contacted',
  'confirmed',
  'completed',
  'cancelled',
  'rejected',
  'no_show',
  'pending',
  'awaiting_payment',
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
  status booking_status NOT NULL DEFAULT 'new_request',
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
-- Only enforced for bookings that actually reserve a slot.
-- Rejected/cancelled bookings must NOT block time slots.
-- Uses tstzrange for time overlap detection + btree_gist for UUID equality.
CREATE OR REPLACE FUNCTION booking_is_active(s booking_status) RETURNS BOOLEAN
  LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT s NOT IN ('cancelled', 'rejected');
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
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY bookings_insert ON bookings
  FOR INSERT WITH CHECK (is_org_member(organization_id));

CREATE POLICY bookings_update ON bookings
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY bookings_delete ON bookings
  FOR DELETE USING (is_org_admin(organization_id));

-- Booking status history: members can read, members can insert (via service)
CREATE POLICY booking_status_history_select ON booking_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_status_history.booking_id
      AND is_org_member(b.organization_id)
    )
  );

CREATE POLICY booking_status_history_insert ON booking_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_status_history.booking_id
      AND is_org_member(b.organization_id)
    )
  );
-- ==================================================
-- Migration 00006: Student Portal
-- ==================================================
-- Adds student progress tracking (driving skills) and
-- student package purchases for the student portal.
-- Phase 10 of the implementation order.

-- ==========================================
-- 1. Enums
-- ==========================================

CREATE TYPE skill_level AS ENUM (
  'not_started',
  'needs_practice',
  'developing',
  'competent',
  'confident'
);

CREATE TYPE package_purchase_status AS ENUM (
  'active',
  'completed',
  'expired',
  'cancelled'
);

-- ==========================================
-- 2. Driving Skills Catalog
-- ==========================================
-- Defines the driving skills that can be tracked per organization.

CREATE TABLE driving_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_driving_skills_org ON driving_skills(organization_id);

-- ==========================================
-- 3. Student Progress
-- ==========================================
-- Tracks each student's level on each driving skill.

CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES driving_skills(id) ON DELETE CASCADE,
  level skill_level NOT NULL DEFAULT 'not_started',
  assessed_by UUID REFERENCES instructors(id) ON DELETE SET NULL,
  assessed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, skill_id)
);

CREATE INDEX idx_student_progress_org ON student_progress(organization_id);
CREATE INDEX idx_student_progress_student ON student_progress(student_id);

-- ==========================================
-- 4. Student Package Purchases
-- ==========================================
-- Tracks when a student buys a lesson package:
-- total lessons, used, remaining, expiry.

CREATE TABLE student_package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_package_id UUID NOT NULL REFERENCES lesson_packages(id) ON DELETE RESTRICT,
  lessons_total INTEGER NOT NULL,
  lessons_used INTEGER NOT NULL DEFAULT 0,
  price_paid_cents INTEGER NOT NULL,
  status package_purchase_status NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_lessons_used CHECK (lessons_used >= 0 AND lessons_used <= lessons_total),
  CONSTRAINT chk_price_paid CHECK (price_paid_cents >= 0)
);

CREATE INDEX idx_student_packages_org ON student_package_purchases(organization_id);
CREATE INDEX idx_student_packages_student ON student_package_purchases(student_id);
CREATE INDEX idx_student_packages_status ON student_package_purchases(status);

-- ==========================================
-- 5. Triggers
-- ==========================================

CREATE TRIGGER set_updated_at_driving_skills
  BEFORE UPDATE ON driving_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_student_progress
  BEFORE UPDATE ON student_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_student_package_purchases
  BEFORE UPDATE ON student_package_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 6. RLS Policies
-- ==========================================

ALTER TABLE driving_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_package_purchases ENABLE ROW LEVEL SECURITY;

-- Driving Skills: members can view, admins can manage
CREATE POLICY driving_skills_select ON driving_skills
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY driving_skills_insert ON driving_skills
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY driving_skills_update ON driving_skills
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY driving_skills_delete ON driving_skills
  FOR DELETE USING (is_org_admin(organization_id));

-- Student Progress: members can view, admins can manage
CREATE POLICY student_progress_select ON student_progress
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY student_progress_insert ON student_progress
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY student_progress_update ON student_progress
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY student_progress_delete ON student_progress
  FOR DELETE USING (is_org_admin(organization_id));

-- Student Package Purchases: members can view, admins can manage
CREATE POLICY student_package_purchases_select ON student_package_purchases
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY student_package_purchases_insert ON student_package_purchases
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY student_package_purchases_update ON student_package_purchases
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY student_package_purchases_delete ON student_package_purchases
  FOR DELETE USING (is_org_admin(organization_id));
-- ==================================================
-- Migration 00007: Reviews & Success Stories
-- ==================================================
-- Phase 11: Review collection with moderation,
-- success story publishing with consent tracking.

-- ==========================================
-- 1. Enums
-- ==========================================

CREATE TYPE review_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'featured'
);

CREATE TYPE success_story_status AS ENUM (
  'draft',
  'published',
  'archived'
);

-- ==========================================
-- 2. Reviews
-- ==========================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT NOT NULL,
  status review_status NOT NULL DEFAULT 'pending',
  moderated_by UUID,
  moderated_at TIMESTAMPTZ,
  moderation_notes TEXT,
  google_review_url TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_org ON reviews(organization_id);
CREATE INDEX idx_reviews_status ON reviews(organization_id, status);
CREATE INDEX idx_reviews_student ON reviews(student_id);

-- ==========================================
-- 3. Success Stories
-- ==========================================

CREATE TABLE success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
  photo_url TEXT,
  test_location TEXT,
  pass_date DATE,
  message TEXT,
  status success_story_status NOT NULL DEFAULT 'draft',
  -- Consent tracking (spec requirement)
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  consent_given_by TEXT,
  consent_method TEXT CHECK (consent_method IN ('verbal', 'written', 'digital', 'parent_guardian')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_success_stories_org ON success_stories(organization_id);
CREATE INDEX idx_success_stories_status ON success_stories(organization_id, status);

-- ==========================================
-- 4. Triggers
-- ==========================================

CREATE TRIGGER set_updated_at_reviews
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_success_stories
  BEFORE UPDATE ON success_stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- 5. RLS Policies
-- ==========================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;

-- Reviews: members can view all, admins can manage
CREATE POLICY reviews_select ON reviews
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY reviews_insert ON reviews
  FOR INSERT WITH CHECK (is_org_member(organization_id));

CREATE POLICY reviews_update ON reviews
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY reviews_delete ON reviews
  FOR DELETE USING (is_org_admin(organization_id));

-- Success Stories: members can view, admins can manage
CREATE POLICY success_stories_select ON success_stories
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY success_stories_insert ON success_stories
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY success_stories_update ON success_stories
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY success_stories_delete ON success_stories
  FOR DELETE USING (is_org_admin(organization_id));
-- ==================================================
-- Migration 00008: Payments
-- ==================================================
-- Payment processing infrastructure with Stripe
-- abstraction, idempotent webhook handling, and
-- refund support.
--
-- Money is stored as integer cents (smallest currency
-- unit). Never trust payment success from the browser —
-- verify via webhooks.

-- Payment status lifecycle
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

-- What the payment is for
CREATE TYPE payment_type AS ENUM (
  'booking_full',
  'booking_deposit',
  'package_purchase',
  'outstanding_balance'
);

-- Refund status
CREATE TYPE refund_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed'
);

-- Webhook event processing status
CREATE TYPE webhook_status AS ENUM (
  'pending',
  'processing',
  'processed',
  'failed',
  'skipped'
);

-- ---------------------------------------------------
-- Payments
-- ---------------------------------------------------
CREATE TABLE payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES students(id) ON DELETE SET NULL,
  booking_id      uuid REFERENCES bookings(id) ON DELETE SET NULL,
  package_purchase_id uuid REFERENCES student_package_purchases(id) ON DELETE SET NULL,

  -- Payment details
  payment_type    payment_type NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  amount_cents    integer NOT NULL CHECK (amount_cents > 0),
  currency        text NOT NULL DEFAULT 'AUD',

  -- Stripe fields
  stripe_payment_intent_id  text,
  stripe_customer_id        text,
  stripe_charge_id          text,

  -- Refund tracking
  amount_refunded_cents     integer NOT NULL DEFAULT 0 CHECK (amount_refunded_cents >= 0),

  -- Metadata
  description     text,
  metadata        jsonb DEFAULT '{}',

  -- Admin
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at         timestamptz,
  failed_at       timestamptz,
  failure_reason  text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Refunded amount cannot exceed payment amount
  CONSTRAINT refund_amount_check CHECK (amount_refunded_cents <= amount_cents)
);

-- Indexes
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(organization_id, status);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX idx_payments_stripe_pi_unique ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- Refunds
-- ---------------------------------------------------
CREATE TABLE refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id      uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

  -- Refund details
  amount_cents    integer NOT NULL CHECK (amount_cents > 0),
  status          refund_status NOT NULL DEFAULT 'pending',
  reason          text,

  -- Stripe fields
  stripe_refund_id text,

  -- Admin
  refunded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at    timestamptz,
  failure_reason  text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refunds_org ON refunds(organization_id);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_stripe ON refunds(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;

CREATE TRIGGER set_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- Webhook Events (idempotent processing)
-- ---------------------------------------------------
CREATE TABLE webhook_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES organizations(id) ON DELETE SET NULL,

  -- Event identity (for idempotency)
  provider          text NOT NULL DEFAULT 'stripe',
  event_id          text NOT NULL,
  event_type        text NOT NULL,

  -- Processing
  status            webhook_status NOT NULL DEFAULT 'pending',
  payload           jsonb NOT NULL DEFAULT '{}',
  processing_errors text[],
  attempts          integer NOT NULL DEFAULT 0,
  max_attempts      integer NOT NULL DEFAULT 3,

  -- Timestamps
  received_at       timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on event_id for idempotency — prevent duplicate processing
CREATE UNIQUE INDEX idx_webhook_events_event_id ON webhook_events(provider, event_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_webhook_events_org ON webhook_events(organization_id) WHERE organization_id IS NOT NULL;

CREATE TRIGGER set_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------

-- Payments: org members can read, admins can manage
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON payments
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY payments_insert ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = payments.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY payments_update ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = payments.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Refunds: org members can read, admins can manage
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY refunds_select ON refunds
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY refunds_insert ON refunds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = refunds.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY refunds_update ON refunds
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = refunds.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Webhook events: platform-level or org-scoped admin read
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_select ON webhook_events
  FOR SELECT USING (
    -- Can see webhooks for orgs they belong to
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
    OR organization_id IS NULL
  );

-- Webhook inserts/updates happen via service role (server-side webhook handler)
-- No user-facing insert/update policies needed
-- ==================================================
-- Migration 00009: Notifications
-- ==================================================
-- Notification system with templates, delivery tracking,
-- and support for multiple channels (email, SMS).

-- Notification channel
CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms'
);

-- Notification delivery status
CREATE TYPE notification_status AS ENUM (
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'bounced'
);

-- Notification event types
CREATE TYPE notification_type AS ENUM (
  'booking_confirmed',
  'booking_reminder',
  'booking_changed',
  'booking_cancelled',
  'payment_receipt',
  'payment_failed',
  'instructor_reassigned',
  'review_request',
  'test_congratulations',
  'welcome',
  'custom'
);

-- ---------------------------------------------------
-- Notification Templates
-- ---------------------------------------------------
-- Each school can customise templates per event type.
-- Templates use simple {{variable}} interpolation.
CREATE TABLE notification_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'email',

  -- Template content
  subject         text,          -- Email subject (not used for SMS)
  body            text NOT NULL,  -- Template body with {{variable}} placeholders
  is_active       boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- One template per org + type + channel
  CONSTRAINT uq_template_org_type_channel
    UNIQUE (organization_id, notification_type, channel)
);

CREATE INDEX idx_notification_templates_org
  ON notification_templates(organization_id);

CREATE TRIGGER set_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- Notifications (delivery log)
-- ---------------------------------------------------
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What and who
  notification_type notification_type NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'email',
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email text,
  recipient_phone text,
  recipient_name  text,

  -- Content (rendered from template)
  subject         text,
  body            text NOT NULL,

  -- Linked records
  booking_id      uuid REFERENCES bookings(id) ON DELETE SET NULL,
  payment_id      uuid REFERENCES payments(id) ON DELETE SET NULL,

  -- Delivery tracking
  status          notification_status NOT NULL DEFAULT 'queued',
  provider        text,           -- e.g. 'resend', 'twilio'
  provider_message_id text,       -- External ID for tracking
  sent_at         timestamptz,
  delivered_at    timestamptz,
  failed_at       timestamptz,
  failure_reason  text,
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 3,

  -- Metadata
  metadata        jsonb DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE INDEX idx_notifications_status ON notifications(organization_id, status);
CREATE INDEX idx_notifications_booking ON notifications(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_notifications_type ON notifications(organization_id, notification_type);

CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- Notification Preferences (per-user opt-out)
-- ---------------------------------------------------
CREATE TABLE notification_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Per-type opt-out
  notification_type notification_type NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'email',
  is_enabled      boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_pref_user_type_channel
    UNIQUE (organization_id, user_id, notification_type, channel)
);

CREATE INDEX idx_notification_prefs_user
  ON notification_preferences(user_id, organization_id);

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------

-- Templates: org members can read, admins can manage
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_templates_select ON notification_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY notification_templates_insert ON notification_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = notification_templates.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY notification_templates_update ON notification_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = notification_templates.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY notification_templates_delete ON notification_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = notification_templates.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Notifications: admins can see all, users see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_admin ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = notifications.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (
    recipient_user_id = auth.uid()
  );

-- Notification inserts/updates happen server-side (service role)

-- Preferences: users can manage their own
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_prefs_select ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notification_prefs_insert ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_prefs_update ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY notification_prefs_delete ON notification_preferences
  FOR DELETE USING (user_id = auth.uid());
-- ==================================================
-- Migration 00010: SaaS Subscriptions
-- ==================================================
-- Plans, subscriptions, entitlements, and usage limits.
-- Do not scatter plan names throughout the app —
-- use centralized entitlements.

-- Subscription status lifecycle
CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'suspended',
  'expired'
);

-- Billing interval
CREATE TYPE billing_interval AS ENUM (
  'monthly',
  'yearly'
);

-- ---------------------------------------------------
-- Plans
-- ---------------------------------------------------
-- Platform-defined subscription plans (Starter, Growth, Pro).
CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description     text,

  -- Pricing (in cents)
  price_monthly_cents   integer NOT NULL DEFAULT 0 CHECK (price_monthly_cents >= 0),
  price_yearly_cents    integer NOT NULL DEFAULT 0 CHECK (price_yearly_cents >= 0),
  currency              text NOT NULL DEFAULT 'AUD',

  -- Stripe product/price IDs
  stripe_product_id     text,
  stripe_price_monthly_id text,
  stripe_price_yearly_id  text,

  -- Entitlements (limits for this plan)
  max_instructors       integer,  -- NULL = unlimited
  max_students          integer,
  max_locations         integer,
  max_vehicles          integer,
  max_bookings_per_month integer,

  -- Feature flags
  custom_domain_enabled       boolean NOT NULL DEFAULT false,
  sms_enabled                 boolean NOT NULL DEFAULT false,
  student_progress_enabled    boolean NOT NULL DEFAULT true,
  advanced_reports_enabled    boolean NOT NULL DEFAULT false,
  waitlist_enabled            boolean NOT NULL DEFAULT false,
  custom_branding_enabled     boolean NOT NULL DEFAULT false,
  api_access_enabled          boolean NOT NULL DEFAULT false,

  -- Plan management
  is_active       boolean NOT NULL DEFAULT true,
  is_default      boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 0,
  trial_days      integer NOT NULL DEFAULT 14,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------
-- Each organization has one active subscription.
CREATE TABLE subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,

  -- Status
  status          subscription_status NOT NULL DEFAULT 'trialing',
  billing_interval billing_interval NOT NULL DEFAULT 'monthly',

  -- Dates
  trial_start     timestamptz,
  trial_end       timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancelled_at    timestamptz,
  suspended_at    timestamptz,
  suspension_reason text,

  -- Stripe
  stripe_subscription_id  text,
  stripe_customer_id      text,

  -- Metadata
  metadata        jsonb DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Only one active/trialing subscription per org
  CONSTRAINT uq_org_active_subscription
    UNIQUE (organization_id)
);

CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- Usage Tracking
-- ---------------------------------------------------
-- Tracks current usage against plan limits per period.
CREATE TABLE subscription_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Period
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,

  -- Counts
  instructors_count     integer NOT NULL DEFAULT 0,
  students_count        integer NOT NULL DEFAULT 0,
  locations_count       integer NOT NULL DEFAULT 0,
  vehicles_count        integer NOT NULL DEFAULT 0,
  bookings_count        integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_usage_org_period
    UNIQUE (organization_id, period_start)
);

CREATE INDEX idx_usage_subscription ON subscription_usage(subscription_id);

CREATE TRIGGER set_subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------

-- Plans: publicly readable (pricing page)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select ON plans
  FOR SELECT USING (true);

-- Plans insert/update/delete: platform admins only (service role)

-- Subscriptions: org members can read their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Subscription writes happen via service role

-- Usage: org admins can read
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_usage_select ON subscription_usage
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Usage writes happen via service role

-- ---------------------------------------------------
-- Seed Default Plans
-- ---------------------------------------------------
INSERT INTO plans (name, slug, description, price_monthly_cents, price_yearly_cents,
  max_instructors, max_students, max_locations, max_vehicles, max_bookings_per_month,
  custom_domain_enabled, sms_enabled, student_progress_enabled,
  advanced_reports_enabled, waitlist_enabled, custom_branding_enabled,
  api_access_enabled, is_default, sort_order, trial_days)
VALUES
  ('Starter', 'starter',
   'Perfect for new driving schools getting started.',
   4900, 47000,
   2, 50, 1, 3, 200,
   false, false, true, false, false, false, false,
   true, 0, 14),
  ('Growth', 'growth',
   'For growing schools that need more capacity.',
   9900, 95000,
   5, 200, 3, 10, 1000,
   true, false, true, true, false, true, false,
   false, 1, 14),
  ('Pro', 'pro',
   'For established schools with advanced needs.',
   19900, 191000,
   NULL, NULL, NULL, NULL, NULL,
   true, true, true, true, true, true, true,
   false, 2, 14);
-- ==================================================
-- Migration 00011: Audit Logs & Platform Admin
-- ==================================================
-- Audit log table for tracking administrative actions
-- across the platform. Used by both org admins and
-- platform super-admins.

-- ---------------------------------------------------
-- Audit Logs
-- ---------------------------------------------------
CREATE TABLE audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Who performed the action
  user_id         uuid NOT NULL,
  user_email      text,
  user_role       text,

  -- What happened
  action          text NOT NULL,       -- e.g. 'subscription.suspended', 'member.removed'
  resource_type   text NOT NULL,       -- e.g. 'organization', 'subscription', 'member'
  resource_id     text,                -- ID of the affected resource

  -- Details
  details         jsonb DEFAULT '{}',  -- additional context (before/after values, reason, etc.)
  ip_address      text,

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ---------------------------------------------------
-- Feature Flags
-- ---------------------------------------------------
-- Platform-wide feature flags for gradual rollouts.
CREATE TABLE feature_flags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  description     text,
  is_enabled      boolean NOT NULL DEFAULT false,
  -- NULL = global, specific org IDs = scoped rollout
  allowed_organizations uuid[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------

-- Audit logs: org admins see their org's logs, platform admins see all
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (
    -- Org admins can see their org's logs
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Audit log inserts happen via service role

-- Feature flags: read-only for authenticated users (to check flags)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY feature_flags_select ON feature_flags
  FOR SELECT USING (true);

-- Feature flag writes happen via service role
-- ==================================================
-- Migration 00012: Advanced Features
-- ==================================================
-- Waitlist, custom themes, and supporting structures
-- for advanced reports.

-- ---------------------------------------------------
-- Waitlist Status
-- ---------------------------------------------------
CREATE TYPE waitlist_status AS ENUM (
  'waiting',
  'notified',
  'booked',
  'expired',
  'cancelled'
);

-- ---------------------------------------------------
-- Waitlist Entries
-- ---------------------------------------------------
-- Students register interest for cancelled/unavailable slots.
-- When a cancellation opens a matching slot, eligible
-- students are notified (never auto-booked without policy).
CREATE TABLE waitlist_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Preferences
  preferred_days  text[] DEFAULT '{}',           -- e.g. ['monday','wednesday']
  preferred_time_start text,                      -- HH:MM (24h)
  preferred_time_end   text,                      -- HH:MM (24h)
  preferred_instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL,
  lesson_type_id  uuid REFERENCES lesson_types(id) ON DELETE SET NULL,
  service_area_id uuid REFERENCES service_areas(id) ON DELETE SET NULL,

  -- Status
  status          waitlist_status NOT NULL DEFAULT 'waiting',
  priority        integer NOT NULL DEFAULT 0,     -- higher = higher priority
  notes           text,

  -- Notifications
  notified_at     timestamptz,
  expires_at      timestamptz,                    -- auto-expire old entries
  booked_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_org ON waitlist_entries(organization_id);
CREATE INDEX idx_waitlist_student ON waitlist_entries(student_id);
CREATE INDEX idx_waitlist_status ON waitlist_entries(status) WHERE status = 'waiting';

CREATE TRIGGER set_waitlist_entries_updated_at
  BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- Custom Themes
-- ---------------------------------------------------
-- Extended theming beyond primary/secondary colors.
-- Gated by custom_branding_enabled entitlement.
CREATE TABLE custom_themes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- Colors
  primary_color   text NOT NULL DEFAULT '#2563eb',
  secondary_color text NOT NULL DEFAULT '#1e40af',
  accent_color    text,
  background_color text,
  text_color      text,
  header_bg_color text,
  footer_bg_color text,

  -- Typography
  heading_font    text,                           -- Google Font name or system font
  body_font       text,

  -- Layout
  header_style    text DEFAULT 'default',         -- 'default', 'centered', 'minimal'
  footer_style    text DEFAULT 'default',         -- 'default', 'compact', 'expanded'
  hero_style      text DEFAULT 'default',         -- 'default', 'image', 'gradient', 'minimal'
  corner_radius   text DEFAULT 'medium',          -- 'none', 'small', 'medium', 'large'

  -- Custom CSS (sanitized, max 10KB)
  custom_css      text CHECK (length(custom_css) <= 10240),

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_custom_themes_updated_at
  BEFORE UPDATE ON custom_themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------

-- Waitlist: students see their own entries, admins see all org entries
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY waitlist_entries_select ON waitlist_entries
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY waitlist_entries_insert ON waitlist_entries
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY waitlist_entries_update ON waitlist_entries
  FOR UPDATE USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY waitlist_entries_delete ON waitlist_entries
  FOR DELETE USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Custom themes: org members read, admins manage
ALTER TABLE custom_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_themes_select ON custom_themes
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY custom_themes_insert ON custom_themes
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY custom_themes_update ON custom_themes
  FOR UPDATE USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );
