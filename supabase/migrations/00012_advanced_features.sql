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
