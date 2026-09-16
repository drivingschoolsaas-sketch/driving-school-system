// ==================================================
// Payment Service
// ==================================================
// Business logic for payment management.
// All money is stored as integer cents.
// Never trust payment success from the browser —
// use server-side verification via webhooks.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { Payment, Refund } from '@/types/database';
import type { CreatePaymentInput, CreateRefundInput } from '@/validators/payment';
import { logger } from '@/lib/logging';

/**
 * Get payments for an organization with optional filters.
 */
export async function getPayments(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: { status?: string; student_id?: string; booking_id?: string }
): Promise<Payment[]> {
  let query = client
    .from('payments')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false });

  if (options?.status) query = query.eq('status', options.status);
  if (options?.student_id) query = query.eq('student_id', options.student_id);
  if (options?.booking_id) query = query.eq('booking_id', options.booking_id);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Payment[];
}

/**
 * Get a single payment by ID.
 */
export async function getPayment(
  client: SupabaseClient,
  context: AuthorizedContext,
  paymentId: string
): Promise<Payment | null> {
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as Payment | null;
}

/**
 * Create a payment record.
 * The payment starts as "pending" — it must be confirmed
 * via webhook or server-side verification.
 */
export async function createPayment(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreatePaymentInput
): Promise<Payment> {
  const { data, error } = await client
    .from('payments')
    .insert({
      organization_id: context.organizationId,
      payment_type: input.payment_type,
      amount_cents: input.amount_cents,
      currency: input.currency ?? 'AUD',
      student_id: input.student_id ?? null,
      booking_id: input.booking_id ?? null,
      package_purchase_id: input.package_purchase_id ?? null,
      description: input.description ?? null,
      status: 'pending',
      created_by: context.userId,
    })
    .select()
    .single();

  if (error) throw error;

  logger.info('Payment created', {
    paymentId: data.id,
    type: input.payment_type,
    amount: input.amount_cents,
    organizationId: context.organizationId,
  });

  return data as Payment;
}

/**
 * Mark a payment as succeeded (called after webhook verification).
 * Never call this from a browser-initiated flow.
 */
export async function markPaymentSucceeded(
  client: SupabaseClient,
  paymentId: string,
  organizationId: string,
  chargeId?: string
): Promise<Payment> {
  const { data, error } = await client
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: chargeId ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;

  logger.info('Payment marked as succeeded', {
    paymentId,
    organizationId,
  });

  return data as Payment;
}

/**
 * Mark a payment as failed.
 */
export async function markPaymentFailed(
  client: SupabaseClient,
  paymentId: string,
  organizationId: string,
  reason?: string
): Promise<Payment> {
  const { data, error } = await client
    .from('payments')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      failure_reason: reason ?? null,
    })
    .eq('id', paymentId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) throw error;

  logger.warn('Payment marked as failed', {
    paymentId,
    organizationId,
    reason,
  });

  return data as Payment;
}

/**
 * Update the Stripe payment intent ID on a payment record.
 */
export async function setPaymentIntentId(
  client: SupabaseClient,
  paymentId: string,
  organizationId: string,
  stripePaymentIntentId: string
): Promise<void> {
  const { error } = await client
    .from('payments')
    .update({
      stripe_payment_intent_id: stripePaymentIntentId,
      status: 'processing',
    })
    .eq('id', paymentId)
    .eq('organization_id', organizationId);

  if (error) throw error;
}

/**
 * Cancel a pending payment.
 */
export async function cancelPayment(
  client: SupabaseClient,
  context: AuthorizedContext,
  paymentId: string
): Promise<Payment> {
  // Only pending/processing payments can be cancelled
  const existing = await getPayment(client, context, paymentId);
  if (!existing) throw new Error('Payment not found');
  if (existing.status !== 'pending' && existing.status !== 'processing') {
    throw new Error(`Cannot cancel payment with status "${existing.status}"`);
  }

  const { data, error } = await client
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('id', paymentId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) throw error;
  return data as Payment;
}

// --------------------------------------------------
// Refunds
// --------------------------------------------------

/**
 * Get refunds for a payment.
 */
