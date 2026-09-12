'use server';

import { redirect } from 'next/navigation';
import { clearAdminPinVerification } from '@/lib/auth/admin-pin';

export async function lockAdminAction(): Promise<void> {
  await clearAdminPinVerification();
  redirect('/admin/verify');
}
