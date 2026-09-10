// ==================================================
// Stripe Webhook Handler
// ==================================================
// Receives Stripe webhook events, verifies signatures,
// and processes them idempotently.
//
// CRITICAL: This endpoint uses the raw request body
// for signature verification. Do not parse JSON before
// verification.
//
// NON-MVP NOTE (P1-8): Payments are gated behind the
// 'payments' feature flag at the UI/checkout level. This
// webhook route is NOT gated — Stripe retries on non-200
// responses, so rejecting events here would cause infinite
// retries. The UI gate prevents new payments from being
// created, which is the correct enforcement point.

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/database';
import { getPaymentProvider } from '@/lib/payment-provider';
import {
  recordWebhookEvent,
  markWebhookProcessing,
  markWebhookProcessed,
  markWebhookFailed,
} from '@/services/webhook-service';
import {
  markPaymentSucceeded,
  markPaymentFailed,
  markRefundSucceeded,
  markRefundFailed,
} from '@/services/payment-service';
import { logger } from '@/lib/logging';

/**
 * Stripe webhook events we handle.
 */
const HANDLED_EVENTS = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'charge.refund.updated',
]);

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify the event
  const provider = getPaymentProvider();
  const event = await provider.verifyWebhookEvent(rawBody, signature);
  if (!event) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Skip events we don't handle
  if (!HANDLED_EVENTS.has(event.eventType)) {
    logger.info('Webhook event type not handled, skipping', {
      eventType: event.eventType,
      eventId: event.eventId,
    });
    return NextResponse.json({ received: true, handled: false });
  }

  // Use service role client for webhook processing
  // (webhooks are server-to-server, not user-authenticated)
  const client = getAdminClient();

  // Record the event (idempotency check)
  const webhookEvent = await recordWebhookEvent(client, {
    provider: 'stripe',
    eventId: event.eventId,
    eventType: event.eventType,
    payload: event.payload,
  });

  // Already processed — return success (idempotent)
  if (!webhookEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Process the event
  try {
    await markWebhookProcessing(client, webhookEvent.id);
    await processStripeEvent(client, event.eventType, event.payload);
    await markWebhookProcessed(client, webhookEvent.id);

    return NextResponse.json({ received: true, handled: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Webhook processing error', {
      eventId: event.eventId,
      eventType: event.eventType,
      error: errorMessage,
    });

    await markWebhookFailed(client, webhookEvent.id, errorMessage);

    // Return 200 anyway to prevent Stripe from retrying
    // (we handle our own retry logic via attempts)
    return NextResponse.json({ received: true, error: errorMessage });
  }
}

/**
 * Route a Stripe event to the appropriate handler.
 */
async function processStripeEvent(
  client: SupabaseClient,
  eventType: string,
  payload: Record<string, unknown>
) {
  switch (eventType) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(client, payload);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(client, payload);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(client, payload);
      break;

    case 'charge.refund.updated':
      await handleRefundUpdated(client, payload);
      break;

    default:
      logger.warn('Unhandled Stripe event type', { eventType });
  }
}

/**
 * Handle payment_intent.succeeded — mark the payment as successful.
 */
async function handlePaymentIntentSucceeded(
  client: SupabaseClient,
  payload: Record<string, unknown>
) {
  const paymentIntentId = payload.id as string;
  const chargeId =
    typeof payload.latest_charge === 'string'
      ? payload.latest_charge
      : (payload.latest_charge as Record<string, unknown> | null)?.id as string | undefined;

  // Find the payment by stripe_payment_intent_id
  const { data } = await client
    .from('payments')
    .select('id, organization_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  const payment = data as { id: string; organization_id: string } | null;
  if (!payment) {
    logger.warn('No matching payment for payment_intent.succeeded', {
      paymentIntentId,
    });
    return;
  }

  await markPaymentSucceeded(
    client,
    payment.id,
    payment.organization_id,
    chargeId
  );
}

/**
 * Handle payment_intent.payment_failed — mark the payment as failed.
 */
async function handlePaymentIntentFailed(
  client: SupabaseClient,
  payload: Record<string, unknown>
) {
  const paymentIntentId = payload.id as string;
  const lastError = payload.last_payment_error as Record<string, unknown> | null;
  const reason = lastError?.message as string | undefined;

  const { data: failedData } = await client
    .from('payments')
    .select('id, organization_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  const payment = failedData as { id: string; organization_id: string } | null;
  if (!payment) {
    logger.warn('No matching payment for payment_intent.payment_failed', {
      paymentIntentId,
    });
    return;
  }

  await markPaymentFailed(client, payment.id, payment.organization_id, reason);
}

/**
 * Handle charge.refunded — mark refund(s) as succeeded.
 */
async function handleChargeRefunded(
  client: SupabaseClient,
  payload: Record<string, unknown>
) {
  const chargeId = payload.id as string;

  // Find the payment by stripe_charge_id
  const { data: chargeData } = await client
    .from('payments')
    .select('id, organization_id')
    .eq('stripe_charge_id', chargeId)
    .maybeSingle();

  const payment = chargeData as { id: string; organization_id: string } | null;
  if (!payment) {
    logger.warn('No matching payment for charge.refunded', { chargeId });
    return;
  }

  // Find pending refunds for this payment and mark them
  const { data: pendingRefundsData } = await client
    .from('refunds')
    .select('id')
    .eq('payment_id', payment.id)
    .eq('organization_id', payment.organization_id)
    .in('status', ['pending', 'processing']);

  const pendingRefunds = (pendingRefundsData ?? []) as Array<{ id: string }>;
  for (const refund of pendingRefunds) {
    await markRefundSucceeded(client, refund.id, payment.organization_id);
  }
}

/**
 * Handle charge.refund.updated — update refund status.
 */
async function handleRefundUpdated(
  client: SupabaseClient,
  payload: Record<string, unknown>
) {
  const stripeRefundId = payload.id as string;
  const status = payload.status as string;

  const { data: refundData } = await client
    .from('refunds')
    .select('id, organization_id')
    .eq('stripe_refund_id', stripeRefundId)
    .maybeSingle();

  const refund = refundData as { id: string; organization_id: string } | null;
  if (!refund) {
    logger.warn('No matching refund for charge.refund.updated', {
      stripeRefundId,
    });
    return;
  }

  if (status === 'succeeded') {
    await markRefundSucceeded(client, refund.id, refund.organization_id, stripeRefundId);
  } else if (status === 'failed') {
    await markRefundFailed(
      client,
      refund.id,
      refund.organization_id,
      `Stripe refund failed: ${payload.failure_reason ?? 'unknown'}`
    );
  }
}
