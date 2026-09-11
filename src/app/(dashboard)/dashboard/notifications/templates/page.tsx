// ==================================================
// Notification Template Management Page
// ==================================================
// Admins can customise email templates for each
// notification type. Falls back to built-in defaults.
// Spec: Phase 13 — Notifications.

import Link from 'next/link';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getNotificationTemplates } from '@/services/notification-service';
import { DEFAULT_TEMPLATES } from '@/lib/notification-provider/template-engine';
import { TemplateEditorList } from './template-editor';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email Templates',
};

export default async function NotificationTemplatesPage() {
  const { auth, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.NOTIFICATION_MANAGE);
  const client = await createServerSupabaseClient();
  const primaryColor = settings?.primary_color ?? '#2563eb';

  // Get custom templates for this org
  const customTemplates = await getNotificationTemplates(client, auth);
  const customMap = new Map(
    customTemplates.map((t) => [`${t.notification_type}:${t.channel}`, t])
  );

  // Build merged template list: one entry per notification type
  const allTypes = Object.keys(DEFAULT_TEMPLATES);
  const merged = allTypes.map((type) => {
    const custom = customMap.get(`${type}:email`);
    const defaultTemplate = DEFAULT_TEMPLATES[type];

    return {
      notification_type: type,
      channel: 'email',
      subject: custom?.subject ?? defaultTemplate.subject,
      body: custom?.body ?? defaultTemplate.body,
      is_active: custom?.is_active ?? true,
      is_custom: !!custom,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
            >
              Notifications
            </Link>
            <span className="text-sm text-gray-400 dark:text-gray-500">›</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Email Templates
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customise the emails sent to your students. Use {'{{variable}}'} placeholders for dynamic content.
          </p>
        </div>
      </div>

      <TemplateEditorList templates={merged} primaryColor={primaryColor} />
    </div>
  );
}
