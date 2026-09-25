'use server';

// ==================================================
// Organization Detail Actions
// ==================================================
// Status changes for platform admin organization management.

import { revalidatePath } from 'next/cache';
import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { updateOrganizationStatus } from '@/services/platform-admin-service';
import { logger } from '@/lib/logging';

export interface OrgActionState {
  success: boolean;
  error?: string;
}

export async function updateOrgStatusAction(
  organizationId: string,
  newStatus: string
): Promise<OrgActionState> {
  try {
    const admin = await getPlatformAdminContext();
    const client = getAdminClient();

    const validStatuses = ['active', 'trial', 'suspended', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: `Invalid status: ${newStatus}` };
    }

    await updateOrganizationStatus(client, organizationId, newStatus, admin.userId);
    revalidatePath(`/admin/organizations/${organizationId}`);
    revalidatePath('/admin/organizations');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update status';
    return { success: false, error: message };
  }
}

export async function resendInviteAction(
  userEmail: string,
  organizationId: string
): Promise<OrgActionState> {
  try {
    await getPlatformAdminContext();
    const client = getAdminClient();

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`;

    // Try invite first (works for users who haven't confirmed yet)
    const { error } = await client.auth.admin.inviteUserByEmail(userEmail, {
      redirectTo,
    });

    if (error) {
      if (error.message?.includes('already been registered')) {
        // User exists — send a password reset email instead
        const { createServerSupabaseClient } = await import('@/lib/database/supabase-server');
        const serverClient = await createServerSupabaseClient();
        const { error: resetErr } = await serverClient.auth.resetPasswordForEmail(
          userEmail,
          { redirectTo }
        );
        if (resetErr) {
          logger.error('Failed to send password reset email', resetErr, {
            feature: 'platform_admin',
            operation: 'resend_invite',
            email: userEmail,
          });
          return { success: false, error: 'Failed to send password reset email.' };
        }
      } else {
        return { success: false, error: error.message };
      }
    }

    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to resend invite';
    return { success: false, error: message };
  }
}
