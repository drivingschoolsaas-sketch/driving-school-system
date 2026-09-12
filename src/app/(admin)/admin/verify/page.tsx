// ==================================================
// Platform Admin: PIN Verification Page
// ==================================================
// Secondary security gate — admin must enter PIN
// before accessing admin pages.

import { redirect } from 'next/navigation';
import { getPlatformAdminContext } from '@/lib/auth';
import { isAdminPinVerified, isAdminPinEnabled } from '@/lib/auth/admin-pin';
import { AdminPinForm } from './admin-pin-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Admin Access — DriveFlow',
};

export default async function AdminVerifyPage() {
  // Must be authenticated as platform admin first
  const admin = await getPlatformAdminContext();

  // If PIN not enabled or already verified, go straight to admin
  if (!isAdminPinEnabled()) {
    redirect('/admin');
  }

  const verified = await isAdminPinVerified(admin.userId);
  if (verified) {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Admin Verification
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Enter your admin PIN to continue
            </p>
          </div>

          <AdminPinForm />

          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            Session expires after 4 hours of inactivity
          </p>
        </div>
      </div>
    </div>
  );
}
