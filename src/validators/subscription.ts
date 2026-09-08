// ==================================================
// Subscription Validators
// ==================================================

import { z } from 'zod';

/**
 * Schema for creating a subscription (during onboarding).
 */
export const createSubscriptionSchema = z.object({
  plan_id: z.string().uuid('Plan ID is required'),
  billing_interval: z.enum(['monthly', 'yearly']).default('monthly'),
  stripe_subscription_id: z.string().optional(),
  stripe_customer_id: z.string().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

/**
 * Schema for changing a plan.
 */
export const changePlanSchema = z.object({
  plan_id: z.string().uuid('Plan ID is required'),
});

export type ChangePlanInput = z.infer<typeof changePlanSchema>;

/**
 * Schema for suspending a subscription (platform admin).
 */
export const suspendSubscriptionSchema = z.object({
  reason: z
    .string()
    .min(1, 'Suspension reason is required')
    .max(500, 'Suspension reason too long'),
});

export type SuspendSubscriptionInput = z.infer<typeof suspendSubscriptionSchema>;

/**
 * Schema for updating billing interval.
 */
export const updateBillingIntervalSchema = z.object({
  billing_interval: z.enum(['monthly', 'yearly']),
});

export type UpdateBillingIntervalInput = z.infer<typeof updateBillingIntervalSchema>;
