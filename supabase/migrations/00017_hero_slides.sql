-- ==================================================
-- Hero Slides for Landing Page Carousel
-- ==================================================
-- Each school can manage a set of hero slides shown
-- on their public landing page in an auto-sliding
-- carousel. Admins can upload, reorder, and toggle
-- slides from the dashboard.

CREATE TABLE hero_slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Image
  image_url TEXT NOT NULL,           -- Public URL of the slide image
  storage_path TEXT,                 -- Supabase Storage path (null if external URL)

  -- Content
  title TEXT,                        -- Optional overlay title
  subtitle TEXT,                     -- Optional overlay subtitle
  link_url TEXT,                     -- Optional CTA link (e.g. /book)
  link_text TEXT,                    -- Optional CTA button text (e.g. "Book Now")

  -- Display
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_hero_slides_org ON hero_slides(organization_id);
CREATE INDEX idx_hero_slides_active ON hero_slides(organization_id, is_active, sort_order);

-- RLS
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

-- Anyone can view active slides (public landing page)
CREATE POLICY "hero_slides_select_public" ON hero_slides
  FOR SELECT USING (true);

-- Admins can insert/update/delete
CREATE POLICY "hero_slides_insert" ON hero_slides
  FOR INSERT WITH CHECK (
    public.is_org_admin(organization_id, auth.uid())
  );

CREATE POLICY "hero_slides_update" ON hero_slides
  FOR UPDATE USING (
    public.is_org_admin(organization_id, auth.uid())
  );

CREATE POLICY "hero_slides_delete" ON hero_slides
  FOR DELETE USING (
    public.is_org_admin(organization_id, auth.uid())
  );

-- Updated-at trigger
-- Use moddatetime extension for auto-updating updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TRIGGER set_hero_slides_updated_at
  BEFORE UPDATE ON hero_slides
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
