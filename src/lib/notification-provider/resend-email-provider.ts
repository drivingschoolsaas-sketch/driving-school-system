import type { EmailProvider, SendResult } from './types';

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(params: {
    to: string;
    from: string;
    fromName?: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<SendResult> {
    const fromAddress = params.fromName
      ? `${params.fromName} <${params.from}>`
      : params.from;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          reply_to: params.replyTo,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          success: false,
          error: `Resend API error ${response.status}: ${body}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        providerMessageId: data.id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
