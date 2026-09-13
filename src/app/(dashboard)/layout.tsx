// ==================================================
// Dashboard Layout
// ==================================================
// Shared layout for the admin dashboard with role-based
// sidebar navigation. Requires authentication.

import Link from 'next/link';
import { getDashboardContext } from '@/lib/auth';
import { isAtLeastRole, isOrgAdminRole } from '@/permissions/roles';
import { USER_ROLES, type UserRole } from '@/config/constants';
import type { Metadata } from 'next';
import { SignOutButton } from './components/sign-out-button';

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
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: '📊' },
  { label: 'Today', href: '/dashboard/today', icon: '🎯' },
  { label: 'Calendar', href: '/dashboard/calendar', icon: '📅' },
  { label: 'Bookings', href: '/dashboard/bookings', icon: '📋' },
  { label: 'Students', href: '/dashboard/students', icon: '🎓' },
  { label: 'Instructors', href: '/dashboard/instructors', icon: '🚗', adminOnly: true },
  { label: 'Availability', href: '/dashboard/availability', icon: '🕐' },
  { label: 'Lesson Types', href: '/dashboard/lesson-types', icon: '📖', adminOnly: true },
  { label: 'Packages', href: '/dashboard/packages', icon: '📦', adminOnly: true },
  { label: 'Vehicles', href: '/dashboard/vehicles', icon: '🚙', adminOnly: true },
  { label: 'Reviews', href: '/dashboard/reviews', icon: '⭐', adminOnly: true },
  { label: 'Success Stories', href: '/dashboard/success-stories', icon: '🏆', adminOnly: true },
  { label: 'Waitlist', href: '/dashboard/waitlist', icon: '⏳', adminOnly: true },
  { label: 'Reports', href: '/dashboard/reports', icon: '📈', adminOnly: true },
  { label: 'Payments', href: '/dashboard/payments', icon: '💳', adminOnly: true },
  { label: 'Notifications', href: '/dashboard/notifications', icon: '🔔', adminOnly: true },
  { label: 'Hero Slides', href: '/dashboard/hero-slides', icon: '🎠', adminOnly: true },
  { label: 'Media', href: '/dashboard/media', icon: '🖼️', adminOnly: true },
  { label: 'Billing', href: '/dashboard/billing', icon: '💰', minRole: USER_ROLES.SCHOOL_OWNER },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️', minRole: USER_ROLES.SCHOOL_OWNER },
];

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
  const visibleNav = getVisibleNav(auth.role);
  const primaryColor = settings?.primary_color ?? '#2563eb';

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

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

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
          {visibleNav.slice(0, 5).map((item) => (
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

      {/* Main content */}
      <main className="md:ml-64 flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
