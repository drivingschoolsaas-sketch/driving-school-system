// ==================================================
// School Settings Page
// ==================================================
// Owner-only page showing current school configuration.
// Displays branding, contact, booking, and SEO settings.
// Editing will be added via Server Actions in a later phase.

import { getDashboardContext, requireRole } from '@/lib/auth';
import { USER_ROLES } from '@/config/constants';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const { auth, organization, settings } = await getDashboardContext();
  requireRole(auth, USER_ROLES.SCHOOL_OWNER);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your school&apos;s configuration and branding.
        </p>
      </div>

      {/* Organization Info */}
      <SettingsSection title="Organization" icon="🏢">
        <SettingsRow label="Name" value={organization.name} />
        <SettingsRow label="Slug" value={organization.slug} />
        <SettingsRow label="Status" value={organization.status} capitalize />
        <SettingsRow label="Timezone" value={organization.timezone} />
        <SettingsRow label="Currency" value={organization.currency} />
        <SettingsRow label="Country" value={organization.country} />
        <SettingsRow label="Phone" value={organization.phone} />
        <SettingsRow label="Email" value={organization.email} />
      </SettingsSection>

      {/* Branding */}
      <SettingsSection title="Branding" icon="🎨">
        <SettingsRow label="Primary Color" value={settings?.primary_color ?? '#2563eb'}>
          <span
            className="inline-block h-5 w-5 rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: settings?.primary_color ?? '#2563eb' }}
          />
        </SettingsRow>
        <SettingsRow label="Secondary Color" value={settings?.secondary_color ?? '#1e40af'}>
          <span
            className="inline-block h-5 w-5 rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: settings?.secondary_color ?? '#1e40af' }}
          />
        </SettingsRow>
        <SettingsRow label="Logo URL" value={settings?.logo_url ?? 'Not set'} />
        <SettingsRow label="Favicon URL" value={settings?.favicon_url ?? 'Not set'} />
        <SettingsRow label="Hero Title" value={settings?.hero_title ?? 'Not set'} />
        <SettingsRow label="Hero Subtitle" value={settings?.hero_subtitle ?? 'Not set'} />
      </SettingsSection>

      {/* Contact */}
      <SettingsSection title="Contact" icon="📞">
        <SettingsRow label="Phone" value={settings?.contact_phone ?? organization.phone ?? 'Not set'} />
        <SettingsRow label="Email" value={settings?.contact_email ?? organization.email ?? 'Not set'} />
        <SettingsRow label="Address" value={settings?.contact_address ?? 'Not set'} />
      </SettingsSection>

      {/* Booking */}
      <SettingsSection title="Booking Configuration" icon="📋">
        <SettingsRow label="Online Booking" value={settings?.allow_online_booking ? 'Enabled' : 'Disabled'} />
        <SettingsRow label="Min Booking Notice" value={`${settings?.min_booking_notice_hours ?? 24} hours`} />
        <SettingsRow label="Max Advance Booking" value={`${settings?.max_advance_booking_days ?? 30} days`} />
        <SettingsRow label="Cancellation Notice" value={`${settings?.cancellation_notice_hours ?? 24} hours`} />
        <SettingsRow label="Default Duration" value={`${settings?.default_lesson_duration ?? 60} min`} />
        <SettingsRow label="Default Travel Buffer" value={`${settings?.default_travel_buffer_minutes ?? 15} min`} />
        <SettingsRow label="Default Transmission" value={settings?.default_transmission ?? 'automatic'} capitalize />
      </SettingsSection>

      {/* SEO */}
      <SettingsSection title="SEO & Meta" icon="🔍">
        <SettingsRow label="Meta Title" value={settings?.meta_title ?? 'Not set'} />
        <SettingsRow label="Meta Description" value={settings?.meta_description ?? 'Not set'} />
        <SettingsRow label="About Text" value={settings?.about_text ? `${settings.about_text.substring(0, 100)}...` : 'Not set'} />
      </SettingsSection>

      {/* Social */}
      <SettingsSection title="Social Links" icon="🌐">
        <SettingsRow label="Facebook" value={settings?.social_facebook ?? 'Not set'} />
        <SettingsRow label="Instagram" value={settings?.social_instagram ?? 'Not set'} />
        <SettingsRow label="TikTok" value={settings?.social_tiktok ?? 'Not set'} />
        <SettingsRow label="Google Reviews" value={settings?.social_google_review ?? 'Not set'} />
      </SettingsSection>

      {/* Sections */}
      <SettingsSection title="Website Sections" icon="📄">
        <div className="py-2">
          <div className="flex flex-wrap gap-2">
            {(settings?.sections_enabled ?? ['lessons', 'packages', 'instructors', 'areas', 'contact']).map((section) => (
              <span
                key={section}
                className="rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1 text-xs font-medium capitalize"
              >
                {section}
              </span>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Edit notice */}
      <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Settings editing forms will be available in a future update.
        </p>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-5 py-3">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700 px-5">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  label,
  value,
  capitalize,
  children,
}: {
  label: string;
  value: string | null;
  capitalize?: boolean;
  children?: React.ReactNode;
}) {
  const displayValue = value || 'Not set';
  const isNotSet = !value || value === 'Not set';

  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {children}
        <span
          className={`text-sm text-right truncate ${
            isNotSet
              ? 'text-gray-400 dark:text-gray-500 italic'
              : 'text-gray-900 dark:text-white font-medium'
          } ${capitalize ? 'capitalize' : ''}`}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
}
