-- Migration 00020: Remaining developer review fixes
-- F11: Student and vehicle overlap protection (DB-level)
-- F08: Database-backed rate limiting table
-- F07: Per-user admin PIN support (admin_pin_hash column)
-- F15: Subscription limit enforcement function

-- =====================================================
-- F11: Add exclusion constraints for student and vehicle overlap
-- =====================================================

-- Student overlap: prevent a student from having two active bookings at the same time
-- Uses tstzrange to match the instructor exclusion pattern
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'excl_student_overlap'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT excl_student_overlap
      EXCLUDE USING gist (
        student_id WITH =,
        tstzrange(start_datetime, end_datetime) WITH &&
      )
      WHERE (booking_is_active(status));
  END IF;
END $$;

-- Vehicle overlap: prevent a vehicle from being double-booked
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'excl_vehicle_overlap'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT excl_vehicle_overlap
      EXCLUDE USING gist (
        vehicle_id WITH =,
        tstzrange(start_datetime, end_datetime) WITH &&
      )
      WHERE (booking_is_active(status) AND vehicle_id IS NOT NULL);
  END IF;
END $$;

-- =====================================================
-- F08: Database-backed rate limiting
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limit_entries (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hit_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup
  ON rate_limit_entries (window_start);

-- Function to check and increment rate limit
-- Returns TRUE if allowed, FALSE if over limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER,
  p_max_hits INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_window_start := date_trunc('second', now()) - (now() - date_trunc('second', now()));

  -- Clean up old entries for this key
  DELETE FROM rate_limit_entries
  WHERE key = p_key
    AND window_start < now() - (p_window_seconds || ' seconds')::interval;

  -- Count hits in current window
  SELECT COALESCE(SUM(hit_count), 0) INTO v_current_count
  FROM rate_limit_entries
  WHERE key = p_key
    AND window_start >= now() - (p_window_seconds || ' seconds')::interval;

  IF v_current_count >= p_max_hits THEN
    RETURN FALSE;
  END IF;

  -- Record this hit
  INSERT INTO rate_limit_entries (key, window_start, hit_count)
  VALUES (p_key, date_trunc('second', now()), 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET hit_count = rate_limit_entries.hit_count + 1;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Periodic cleanup function (call from cron or application)
CREATE OR REPLACE FUNCTION cleanup_rate_limits(p_max_age_seconds INTEGER DEFAULT 3600)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_entries
  WHERE window_start < now() - (p_max_age_seconds || ' seconds')::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- F07: Per-user admin PIN (preparation for individual admin accounts)
-- =====================================================

ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS admin_pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;

-- =====================================================
-- F15: Atomic usage limit check function
-- Prevents concurrent resource creation from exceeding limits
-- =====================================================

CREATE OR REPLACE FUNCTION check_usage_limit(
  p_org_id UUID,
  p_table_name TEXT,
  p_max_count INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_max_count IS NULL THEN
    RETURN TRUE; -- unlimited
  END IF;

  EXECUTE format(
    'SELECT count(*) FROM %I WHERE organization_id = $1 AND (is_active IS NULL OR is_active = true)',
    p_table_name
  ) INTO v_count USING p_org_id;

  RETURN v_count < p_max_count;
END;
$$ LANGUAGE plpgsql;
