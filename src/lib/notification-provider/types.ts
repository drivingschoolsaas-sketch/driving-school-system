// ==================================================
// Notification Provider Types
// ==================================================
// Abstract interfaces for email and SMS providers.
// Implementations can be swapped without changing
// business logic.

/**
 * Result of sending a notification.
 */
export interface SendResult {
  /** Whether the send was accepted by the provider */
  success: boolean;
  /** Provider's message ID for tracking */
  providerMessageId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Email provider interface.
 */
export interface EmailProvider {
  readonly name: string;

  send(params: {
    to: string;
    from: string;
    fromName?: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<SendResult>;
}

/**
 * SMS provider interface.
 */
export interface SmsProvider {
  readonly name: string;

  send(params: {
    to: string;
    body: string;
    from?: string;
  }): Promise<SendResult>;
}
