'use server';

// ==================================================
// Notification Template Actions
// ==================================================
// Admin CRUD for email/SMS notification templates.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { upsertNotificationTemplate } from '@/services/notification-service';
import { audit } from '@/lib/audit';
import type { NotificationType, NotificationChannel } from '@/config/constants';

export interface TemplateActionState {
  success: boolean;
  error?: string;
}

export async function saveTemplateAction(
  _prev: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.NOTIFICATION_MANAGE);
    const client = await createServerSupabaseClient();

    const notificationType = formData.get('notification_type') as string;
    const channel = (formData.get('channel') as string) || 'email';
    const subject = (formData.get('subject') as string)?.trim() || null;
    const body = (formData.get('body') as string)?.trim();
    const isActive = formData.get('is_active') === 'true';

    if (!notificationType) {
      return { success: false, error: 'Notification type is required.' };
    }
    if (!body) {
      return { success: false, error: 'Template body is required.' };
    }

    await upsertNotificationTemplate(client, auth, {
      notification_type: notificationType as NotificationType,
      channel: channel as NotificationChannel,
      subject: subject ?? undefined,
      body,
      is_active: isActive,
    });

    audit(client, auth, {
      action: 'notification_template.saved',
      resourceType: 'notification_template',
      resourceId: notificationType,
      details: { channel, is_active: isActive },
    });

    revalidatePath('/dashboard/notifications/templates');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save template';
    return { success: false, error: message };
  }
}

export async function resetTemplateAction(
  notificationType: string,
  channel: string = 'email'
): Promise<TemplateActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.NOTIFICATION_MANAGE);
    const client = await createServerSupabaseClient();

    // Delete the custom template so the system falls back to default
    const { error } = await client
      .from('notification_templates')
      .delete()
      .eq('organization_id', auth.organizationId)
      .eq('notification_type', notificationType)
      .eq('channel', channel);

    if (error) throw error;

    audit(client, auth, {
      action: 'notification_template.reset',
      resourceType: 'notification_template',
      resourceId: notificationType,
    });

    revalidatePath('/dashboard/notifications/templates');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reset template';
    return { success: false, error: message };
  }
}
