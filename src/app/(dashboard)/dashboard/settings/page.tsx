// ==================================================
// School Settings Page (Editable)
// ==================================================
// Owner-only page for managing school branding,
// contact info, booking config, SEO, and social links.

import { getDashboardContext, requireRole } from '@/lib/auth';
import { USER_ROLES } from '@/config/constants';
import type { Metadata } from 'next';
import { SettingsEditor } from './settings-editor';

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const { auth, organization, settings } = await getDashboardContext();
  requireRole(auth, USER_ROLES.SCHOOL_OWNER);

  return (
    <SettingsEditor
      organization={organization}
      settings={settings}
    />
  );
}
