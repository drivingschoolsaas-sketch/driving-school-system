-- ==================================================
-- P1-3: Draft/Preview/Publish Content Workflow
-- ==================================================
-- Adds draft_content JSONB column to school_settings
-- so school owners can prepare website changes and
-- preview them before publishing.
--
-- draft_content stores a partial JSON object with the
-- same keys as the published columns (hero_title,
-- about_text, primary_color, etc.). Publishing copies
-- draft fields over the live columns and clears the draft.

ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS draft_content JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS content_published_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill: set content_published_at for existing settings
UPDATE school_settings
SET content_published_at = updated_at
WHERE content_published_at IS NULL;

COMMENT ON COLUMN school_settings.draft_content IS
  'Pending website content changes (partial JSON of content fields). NULL means no pending draft.';
COMMENT ON COLUMN school_settings.content_published_at IS
  'When website content was last published (draft→live).';
