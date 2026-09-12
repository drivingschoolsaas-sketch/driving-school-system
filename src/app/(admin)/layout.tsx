// ==================================================
// Platform Admin Layout
// ==================================================
// Shared layout for the platform super-admin dashboard.
// Requires platform_owner or platform_support role.

import Link from 'next/link';
import { cookies } from 'next/headers';
import { getPlatformAdminContext } from '@/lib/auth';
import type { Metadata } from 'next';
import { SignOutButton } from '../(dashboard)/components/sign-out-button';
import { LockAdminButton } from './admin/lock-admin-button';

export const metadata: Metadata = {
  title: 'Platform Admin — DriveFlow',
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: '📊' },
  { label: 'Organizations', href: '/admin/organizations', icon: '🏢' },
  { label: 'Domains', href: '/admin/domains', icon: '🌐' },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: '💳' },
  { label: 'System Health', href: '/admin/health', icon: '🩺' },
  { label: 'Feature Flags', href: '/admin/feature-flags', icon: '🚩' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: '📝' },
];

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getPlatformAdminContext();
  const pinEnabled = !!process.env.PLATFORM_ADMIN_PIN;

  // If PIN gate is active and user hasn't verified yet, render
  // children without the admin chrome (sidebar/header). The verify
  // page provides its own full-screen layout.
  if (pinEnabled) {
    const cookieStore = await cookies();
    const pinCookie = cookieStore.get('x-admin-pin-verified')?.value;
    if (!pinCookie) {
      return <>{children}</>;
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:flex">
        <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-700">
          <Link
            href="/admin"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            🛡️ DriveFlow Admin
          </Link>
        </div>

        <nav className="mt-4 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-200 p-4 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Signed in as
          </p>
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {admin.email}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs capitalize text-gray-500 dark:text-gray-400">
              {admin.role.replace('_', ' ')}
            </p>
            <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
            <SignOutButton />
            {pinEnabled && (
              <>
                <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
                <LockAdminButton />
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-2 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800 lg:hidden">
          <span className="text-lg font-bold text-gray-900 dark:text-white flex-shrink-0">
            🛡️ Admin
          </span>
          <nav className="flex gap-2 overflow-x-auto flex-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                title={item.label}
              >
                {item.icon}
              </Link>
            ))}
          </nav>
          <div className="flex-shrink-0 flex items-center gap-2">
            {pinEnabled && <LockAdminButton />}
            <SignOutButton />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
