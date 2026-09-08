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
