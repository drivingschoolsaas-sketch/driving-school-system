// ==================================================
// Payment Validator Tests
// ==================================================

import { describe, it, expect } from 'vitest';
import {
  createPaymentSchema,
  createRefundSchema,
  updatePaymentStatusSchema,
} from '../payment';

describe('createPaymentSchema', () => {
  const validPayment = {
    payment_type: 'booking_full' as const,
    amount_cents: 8500,
  };

  it('accepts a valid minimal payment', () => {
    const result = createPaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it('defaults currency to AUD', () => {
    const result = createPaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('AUD');
    }
  });

  it('accepts all payment types', () => {
    for (const type of ['booking_full', 'booking_deposit', 'package_purchase', 'outstanding_balance']) {
      const result = createPaymentSchema.safeParse({
        ...validPayment,
        payment_type: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts a fully-specified payment', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      currency: 'USD',
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      booking_id: '550e8400-e29b-41d4-a716-446655440001',
      package_purchase_id: '550e8400-e29b-41d4-a716-446655440002',
      description: 'Lesson payment',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid payment type', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      payment_type: 'refund',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      amount_cents: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      amount_cents: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer amount', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      amount_cents: 85.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid currency length', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      currency: 'US',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid student_id', () => {
    const result = createPaymentSchema.safeParse({
      ...validPayment,
      student_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('createRefundSchema', () => {
  const validRefund = {
    payment_id: '550e8400-e29b-41d4-a716-446655440000',
    amount_cents: 5000,
  };

  it('accepts a valid refund', () => {
    const result = createRefundSchema.safeParse(validRefund);
    expect(result.success).toBe(true);
  });

  it('accepts a refund with reason', () => {
    const result = createRefundSchema.safeParse({
      ...validRefund,
      reason: 'Student requested cancellation',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing payment_id', () => {
    const result = createRefundSchema.safeParse({
      amount_cents: 5000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero refund amount', () => {
    const result = createRefundSchema.safeParse({
      ...validRefund,
      amount_cents: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative refund amount', () => {
    const result = createRefundSchema.safeParse({
      ...validRefund,
      amount_cents: -50,
    });
    expect(result.success).toBe(false);
  });
});

describe('updatePaymentStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const status of [
      'pending', 'processing', 'succeeded', 'failed',
      'cancelled', 'refunded', 'partially_refunded',
    ]) {
      const result = updatePaymentStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = updatePaymentStatusSchema.safeParse({
      status: 'voided',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional stripe fields', () => {
    const result = updatePaymentStatusSchema.safeParse({
      status: 'succeeded',
      stripe_payment_intent_id: 'pi_123',
      stripe_charge_id: 'ch_456',
    });
    expect(result.success).toBe(true);
  });

  it('accepts failure_reason', () => {
    const result = updatePaymentStatusSchema.safeParse({
      status: 'failed',
      failure_reason: 'Card declined',
    });
    expect(result.success).toBe(true);
  });
});
