// ==================================================
// Payment Validators
// ==================================================

import { z } from 'zod';

/**
 * Schema for creating a payment (admin-initiated or system-initiated).
 */
export const createPaymentSchema = z.object({
  payment_type: z.enum([
    'booking_full',
    'booking_deposit',
    'package_purchase',
    'outstanding_balance',
  ]),
  amount_cents: z.number().int().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be a 3-letter code').default('AUD'),
  student_id: z.string().uuid().optional(),
  booking_id: z.string().uuid().optional(),
  package_purchase_id: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/**
 * Schema for requesting a refund.
 */
export const createRefundSchema = z.object({
  payment_id: z.string().uuid('Payment ID is required'),
  amount_cents: z.number().int().positive('Refund amount must be positive'),
  reason: z.string().max(500).optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;

/**
 * Schema for updating a payment status (internal/webhook use).
 */
export const updatePaymentStatusSchema = z.object({
  status: z.enum([
    'pending',
    'processing',
    'succeeded',
    'failed',
    'cancelled',
    'refunded',
    'partially_refunded',
  ]),
  stripe_payment_intent_id: z.string().optional(),
  stripe_charge_id: z.string().optional(),
  failure_reason: z.string().max(500).optional(),
});

export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
