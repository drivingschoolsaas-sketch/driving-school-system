// ==================================================
// Payment Provider Types
// ==================================================
// Abstract interface for payment providers.
// Currently backed by Stripe, but designed to be
// swappable (e.g., for testing or alternative providers).

/**
 * Result of creating a payment intent with the provider.
 */
export interface CreatePaymentIntentResult {
  /** Provider's payment intent ID (e.g., Stripe pi_xxx) */
  providerPaymentIntentId: string;
  /** Client secret for frontend SDK (e.g., Stripe Elements) */
  clientSecret: string;
  /** Provider's status string */
  providerStatus: string;
}

/**
 * Result of confirming a payment (server-side confirmation).
 */
export interface ConfirmPaymentResult {
  providerPaymentIntentId: string;
  providerStatus: string;
  chargeId: string | null;
}

/**
 * Result of creating a refund.
 */
export interface CreateRefundResult {
  providerRefundId: string;
  providerStatus: string;
}

/**
 * Verified webhook event from the provider.
 */
export interface VerifiedWebhookEvent {
  eventId: string;
  eventType: string;
  /** Raw payload from the provider */
  payload: Record<string, unknown>;
}

/**
 * Payment provider interface.
 * Implementations must handle their own API key / config.
 */
export interface PaymentProvider {
  readonly name: string;

  /**
   * Create a payment intent (authorization hold).
   * The customer completes payment on the frontend.
   */
  createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<CreatePaymentIntentResult>;

  /**
   * Retrieve a payment intent's current status.
   */
  getPaymentIntentStatus(paymentIntentId: string): Promise<{
    providerStatus: string;
    chargeId: string | null;
    amountCents: number;
    amountRefundedCents: number;
  }>;

  /**
   * Create a refund for a payment.
   */
  createRefund(params: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<CreateRefundResult>;

  /**
   * Verify and parse a webhook event from the provider.
   * Returns null if verification fails.
   */
  verifyWebhookEvent(
    rawBody: string | Buffer,
    signature: string
  ): Promise<VerifiedWebhookEvent | null>;

  /**
   * Create or retrieve a customer in the provider's system.
   */
  getOrCreateCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<{ customerId: string }>;
}
