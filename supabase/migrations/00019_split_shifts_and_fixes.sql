-- ==================================================
-- Migration: 00019_split_shifts_and_fixes
-- ==================================================
-- Fixes from developer review:
--   F01: booking_is_active must exclude 'rejected' (already done in 00014,
--        but all-migrations.sql was stale — this ensures live DB is correct)
--   F10: Support split shifts — drop unique constraint so instructors
--        can have multiple time blocks per weekday (e.g. 8am-12pm + 2pm-6pm)
--   F16: Block SVG uploads (handled in application code)
--   F20: Add custom_faqs and value_propositions columns to school_settings

-- ==================================================
-- F01: Ensure booking_is_active excludes 'rejected'
-- ==================================================
-- Idempotent: re-create the function (already correct if 00014 ran)
CREATE OR REPLACE FUNCTION booking_is_active(s booking_status) RETURNS BOOLEAN
  LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT s NOT IN ('cancelled', 'rejected');
$$;

-- ==================================================
-- F10: Support split shifts
-- ==================================================
-- Drop the one-rule-per-day unique constraint.
-- The availability engine already supports multiple rules per day.
-- Overlap prevention is handled in application code.
ALTER TABLE availability_rules DROP CONSTRAINT IF EXISTS uq_availability_rule;

-- Add an exclusion constraint to prevent overlapping rules on the same day
-- for the same instructor (e.g. can't have 8-12 and 10-14 on the same day).
-- This uses btree_gist which is already enabled.
-- Note: We use a simple unique index on (org, instructor, day, start_time) instead
-- since time ranges aren't native range types here.
CREATE UNIQUE INDEX IF NOT EXISTS uq_availability_rule_no_overlap
  ON availability_rules (organization_id, instructor_id, day_of_week, start_time);

-- ==================================================
-- F20: Make FAQs and value propositions editable per school
-- ==================================================
-- custom_faqs: JSON array of {q, a} objects. NULL = use platform defaults.
-- value_propositions: JSON array of {icon, title, desc} objects. NULL = use defaults.
-- popular_package_id: UUID of the package to badge as "Most Popular". NULL = no badge.
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS custom_faqs JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS value_propositions JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS popular_package_id UUID DEFAULT NULL;

COMMENT ON COLUMN school_settings.custom_faqs IS
  'Custom FAQ items as [{q, a}]. NULL uses platform defaults.';
COMMENT ON COLUMN school_settings.value_propositions IS
  'Custom value proposition cards as [{icon, title, desc}]. NULL uses platform defaults.';
COMMENT ON COLUMN school_settings.popular_package_id IS
  'Package ID to display with "Most Popular" badge. NULL shows no badge.';
