// ==================================================
// Payment Provider Index
// ==================================================
// Factory for creating the configured payment provider.

export type { PaymentProvider, VerifiedWebhookEvent } from './types';
export { StripePaymentProvider } from './stripe-provider';

import type { PaymentProvider } from './types';
import { StripePaymentProvider } from './stripe-provider';

let cachedProvider: PaymentProvider | null = null;

/**
 * Get the configured payment provider.
 * Currently always returns Stripe; add env-based switching here
 * if alternative providers are needed.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!cachedProvider) {
    cachedProvider = new StripePaymentProvider();
  }
  return cachedProvider;
}