export async function getRefunds(
  client: SupabaseClient,
  context: AuthorizedContext,
  paymentId: string
): Promise<Refund[]> {
  const { data, error } = await client
    .from('refunds')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Refund[];
}

/**
 * Create a refund request.
 * Validates that the refund amount doesn't exceed the
 * remaining refundable amount on the payment.
 */
export async function createRefund(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateRefundInput
): Promise<Refund> {
  // Load the payment to validate
  const payment = await getPayment(client, context, input.payment_id);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'succeeded' && payment.status !== 'partially_refunded') {
    throw new Error(`Cannot refund payment with status "${payment.status}"`);
  }

  // Check refundable amount (includes pending refunds to prevent concurrent over-refund)
  const { data: pendingRefunds } = await client
    .from('refunds')
    .select('amount_cents')
    .eq('payment_id', input.payment_id)
    .eq('organization_id', context.organizationId)
    .in('status', ['pending', 'processing']);

  const pendingTotal = (pendingRefunds ?? []).reduce(
    (sum: number, r: { amount_cents: number }) => sum + r.amount_cents, 0
  );
  const refundableAmount = payment.amount_cents - payment.amount_refunded_cents - pendingTotal;
  if (input.amount_cents > refundableAmount) {
    throw new Error(
      `Refund amount (${input.amount_cents}) exceeds refundable amount (${refundableAmount})`
    );
  }

  const { data, error } = await client
    .from('refunds')
    .insert({
      organization_id: context.organizationId,
      payment_id: input.payment_id,
      amount_cents: input.amount_cents,
      reason: input.reason ?? null,
      status: 'pending',
      refunded_by: context.userId,
    })
    .select()
    .single();

  if (error) throw error;

  logger.info('Refund created', {
    refundId: data.id,
    paymentId: input.payment_id,
    amount: input.amount_cents,
    organizationId: context.organizationId,
  });

  return data as Refund;
}

/**
 * Mark a refund as succeeded and update the parent payment's
 * refunded amount. Called after provider confirms the refund.
 */
export async function markRefundSucceeded(
  client: SupabaseClient,
  refundId: string,
  organizationId: string,
  stripeRefundId?: string
): Promise<Refund> {
  // Get the refund
  const { data: refund, error: refundError } = await client
    .from('refunds')
    .select('*')
    .eq('id', refundId)
    .eq('organization_id', organizationId)
    .single();

  if (refundError) throw refundError;
  const typedRefund = refund as Refund;

  // Update refund status
  const { data: updatedRefund, error: updateError } = await client
    .from('refunds')
    .update({
      status: 'succeeded',
      stripe_refund_id: stripeRefundId ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', refundId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Update parent payment's refunded amount
  const { data: payment, error: paymentError } = await client
    .from('payments')
    .select('amount_cents, amount_refunded_cents')
    .eq('id', typedRefund.payment_id)
    .eq('organization_id', organizationId)
    .single();

  if (paymentError) throw paymentError;

  const newRefundedAmount =
    (payment as { amount_refunded_cents: number }).amount_refunded_cents +
    typedRefund.amount_cents;
  const paymentAmount = (payment as { amount_cents: number }).amount_cents;
  const newStatus =
    newRefundedAmount >= paymentAmount ? 'refunded' : 'partially_refunded';

  await client
    .from('payments')
    .update({
      amount_refunded_cents: newRefundedAmount,
      status: newStatus,
    })
    .eq('id', typedRefund.payment_id)
    .eq('organization_id', organizationId);

  logger.info('Refund succeeded', {
    refundId,
    paymentId: typedRefund.payment_id,
    newStatus,
  });

  return updatedRefund as Refund;
}

/**
 * Mark a refund as failed.
 */
export async function markRefundFailed(
  client: SupabaseClient,
  refundId: string,
  organizationId: string,
  reason?: string
): Promise<void> {
  const { error } = await client
    .from('refunds')
    .update({
      status: 'failed',
      failure_reason: reason ?? null,
    })
    .eq('id', refundId)
    .eq('organization_id', organizationId);

  if (error) throw error;

  logger.warn('Refund failed', { refundId, organizationId, reason });
}
