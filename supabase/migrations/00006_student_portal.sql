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
