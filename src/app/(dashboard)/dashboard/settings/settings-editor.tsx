'use client';

import { useState, useTransition } from 'react';
import type { Organization, SchoolSettings } from '@/types/database';
import { updateSchoolSettingsAction, updateOrganizationAction } from '../actions';

interface Props {
  organization: Organization;
  settings: SchoolSettings | null;
}

export function SettingsEditor({ organization, settings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'branding' | 'contact' | 'booking' | 'seo' | 'social'>('branding');

  const handleOrgSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateOrganizationAction(formData);
      setMessage(result.success
        ? { type: 'success', text: 'Organization info updated!' }
        : { type: 'error', text: result.error ?? 'Update failed.' }
      );
    });
  };

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSchoolSettingsAction(formData);
      setMessage(result.success
        ? { type: 'success', text: 'Settings saved! Changes are live on your website.' }
        : { type: 'error', text: result.error ?? 'Save failed.' }
      );
    });
  };

  const tabs = [
    { id: 'branding' as const, label: 'Branding', icon: '🎨' },
    { id: 'contact' as const, label: 'Contact', icon: '📞' },
    { id: 'booking' as const, label: 'Booking', icon: '📋' },
    { id: 'seo' as const, label: 'SEO & Content', icon: '🔍' },
    { id: 'social' as const, label: 'Social', icon: '🌐' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your school&apos;s configuration. Changes are reflected on your public website immediately.
        </p>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Organization Info */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
          <span className="text-lg">🏢</span>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Organization</h2>
        </div>
        <form onSubmit={handleOrgSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Name" name="name" defaultValue={organization.name} required />
            <Field label="Phone" name="phone" type="tel" defaultValue={organization.phone ?? ''} />
            <Field label="Email" name="email" type="email" defaultValue={organization.email ?? ''} />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Slug: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{organization.slug}</code></span>
            <span>Status: <span className="capitalize font-medium">{organization.status}</span></span>
            <span>Timezone: {organization.timezone}</span>
          </div>
          <div className="flex justify-end">
            <SaveButton isPending={isPending} />
          </div>
        </form>
      </section>

      {/* Tabbed Settings */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700 px-5 overflow-x-auto">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setMessage(null); }}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSettingsSubmit} className="p-5 space-y-5">
          {/* Branding */}
          {activeTab === 'branding' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="primary_color"
                      defaultValue={settings?.primary_color ?? '#2563eb'}
                      className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      defaultValue={settings?.primary_color ?? '#2563eb'}
                      className="block flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white font-mono"
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="secondary_color"
                      defaultValue={settings?.secondary_color ?? '#1e40af'}
                      className="h-10 w-14 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      defaultValue={settings?.secondary_color ?? '#1e40af'}
                      className="block flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white font-mono"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <Field label="Hero Title" name="hero_title" defaultValue={settings?.hero_title ?? ''} placeholder="e.g. Develop Your Skills Today" />
              <Field label="Hero Subtitle" name="hero_subtitle" defaultValue={settings?.hero_subtitle ?? ''} placeholder="e.g. Professional driving lessons in your area" />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  {settings?.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.logo_url} alt="Logo" className="h-12 w-auto border rounded" />
                  )}
                  <input
                    type="file"
                    name="logo"
                    accept="image/*"
                    className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website Sections
                </label>
                <p className="text-xs text-gray-500 mb-2">Choose which sections appear on your public website</p>
                <SectionsToggle defaultSections={settings?.sections_enabled ?? ['hero', 'lessons', 'packages', 'instructors', 'areas', 'reviews', 'contact']} />
              </div>
            </>
          )}

          {/* Contact */}
          {activeTab === 'contact' && (
            <>
              <Field label="Contact Phone" name="contact_phone" type="tel" defaultValue={settings?.contact_phone ?? ''} placeholder="e.g. 0412 345 678" />
              <Field label="Contact Email" name="contact_email" type="email" defaultValue={settings?.contact_email ?? ''} placeholder="e.g. info@yourschool.com.au" />
              <TextAreaField label="Contact Address" name="contact_address" defaultValue={settings?.contact_address ?? ''} placeholder="e.g. 123 Main Street, Sydney NSW 2000" rows={2} />
            </>
          )}

          {/* Booking */}
          {activeTab === 'booking' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberField label="Min Booking Notice (hours)" name="min_booking_notice_hours" defaultValue={settings?.min_booking_notice_hours ?? 24} min={0} />
                <NumberField label="Max Advance Booking (days)" name="max_advance_booking_days" defaultValue={settings?.max_advance_booking_days ?? 30} min={1} />
                <NumberField label="Cancellation Notice (hours)" name="cancellation_notice_hours" defaultValue={settings?.cancellation_notice_hours ?? 24} min={0} />
                <NumberField label="Default Lesson Duration (min)" name="default_lesson_duration" defaultValue={settings?.default_lesson_duration ?? 60} min={30} />
                <NumberField label="Travel Buffer (min)" name="default_travel_buffer_minutes" defaultValue={settings?.default_travel_buffer_minutes ?? 15} min={0} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Transmission</label>
                  <select
                    name="default_transmission"
                    defaultValue={settings?.default_transmission ?? 'automatic'}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="hidden"
                  name="allow_online_booking"
                  value={settings?.allow_online_booking !== false ? 'true' : 'false'}
                />
                <input
                  type="checkbox"
                  defaultChecked={settings?.allow_online_booking !== false}
                  onChange={(e) => {
                    const hidden = e.target.previousElementSibling as HTMLInputElement;
                    hidden.value = e.target.checked ? 'true' : 'false';
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Allow online booking from public website</span>
              </label>
            </>
          )}

          {/* SEO & Content */}
          {activeTab === 'seo' && (
            <>
              <Field label="Meta Title" name="meta_title" defaultValue={settings?.meta_title ?? ''} placeholder="Shown in browser tab and search results" />
              <Field label="Meta Description" name="meta_description" defaultValue={settings?.meta_description ?? ''} placeholder="Brief description for search engines (max 160 chars)" />
              <TextAreaField label="About Text" name="about_text" defaultValue={settings?.about_text ?? ''} placeholder="Tell students about your driving school. This appears in the 'Why Choose Us' section." rows={4} />
            </>
          )}

          {/* Social */}
          {activeTab === 'social' && (
            <>
              <Field label="Facebook URL" name="social_facebook" type="url" defaultValue={settings?.social_facebook ?? ''} placeholder="https://facebook.com/yourschool" />
              <Field label="Instagram URL" name="social_instagram" type="url" defaultValue={settings?.social_instagram ?? ''} placeholder="https://instagram.com/yourschool" />
              <Field label="TikTok URL" name="social_tiktok" type="url" defaultValue={settings?.social_tiktok ?? ''} placeholder="https://tiktok.com/@yourschool" />
              <Field label="Google Reviews URL" name="social_google_review" type="url" defaultValue={settings?.social_google_review ?? ''} placeholder="https://g.page/r/yourschool/review" />
            </>
          )}

          <div className="flex justify-end pt-2">
            <SaveButton isPending={isPending} />
          </div>
        </form>
      </section>
    </div>
  );
}

