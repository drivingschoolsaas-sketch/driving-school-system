-- ==================================================
-- Migration 00009: Notifications
-- ==================================================
-- Notification system with templates, delivery tracking,
-- and support for multiple channels (email, SMS).

-- Notification channel
CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms'
);

-- Notification delivery status
CREATE TYPE notification_status AS ENUM (
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'bounced'
);

-- Notification event types
CREATE TYPE notification_type AS ENUM (
  'booking_confirmed',
  'booking_reminder',
  'booking_changed',
  'booking_cancelled',
  'payment_receipt',
  'payment_failed',
  'instructor_reassigned',
  'review_request',
  'test_congratulations',
  'welcome',
  'custom'
);

-- ---------------------------------------------------
-- Notification Templates
-- ---------------------------------------------------
-- Each school can customise templates per event type.
-- Templates use simple {{variable}} interpolation.
CREATE TABLE notification_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'email',

  -- Template content
  subject         text,          -- Email subject (not used for SMS)
  body            text NOT NULL,  -- Template body with {{variable}} placeholders
  is_active       boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- One template per org + type + channel
  CONSTRAINT uq_template_org_type_channel
    UNIQUE (organization_id, notification_type, channel)
);

CREATE INDEX idx_notification_templates_org
  ON notification_templates(organization_id);

CREATE TRIGGER set_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- Notifications (delivery log)
-- ---------------------------------------------------
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What and who
  notification_type notification_type NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'email',
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email text,
  recipient_phone text,
  recipient_name  text,

  -- Content (rendered from template)
  subject         text,
  body            text NOT NULL,

  -- Linked records
  booking_id      uuid REFERENCES bookings(id) ON DELETE SET NULL,
  payment_id      uuid REFERENCES payments(id) ON DELETE SET NULL,

  -- Delivery tracking
  status          notification_status NOT NULL DEFAULT 'queued',
  provider        text,           -- e.g. 'resend', 'twilio'
  provider_message_id text,       -- External ID for tracking
  sent_at         timestamptz,
  delivered_at    timestamptz,
  failed_at       timestamptz,
  failure_reason  text,
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 3,

  -- Metadata
  metadata        jsonb DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id) WHERE recipient_user_id IS NOT NULL;
CREATE INDEX idx_notifications_status ON notifications(organization_id, status);
CREATE INDEX idx_notifications_booking ON notifications(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_notifications_type ON notifications(organization_id, notification_type);

CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- Notification Preferences (per-user opt-out)
-- ---------------------------------------------------
CREATE TABLE notification_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Per-type opt-out
  notification_type notification_type NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'email',
  is_enabled      boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_pref_user_type_channel
    UNIQUE (organization_id, user_id, notification_type, channel)
);

CREATE INDEX idx_notification_prefs_user
  ON notification_preferences(user_id, organization_id);

CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------

-- Templates: org members can read, admins can manage
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_templates_select ON notification_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY notification_templates_insert ON notification_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = notification_templates.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY notification_templates_update ON notification_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = notification_templates.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY notification_templates_delete ON notification_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = notification_templates.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Notifications: admins can see all, users see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_admin ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = notifications.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (
    recipient_user_id = auth.uid()
  );

-- Notification inserts/updates happen server-side (service role)

-- Preferences: users can manage their own
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_prefs_select ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notification_prefs_insert ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_prefs_update ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY notification_prefs_delete ON notification_preferences
  FOR DELETE USING (user_id = auth.uid());
