-- ==================================================
-- Migration 00010: SaaS Subscriptions
-- ==================================================
-- Plans, subscriptions, entitlements, and usage limits.
-- Do not scatter plan names throughout the app —
-- use centralized entitlements.

-- Subscription status lifecycle
CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'suspended',
  'expired'
);

-- Billing interval
CREATE TYPE billing_interval AS ENUM (
  'monthly',
  'yearly'
);

-- ---------------------------------------------------
-- Plans
-- ---------------------------------------------------
-- Platform-defined subscription plans (Starter, Growth, Pro).
CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description     text,

  -- Pricing (in cents)
  price_monthly_cents   integer NOT NULL DEFAULT 0 CHECK (price_monthly_cents >= 0),
  price_yearly_cents    integer NOT NULL DEFAULT 0 CHECK (price_yearly_cents >= 0),
  currency              text NOT NULL DEFAULT 'AUD',

  -- Stripe product/price IDs
  stripe_product_id     text,
  stripe_price_monthly_id text,
  stripe_price_yearly_id  text,

  -- Entitlements (limits for this plan)
  max_instructors       integer,  -- NULL = unlimited
  max_students          integer,
  max_locations         integer,
  max_vehicles          integer,
  max_bookings_per_month integer,

  -- Feature flags
  custom_domain_enabled       boolean NOT NULL DEFAULT false,
  sms_enabled                 boolean NOT NULL DEFAULT false,
  student_progress_enabled    boolean NOT NULL DEFAULT true,
  advanced_reports_enabled    boolean NOT NULL DEFAULT false,
  waitlist_enabled            boolean NOT NULL DEFAULT false,
  custom_branding_enabled     boolean NOT NULL DEFAULT false,
  api_access_enabled          boolean NOT NULL DEFAULT false,

  -- Plan management
  is_active       boolean NOT NULL DEFAULT true,
  is_default      boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 0,
  trial_days      integer NOT NULL DEFAULT 14,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------
-- Each organization has one active subscription.
CREATE TABLE subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,

  -- Status
  status          subscription_status NOT NULL DEFAULT 'trialing',
  billing_interval billing_interval NOT NULL DEFAULT 'monthly',

  -- Dates
  trial_start     timestamptz,
  trial_end       timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancelled_at    timestamptz,
  suspended_at    timestamptz,
  suspension_reason text,

  -- Stripe
  stripe_subscription_id  text,
  stripe_customer_id      text,

  -- Metadata
  metadata        jsonb DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Only one active/trialing subscription per org
  CONSTRAINT uq_org_active_subscription
    UNIQUE (organization_id)
);

CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- Usage Tracking
-- ---------------------------------------------------
-- Tracks current usage against plan limits per period.
CREATE TABLE subscription_usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Period
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,

  -- Counts
  instructors_count     integer NOT NULL DEFAULT 0,
  students_count        integer NOT NULL DEFAULT 0,
  locations_count       integer NOT NULL DEFAULT 0,
  vehicles_count        integer NOT NULL DEFAULT 0,
  bookings_count        integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_usage_org_period
    UNIQUE (organization_id, period_start)
);

CREATE INDEX idx_usage_subscription ON subscription_usage(subscription_id);

CREATE TRIGGER set_subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------

-- Plans: publicly readable (pricing page)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select ON plans
  FOR SELECT USING (true);

-- Plans insert/update/delete: platform admins only (service role)

-- Subscriptions: org members can read their own
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Subscription writes happen via service role

-- Usage: org admins can read
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscription_usage_select ON subscription_usage
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('school_owner', 'school_admin')
    )
  );

-- Usage writes happen via service role

-- ---------------------------------------------------
-- Seed Default Plans
-- ---------------------------------------------------
INSERT INTO plans (name, slug, description, price_monthly_cents, price_yearly_cents,
  max_instructors, max_students, max_locations, max_vehicles, max_bookings_per_month,
  custom_domain_enabled, sms_enabled, student_progress_enabled,
  advanced_reports_enabled, waitlist_enabled, custom_branding_enabled,
  api_access_enabled, is_default, sort_order, trial_days)
VALUES
  ('Starter', 'starter',
   'Perfect for new driving schools getting started.',
   4900, 47000,
   2, 50, 1, 3, 200,
   false, false, true, false, false, false, false,
   true, 0, 14),
  ('Growth', 'growth',
   'For growing schools that need more capacity.',
   9900, 95000,
   5, 200, 3, 10, 1000,
   true, false, true, true, false, true, false,
   false, 1, 14),
  ('Pro', 'pro',
   'For established schools with advanced needs.',
   19900, 191000,
   NULL, NULL, NULL, NULL, NULL,
   true, true, true, true, true, true, true,
   false, 2, 14);
