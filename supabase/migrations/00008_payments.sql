-- ==================================================
-- Migration 00008: Payments
-- ==================================================
-- Payment processing infrastructure with Stripe
-- abstraction, idempotent webhook handling, and
-- refund support.
--
-- Money is stored as integer cents (smallest currency
-- unit). Never trust payment success from the browser —
-- verify via webhooks.

-- Payment status lifecycle
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

-- What the payment is for
CREATE TYPE payment_type AS ENUM (
  'booking_full',
  'booking_deposit',
  'package_purchase',
  'outstanding_balance'
);

-- Refund status
CREATE TYPE refund_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed'
);

-- Webhook event processing status
CREATE TYPE webhook_status AS ENUM (
  'pending',
  'processing',
  'processed',
  'failed',
  'skipped'
);

-- ---------------------------------------------------
-- Payments
-- ---------------------------------------------------
CREATE TABLE payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES students(id) ON DELETE SET NULL,
  booking_id      uuid REFERENCES bookings(id) ON DELETE SET NULL,
  package_purchase_id uuid REFERENCES student_package_purchases(id) ON DELETE SET NULL,

  -- Payment details
  payment_type    payment_type NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  amount_cents    integer NOT NULL CHECK (amount_cents > 0),
  currency        text NOT NULL DEFAULT 'AUD',

  -- Stripe fields
  stripe_payment_intent_id  text,
  stripe_customer_id        text,
  stripe_charge_id          text,

  -- Refund tracking
  amount_refunded_cents     integer NOT NULL DEFAULT 0 CHECK (amount_refunded_cents >= 0),

  -- Metadata
  description     text,
  metadata        jsonb DEFAULT '{}',

  -- Admin
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at         timestamptz,
  failed_at       timestamptz,
  failure_reason  text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Refunded amount cannot exceed payment amount
  CONSTRAINT refund_amount_check CHECK (amount_refunded_cents <= amount_cents)
);

-- Indexes
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(organization_id, status);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX idx_payments_stripe_pi_unique ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- Refunds
-- ---------------------------------------------------
CREATE TABLE refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_id      uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

  -- Refund details
  amount_cents    integer NOT NULL CHECK (amount_cents > 0),
  status          refund_status NOT NULL DEFAULT 'pending',
  reason          text,

  -- Stripe fields
  stripe_refund_id text,

  -- Admin
  refunded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at    timestamptz,
  failure_reason  text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refunds_org ON refunds(organization_id);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_stripe ON refunds(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;

CREATE TRIGGER set_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- Webhook Events (idempotent processing)
-- ---------------------------------------------------
CREATE TABLE webhook_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES organizations(id) ON DELETE SET NULL,

  -- Event identity (for idempotency)
  provider          text NOT NULL DEFAULT 'stripe',
  event_id          text NOT NULL,
  event_type        text NOT NULL,

  -- Processing
  status            webhook_status NOT NULL DEFAULT 'pending',
  payload           jsonb NOT NULL DEFAULT '{}',
  processing_errors text[],
  attempts          integer NOT NULL DEFAULT 0,
  max_attempts      integer NOT NULL DEFAULT 3,

  -- Timestamps
  received_at       timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on event_id for idempotency — prevent duplicate processing
CREATE UNIQUE INDEX idx_webhook_events_event_id ON webhook_events(provider, event_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_webhook_events_org ON webhook_events(organization_id) WHERE organization_id IS NOT NULL;

CREATE TRIGGER set_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------

-- Payments: org members can read, admins can manage
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON payments
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY payments_insert ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = payments.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY payments_update ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = payments.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Refunds: org members can read, admins can manage
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY refunds_select ON refunds
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY refunds_insert ON refunds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = refunds.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

CREATE POLICY refunds_update ON refunds
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = refunds.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Webhook events: platform-level or org-scoped admin read
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_select ON webhook_events
  FOR SELECT USING (
    -- Can see webhooks for orgs they belong to
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
    OR organization_id IS NULL
  );

-- Webhook inserts/updates happen via service role (server-side webhook handler)
-- No user-facing insert/update policies needed
