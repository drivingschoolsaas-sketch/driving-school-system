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
