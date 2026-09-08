// ==================================================
// Log Email Provider (Development)
// ==================================================
// Logs emails to the structured logger instead of
// sending them. Used in development and testing.
// Replace with a real provider (Resend, SendGrid, etc.)
// in production via getEmailProvider().

import { logger } from '@/lib/logging';
import type { EmailProvider, SendResult } from './types';

export class LogEmailProvider implements EmailProvider {
  readonly name = 'log';

  async send(params: {
    to: string;
    from: string;
    fromName?: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<SendResult> {
    logger.info('Email sent (log provider)', {
      to: params.to,
      from: params.from,
      subject: params.subject,
      bodyLength: params.html.length,
    });

    return {
      success: true,
      providerMessageId: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }
}
