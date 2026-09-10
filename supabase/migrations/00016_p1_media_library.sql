-- ==================================================
-- P1-4: Media Library / Asset Management
-- ==================================================
-- Adds a media_assets table for schools to manage their
-- images, logos, and other files via Supabase Storage.
-- Each asset tracks metadata (alt text, dimensions, tags)
-- and references the storage path.

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Storage reference
  storage_path TEXT NOT NULL,    -- e.g. "org-id/photos/abc123.jpg"
  public_url TEXT NOT NULL,      -- Full public URL from Supabase Storage
  bucket_name TEXT NOT NULL DEFAULT 'school-assets',

  -- Metadata
  filename TEXT NOT NULL,        -- Original filename
  alt_text TEXT,                 -- Accessibility alt text
  mime_type TEXT NOT NULL,       -- e.g. "image/jpeg"
  file_size_bytes INTEGER NOT NULL,
  width INTEGER,                 -- Image dimensions (null for non-images)
  height INTEGER,

  -- Organization
  folder TEXT NOT NULL DEFAULT 'general', -- Logical folder: logos, photos, instructors, etc.
  tags TEXT[] DEFAULT '{}',              -- Searchable tags
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_media_assets_org ON media_assets(organization_id);
CREATE INDEX idx_media_assets_folder ON media_assets(organization_id, folder);

-- RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's assets
CREATE POLICY "media_assets_select" ON media_assets
  FOR SELECT USING (
    public.is_org_member(organization_id, auth.uid())
  );

-- Admins+ can insert/update/delete
CREATE POLICY "media_assets_insert" ON media_assets
  FOR INSERT WITH CHECK (
    public.is_org_admin(organization_id, auth.uid())
  );

CREATE POLICY "media_assets_update" ON media_assets
  FOR UPDATE USING (
    public.is_org_admin(organization_id, auth.uid())
  );

CREATE POLICY "media_assets_delete" ON media_assets
  FOR DELETE USING (
    public.is_org_admin(organization_id, auth.uid())
  );

-- Updated-at trigger
CREATE TRIGGER set_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