// --------------------------------------------------
// Reusable Form Components
// --------------------------------------------------

function Field({
  label, name, type = 'text', defaultValue = '', placeholder, required,
}: {
  label: string; name: string; type?: string; defaultValue?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function TextAreaField({
  label, name, defaultValue = '', placeholder, rows = 3,
}: {
  label: string; name: string; defaultValue?: string; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function NumberField({
  label, name, defaultValue, min,
}: {
  label: string; name: string; defaultValue: number; min?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type="number"
        id={name}
        name={name}
        defaultValue={defaultValue}
        min={min}
        className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

function SaveButton({ isPending }: { isPending: boolean }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Saving...' : 'Save Changes'}
    </button>
  );
}

function SectionsToggle({ defaultSections }: { defaultSections: string[] }) {
  const [selected, setSelected] = useState<string[]>(defaultSections);

  const allSections = [
    { id: 'hero', label: 'Hero Banner' },
    { id: 'lessons', label: 'Lessons' },
    { id: 'packages', label: 'Packages' },
    { id: 'instructors', label: 'Instructors' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'success_stories', label: 'Success Stories' },
    { id: 'areas', label: 'Service Areas' },
    { id: 'contact', label: 'Contact CTA' },
  ];

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <>
      <input type="hidden" name="sections_enabled" value={selected.join(',')} />
      <div className="flex flex-wrap gap-2">
        {allSections.map((s) => {
          const isOn = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isOn
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 line-through'
              }`}
            >
              {isOn ? '✓ ' : ''}{s.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
