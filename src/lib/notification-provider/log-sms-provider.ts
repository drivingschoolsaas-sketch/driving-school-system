// ==================================================
// Log SMS Provider (Development)
// ==================================================
// Logs SMS messages to the structured logger instead of
// sending them. Replace with Twilio or similar in production.

import { logger } from '@/lib/logging';
import type { SmsProvider, SendResult } from './types';

export class LogSmsProvider implements SmsProvider {
  readonly name = 'log';

  async send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<SendResult> {
    logger.info('SMS sent (log provider)', {
      to: params.to,
      bodyLength: params.body.length,
    });

    return {
      success: true,
      providerMessageId: `log_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }
}
