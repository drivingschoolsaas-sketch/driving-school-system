// ==================================================
// Notification Service
// ==================================================
// Queues, renders, and sends notifications through
// the configured email/SMS providers. Handles template
// resolution, preference checking, and delivery logging.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type {
  Notification,
  NotificationTemplate,
  NotificationPreference,
} from '@/types/database';
import type { NotificationType, NotificationChannel } from '@/config/constants';
import {
  renderTemplate,
  DEFAULT_TEMPLATES,
} from '@/lib/notification-provider/template-engine';
import {
  getEmailProvider,
  getSmsProvider,
} from '@/lib/notification-provider';
import { logger } from '@/lib/logging';

// --------------------------------------------------
// Template Management
// --------------------------------------------------

/**
 * Get all notification templates for an organization.
 */
export async function getNotificationTemplates(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<NotificationTemplate[]> {
  const { data, error } = await client
    .from('notification_templates')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('notification_type');

  if (error) throw error;
  return (data ?? []) as NotificationTemplate[];
}

/**
 * Get or create a template for a specific type and channel.
 * Falls back to the default template if none exists.
 */
export async function getTemplate(
  client: SupabaseClient,
  organizationId: string,
  notificationType: NotificationType,
  channel: NotificationChannel = 'email'
): Promise<{ subject: string | null; body: string } | null> {
  // Try org-specific template first
  const { data } = await client
    .from('notification_templates')
    .select('subject, body, is_active')
    .eq('organization_id', organizationId)
    .eq('notification_type', notificationType)
    .eq('channel', channel)
    .maybeSingle();

  const template = data as { subject: string | null; body: string; is_active: boolean } | null;

  if (template) {
    if (!template.is_active) return null; // Template disabled
    return { subject: template.subject, body: template.body };
  }

  // Fall back to default
  const defaultTemplate = DEFAULT_TEMPLATES[notificationType];
  if (!defaultTemplate) return null;

  return { subject: defaultTemplate.subject, body: defaultTemplate.body };
}

/**
 * Upsert a notification template.
 */
export async function upsertNotificationTemplate(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: {
    notification_type: NotificationType;
    channel?: NotificationChannel;
    subject?: string;
    body: string;
    is_active?: boolean;
  }
): Promise<NotificationTemplate> {
  const { data, error } = await client
    .from('notification_templates')
    .upsert(
      {
        organization_id: context.organizationId,
        notification_type: input.notification_type,
        channel: input.channel ?? 'email',
        subject: input.subject ?? null,
        body: input.body,
        is_active: input.is_active ?? true,
      },
      {
        onConflict: 'organization_id,notification_type,channel',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data as NotificationTemplate;
}

// --------------------------------------------------
// Preferences
// --------------------------------------------------

/**
 * Get notification preferences for a user in an organization.
 */
export async function getNotificationPreferences(
  client: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<NotificationPreference[]> {
  const { data, error } = await client
    .from('notification_preferences')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as NotificationPreference[];
}

/**
 * Check if a user has opted out of a notification type.
 */
export async function isNotificationEnabled(
  client: SupabaseClient,
  organizationId: string,
  userId: string,
  notificationType: NotificationType,
  channel: NotificationChannel = 'email'
): Promise<boolean> {
  const { data } = await client
    .from('notification_preferences')
    .select('is_enabled')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('notification_type', notificationType)
    .eq('channel', channel)
    .maybeSingle();

  const pref = data as { is_enabled: boolean } | null;

  // Default to enabled if no preference set
  return pref?.is_enabled ?? true;
}

// --------------------------------------------------
// Notification Sending
// --------------------------------------------------

/**
 * Queue and send a notification.
 * This is the main entry point for sending notifications.
 *
 * 1. Checks user preferences (opt-out)
 * 2. Resolves the template
 * 3. Renders with variables
 * 4. Records the notification
 * 5. Sends via the appropriate provider
 * 6. Updates delivery status
 */
export async function sendNotification(
  client: SupabaseClient,
  params: {
    organizationId: string;
    notificationType: NotificationType;
    channel?: NotificationChannel;
    recipientUserId?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientName?: string;
    variables: Record<string, string | number | undefined | null>;
    bookingId?: string;
    paymentId?: string;
    /** Override the sender email (defaults to school contact email) */
    fromEmail?: string;
    fromName?: string;
  }
): Promise<Notification | null> {
  const channel = params.channel ?? 'email';

  // 1. Check preferences
  if (params.recipientUserId) {
    const enabled = await isNotificationEnabled(
      client,
      params.organizationId,
      params.recipientUserId,
      params.notificationType,
      channel
    );
    if (!enabled) {
      logger.info('Notification skipped (user opted out)', {
        type: params.notificationType,
        userId: params.recipientUserId,
        channel,
      });
      return null;
    }
  }

  // 2. Get template
  const template = await getTemplate(
    client,
    params.organizationId,
    params.notificationType,
    channel
  );

  if (!template) {
    logger.warn('No template found for notification', {
      type: params.notificationType,
      channel,
      organizationId: params.organizationId,
    });
    return null;
  }

  // 3. Render
  const renderedSubject = template.subject
    ? renderTemplate(template.subject, params.variables)
    : null;
  const renderedBody = renderTemplate(template.body, params.variables);

  // 4. Record the notification
  const { data: notification, error: insertError } = await client
    .from('notifications')
    .insert({
      organization_id: params.organizationId,
      notification_type: params.notificationType,
      channel,
      recipient_user_id: params.recipientUserId ?? null,
      recipient_email: params.recipientEmail ?? null,
      recipient_phone: params.recipientPhone ?? null,
      recipient_name: params.recipientName ?? null,
      subject: renderedSubject,
      body: renderedBody,
      booking_id: params.bookingId ?? null,
      payment_id: params.paymentId ?? null,
      status: 'queued',
    })
    .select()
    .single();

  if (insertError) throw insertError;
  const notif = notification as Notification;

  // 5. Send
  try {
    // Mark as sending
    await client
      .from('notifications')
      .update({ status: 'sending', attempts: notif.attempts + 1 })
      .eq('id', notif.id);

    let result;

    if (channel === 'email' && params.recipientEmail) {
      const emailProvider = getEmailProvider();
      result = await emailProvider.send({
        to: params.recipientEmail,
        from: params.fromEmail ?? 'noreply@driveflow.com.au',
        fromName: params.fromName,
        subject: renderedSubject ?? params.notificationType,
        html: renderedBody.replace(/\n/g, '<br>'),
      });
    } else if (channel === 'sms' && params.recipientPhone) {
      const smsProvider = getSmsProvider();
      result = await smsProvider.send({
        to: params.recipientPhone,
        body: renderedBody,
      });
    } else {
      throw new Error(
        `Missing recipient for channel "${channel}": need ${
          channel === 'email' ? 'recipientEmail' : 'recipientPhone'
        }`
      );
    }

    // 6. Update status
    if (result.success) {
      await client
        .from('notifications')
        .update({
          status: 'sent',
          provider: channel === 'email' ? getEmailProvider().name : getSmsProvider().name,
          provider_message_id: result.providerMessageId ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq('id', notif.id);

      logger.info('Notification sent', {
        id: notif.id,
        type: params.notificationType,
        channel,
        to: params.recipientEmail ?? params.recipientPhone,
      });
    } else {
      await client
        .from('notifications')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: result.error ?? 'Unknown error',
        })
        .eq('id', notif.id);

      logger.warn('Notification send failed', {
        id: notif.id,
        error: result.error,
      });
    }

    // Re-fetch the updated notification
    const { data: updated } = await client
      .from('notifications')
      .select('*')
      .eq('id', notif.id)
      .single();

    return (updated as Notification) ?? notif;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await client
      .from('notifications')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: errorMessage,
      })
      .eq('id', notif.id);

    logger.error('Notification send error', {
      id: notif.id,
      error: errorMessage,
    });

    return notif;
  }
}

// --------------------------------------------------
// Notification Log Queries
// --------------------------------------------------

/**
 * Get notification history for an organization.
 */
export async function getNotifications(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: {
    status?: string;
    notification_type?: string;
    limit?: number;
  }
): Promise<Notification[]> {
  let query = client
    .from('notifications')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.status) query = query.eq('status', options.status);
  if (options?.notification_type) {
    query = query.eq('notification_type', options.notification_type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Notification[];
}

/**
 * Get notifications for a specific user.
 */
export async function getUserNotifications(
  client: SupabaseClient,
  userId: string,
  organizationId: string,
  options?: { limit?: number }
): Promise<Notification[]> {
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50);

  if (error) throw error;
  return (data ?? []) as Notification[];
}
