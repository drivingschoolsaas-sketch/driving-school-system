-- Add per-organization usage limits
-- These override plan-level limits when set (not null).
-- NULL means "use the plan limit" (or unlimited if no plan).
ALTER TABLE organizations
  ADD COLUMN max_instructors integer DEFAULT NULL,
  ADD COLUMN max_students   integer DEFAULT NULL;

COMMENT ON COLUMN organizations.max_instructors IS 'Per-org instructor cap set by platform admin. NULL = use plan limit.';
COMMENT ON COLUMN organizations.max_students   IS 'Per-org student cap set by platform admin. NULL = use plan limit.';
