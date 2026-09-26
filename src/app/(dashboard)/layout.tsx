// ==================================================
// Dashboard Layout
// ==================================================
// Shared layout for the admin dashboard with role-based
// sidebar navigation. Requires authentication.
// Navigation is grouped into sections with a "More" menu
// on mobile so all pages are always discoverable.

import { Suspense } from 'react';
import Link from 'next/link';
import { getDashboardContext } from '@/lib/auth';
import { isAtLeastRole, isOrgAdminRole } from '@/permissions/roles';
import { USER_ROLES, type UserRole } from '@/config/constants';
import type { Metadata } from 'next';
import { SignOutButton } from './components/sign-out-button';
import { MobileMoreMenu } from './components/mobile-more-menu';
import { SidebarNav } from './components/sidebar-nav';
import { MobileBottomNav } from './components/mobile-bottom-nav';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { isFeatureFlagEnabled } from '@/services/platform-admin-service';

export const metadata: Metadata = {
  title: 'Dashboard',
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Minimum role to see this item */
  minRole?: UserRole;
  /** Only visible to admin roles (school_owner, school_admin) */
  adminOnly?: boolean;
  /** Navigation group for sidebar organization */
  group: 'main' | 'manage' | 'content' | 'system';
}

const NAV_ITEMS: NavItem[] = [
  // Main — daily operations
  { label: 'Overview', href: '/dashboard', icon: '📊', group: 'main' },
  { label: 'Today', href: '/dashboard/today', icon: '🎯', group: 'main' },
  { label: 'Calendar', href: '/dashboard/calendar', icon: '📅', group: 'main' },
  { label: 'Bookings', href: '/dashboard/bookings', icon: '📋', group: 'main' },
  { label: 'Students', href: '/dashboard/students', icon: '🎓', group: 'main' },
  { label: 'Payments', href: '/dashboard/payments', icon: '💳', adminOnly: true, group: 'main' },

  // Manage — team & resources
  { label: 'Instructors', href: '/dashboard/instructors', icon: '🚗', adminOnly: true, group: 'manage' },
  { label: 'Availability', href: '/dashboard/availability', icon: '🕐', group: 'manage' },
  { label: 'Lesson Types', href: '/dashboard/lesson-types', icon: '📖', adminOnly: true, group: 'manage' },
  { label: 'Packages', href: '/dashboard/packages', icon: '📦', adminOnly: true, group: 'manage' },
  { label: 'Vehicles', href: '/dashboard/vehicles', icon: '🚙', adminOnly: true, group: 'manage' },
  { label: 'Waitlist', href: '/dashboard/waitlist', icon: '⏳', adminOnly: true, group: 'manage' },

  // Content — website & marketing
  { label: 'Reviews', href: '/dashboard/reviews', icon: '⭐', adminOnly: true, group: 'content' },
  { label: 'Success Stories', href: '/dashboard/success-stories', icon: '🏆', adminOnly: true, group: 'content' },
  { label: 'Hero Slides', href: '/dashboard/hero-slides', icon: '🎠', adminOnly: true, group: 'content' },
  { label: 'Media', href: '/dashboard/media', icon: '🖼️', adminOnly: true, group: 'content' },

  // System — settings & admin
  { label: 'Notifications', href: '/dashboard/notifications', icon: '🔔', adminOnly: true, group: 'system' },
  { label: 'Reports', href: '/dashboard/reports', icon: '📈', adminOnly: true, group: 'system' },
  { label: 'Billing', href: '/dashboard/billing', icon: '💰', minRole: USER_ROLES.SCHOOL_OWNER, group: 'system' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️', minRole: USER_ROLES.SCHOOL_OWNER, group: 'system' },
];

// First 4 items shown in mobile bottom nav (5th slot is "More")
const MOBILE_PRIMARY_COUNT = 4;

const GROUP_LABELS: Record<string, string> = {
  main: 'Main',
  manage: 'Team & Resources',
  content: 'Website',
  system: 'Settings & Reports',
};

function getVisibleNav(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.minRole && !isAtLeastRole(role, item.minRole)) return false;
    if (item.adminOnly && !isOrgAdminRole(role)) return false;
    return true;
  });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth, organization, settings } = await getDashboardContext();
  const adminClient = getAdminClient();
  const paymentsEnabled = await isFeatureFlagEnabled(adminClient, 'payments', auth.organizationId);
  let visibleNav = getVisibleNav(auth.role);
  if (!paymentsEnabled) {
    visibleNav = visibleNav.filter((item) => item.href !== '/dashboard/payments');
  }
  const primaryColor = settings?.primary_color ?? '#2563eb';

  // Mobile: first N items in bottom bar, rest in "More" menu
  const mobileBottomItems = visibleNav.slice(0, MOBILE_PRIMARY_COUNT);
  const mobileMoreItems = visibleNav.slice(MOBILE_PRIMARY_COUNT);

  // Desktop sidebar: group items
  const groups = ['main', 'manage', 'content', 'system'];
  const groupedNav = groups
    .map((group) => ({
      label: GROUP_LABELS[group],
      items: visibleNav.filter((item) => item.group === group),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          {/* Logo / School Name */}
          <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {organization.name.charAt(0)}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {organization.name}
              </span>
            </Link>
          </div>

          {/* Grouped Navigation — client component for active state */}
          <SidebarNav groups={groupedNav} primaryColor={primaryColor} />

          {/* User info at bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {auth.role.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-900 dark:text-white capitalize truncate">
                  {auth.role.replaceAll('_', ' ')}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href="/"
                    className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                  >
                    View site
                  </Link>
                  <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
                  <SignOutButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 flex items-center justify-between h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4">
        <div className="flex items-center min-w-0">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            {organization.name.charAt(0)}
          </span>
          <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-white truncate">
            {organization.name}
          </span>
        </div>
        <SignOutButton />
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around py-2">
          <MobileBottomNav items={mobileBottomItems} primaryColor={primaryColor} />
          {mobileMoreItems.length > 0 && (
            <MobileMoreMenu items={mobileMoreItems} />
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="md:ml-64 flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<DashboardSkeleton />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 h-16" />
        ))}
      </div>
    </div>
  );
}
