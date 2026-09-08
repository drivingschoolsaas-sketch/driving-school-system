// ==================================================
// Subscription Validator Tests
// ==================================================

import { describe, it, expect } from 'vitest';
import {
  createSubscriptionSchema,
  changePlanSchema,
  suspendSubscriptionSchema,
  updateBillingIntervalSchema,
} from '../subscription';

describe('createSubscriptionSchema', () => {
  const validPlanId = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid input with defaults', () => {
    const result = createSubscriptionSchema.parse({
      plan_id: validPlanId,
    });
    expect(result.plan_id).toBe(validPlanId);
    expect(result.billing_interval).toBe('monthly');
  });

  it('accepts yearly billing interval', () => {
    const result = createSubscriptionSchema.parse({
      plan_id: validPlanId,
      billing_interval: 'yearly',
    });
    expect(result.billing_interval).toBe('yearly');
  });

  it('accepts optional stripe IDs', () => {
    const result = createSubscriptionSchema.parse({
      plan_id: validPlanId,
      stripe_subscription_id: 'sub_abc123',
      stripe_customer_id: 'cus_def456',
    });
    expect(result.stripe_subscription_id).toBe('sub_abc123');
    expect(result.stripe_customer_id).toBe('cus_def456');
  });

  it('rejects missing plan_id', () => {
    expect(() => createSubscriptionSchema.parse({})).toThrow();
  });

  it('rejects invalid plan_id', () => {
    expect(() =>
      createSubscriptionSchema.parse({ plan_id: 'not-a-uuid' })
    ).toThrow();
  });

  it('rejects invalid billing interval', () => {
    expect(() =>
      createSubscriptionSchema.parse({
        plan_id: validPlanId,
        billing_interval: 'weekly',
      })
    ).toThrow();
  });
});

describe('changePlanSchema', () => {
  it('accepts valid plan_id', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const result = changePlanSchema.parse({ plan_id: id });
    expect(result.plan_id).toBe(id);
  });

  it('rejects missing plan_id', () => {
    expect(() => changePlanSchema.parse({})).toThrow();
  });

  it('rejects non-UUID plan_id', () => {
    expect(() => changePlanSchema.parse({ plan_id: '123' })).toThrow();
  });
});

describe('suspendSubscriptionSchema', () => {
  it('accepts valid reason', () => {
    const result = suspendSubscriptionSchema.parse({
      reason: 'Payment overdue for 30 days',
    });
    expect(result.reason).toBe('Payment overdue for 30 days');
  });

  it('rejects empty reason', () => {
    expect(() =>
      suspendSubscriptionSchema.parse({ reason: '' })
    ).toThrow();
  });

  it('rejects missing reason', () => {
    expect(() => suspendSubscriptionSchema.parse({})).toThrow();
  });

  it('rejects reason over 500 characters', () => {
    expect(() =>
      suspendSubscriptionSchema.parse({ reason: 'x'.repeat(501) })
    ).toThrow();
  });
});

describe('updateBillingIntervalSchema', () => {
  it('accepts monthly', () => {
    const result = updateBillingIntervalSchema.parse({
      billing_interval: 'monthly',
    });
    expect(result.billing_interval).toBe('monthly');
  });

  it('accepts yearly', () => {
    const result = updateBillingIntervalSchema.parse({
      billing_interval: 'yearly',
    });
    expect(result.billing_interval).toBe('yearly');
  });

  it('rejects invalid interval', () => {
    expect(() =>
      updateBillingIntervalSchema.parse({ billing_interval: 'quarterly' })
    ).toThrow();
  });

  it('rejects missing interval', () => {
    expect(() => updateBillingIntervalSchema.parse({})).toThrow();
  });
});
