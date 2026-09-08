// ==================================================
// Notification Provider Index
// ==================================================
// Factory for email and SMS providers.
// Swap implementations here when configuring production
// providers (Resend, SendGrid, Twilio, etc.).

export type { EmailProvider, SmsProvider, SendResult } from './types';
export { LogEmailProvider } from './log-email-provider';
export { LogSmsProvider } from './log-sms-provider';

import type { EmailProvider } from './types';
import type { SmsProvider } from './types';
import { LogEmailProvider } from './log-email-provider';
import { LogSmsProvider } from './log-sms-provider';

let cachedEmailProvider: EmailProvider | null = null;
let cachedSmsProvider: SmsProvider | null = null;

/**
 * Get the configured email provider.
 * Override here to use Resend, SendGrid, etc.
 */
export function getEmailProvider(): EmailProvider {
  if (!cachedEmailProvider) {
    // TODO: Check env vars for a real provider
    // if (process.env.RESEND_API_KEY) {
    //   cachedEmailProvider = new ResendEmailProvider();
    // } else {
    cachedEmailProvider = new LogEmailProvider();
    // }
  }
  return cachedEmailProvider;
}

/**
 * Get the configured SMS provider.
 * Override here to use Twilio, etc.
 */
export function getSmsProvider(): SmsProvider {
  if (!cachedSmsProvider) {
    // TODO: Check env vars for a real provider
    cachedSmsProvider = new LogSmsProvider();
  }
  return cachedSmsProvider;
}
