// ==================================================
// Stripe Payment Provider
// ==================================================
// Concrete implementation of PaymentProvider using
// the Stripe API. Requires STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET environment variables.

import Stripe from 'stripe';
import { logger } from '@/lib/logging';
import type {
  PaymentProvider,
  CreatePaymentIntentResult,
  CreateRefundResult,
  VerifiedWebhookEvent,
} from './types';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';

  async createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<CreatePaymentIntentResult> {
    const stripe = getStripe();

    const intent = await stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      description: params.description,
      metadata: params.metadata ?? {},
      automatic_payment_methods: { enabled: true },
    });

    logger.info('Stripe payment intent created', {
      paymentIntentId: intent.id,
      amount: params.amountCents,
      currency: params.currency,
    });

    return {
      providerPaymentIntentId: intent.id,
      clientSecret: intent.client_secret ?? '',
      providerStatus: intent.status,
    };
  }

  async getPaymentIntentStatus(paymentIntentId: string) {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      providerStatus: intent.status,
      chargeId: intent.latest_charge
        ? typeof intent.latest_charge === 'string'
          ? intent.latest_charge
          : intent.latest_charge.id
        : null,
      amountCents: intent.amount,
      amountRefundedCents:
        typeof intent.latest_charge === 'object' && intent.latest_charge
          ? intent.latest_charge.amount_refunded
          : 0,
    };
  }

  async createRefund(params: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<CreateRefundResult> {
    const stripe = getStripe();

    const refund = await stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amountCents,
      reason: 'requested_by_customer',
      metadata: params.reason ? { reason: params.reason } : {},
    });

    logger.info('Stripe refund created', {
      refundId: refund.id,
      paymentIntentId: params.paymentIntentId,
      amount: params.amountCents,
    });

    return {
      providerRefundId: refund.id,
      providerStatus: refund.status ?? 'pending',
    };
  }

  async verifyWebhookEvent(
    rawBody: string | Buffer,
    signature: string
  ): Promise<VerifiedWebhookEvent | null> {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      return null;
    }

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );

      return {
        eventId: event.id,
        eventType: event.type,
        payload: event.data.object as unknown as Record<string, unknown>,
      };
    } catch (err) {
      logger.warn('Stripe webhook verification failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async getOrCreateCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<{ customerId: string }> {
    const stripe = getStripe();

    // Search for existing customer by email
    const existing = await stripe.customers.list({
      email: params.email,
      limit: 1,
    });

    if (existing.data.length > 0) {
      return { customerId: existing.data[0].id };
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata ?? {},
    });

    logger.info('Stripe customer created', {
      customerId: customer.id,
      email: params.email,
    });

    return { customerId: customer.id };
  }
}
