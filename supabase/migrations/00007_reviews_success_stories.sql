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
