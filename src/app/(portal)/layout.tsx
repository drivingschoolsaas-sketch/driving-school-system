// ==================================================
// Student Portal Layout
// ==================================================
// Shared layout for the student portal with mobile-first
// bottom navigation. Spec: Section 11 — STUDENT PORTAL.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPortalContext } from '@/lib/auth';
import { isFeatureFlagEnabled } from '@/services/platform-admin-service';
import { getAdminClient } from '@/lib/database/supabase-admin';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Portal',
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/portal', icon: '🏠' },
  { label: 'Bookings', href: '/portal/bookings', icon: '📅' },
  { label: 'Progress', href: '/portal/progress', icon: '📈' },
  { label: 'Packages', href: '/portal/packages', icon: '📦' },
  { label: 'Profile', href: '/portal/profile', icon: '👤' },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization, settings, student } = await getPortalContext();

  // P1-7: Student portal is non-MVP — gated behind feature flag
  const adminClient = getAdminClient();
  const portalEnabled = await isFeatureFlagEnabled(adminClient, 'student_portal', organization.id);
  if (!portalEnabled) {
    redirect('/');
  }

  const primaryColor = settings?.primary_color ?? '#2563eb';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/portal" className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              {organization.name}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/80">
              {student.display_name}
            </span>
            <Link
              href="/"
              className="text-xs text-white/70 hover:text-white transition-colors"
            >
              Website →
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-6">
        <div className="mx-auto max-w-4xl px-4 py-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-gray-600 dark:text-gray-400"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav className="hidden md:block fixed left-0 top-14 bottom-0 w-48 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
        <div className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop content offset */}
      <style>{`
        @media (min-width: 768px) {
          main { margin-left: 12rem; }
        }
      `}</style>
    </div>
  );
}
