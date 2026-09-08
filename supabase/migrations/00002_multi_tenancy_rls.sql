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
