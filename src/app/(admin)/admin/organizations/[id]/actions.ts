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

export async function updateMemberEmailAction(
  userId: string,
  newEmail: string,
  organizationId: string
): Promise<OrgActionState> {
  try {
    await getPlatformAdminContext();
    const client = getAdminClient();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return { success: false, error: 'Invalid email address.' };
    }

    const { error } = await client.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });

    if (error) {
      logger.error('Failed to update member email', error, {
        feature: 'platform_admin',
        operation: 'update_member_email',
        userId,
        newEmail,
      });
      return { success: false, error: error.message };
    }

    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update email';
    return { success: false, error: message };
  }
}

export async function setMemberPasswordAction(
  userId: string,
  newPassword: string,
  organizationId: string
): Promise<OrgActionState> {
  try {
    await getPlatformAdminContext();
    const client = getAdminClient();

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    // Confirm email and set the password
    const { error } = await client.auth.admin.updateUserById(userId, {
      password: newPassword,
      email_confirm: true,
    });

    if (error) {
      logger.error('Failed to set member password', error, {
        feature: 'platform_admin',
        operation: 'set_member_password',
        userId,
      });
      return { success: false, error: error.message };
    }

    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set password';
    return { success: false, error: message };
  }
}

export interface ResendInviteState {
  success: boolean;
  error?: string;
  recoveryLink?: string;
}

export async function resendInviteAction(
  userEmail: string,
  organizationId: string
): Promise<ResendInviteState> {
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
        // User exists — ensure email is confirmed first
        const { data: listData } = await client.auth.admin.listUsers({
          perPage: 50,
          page: 1,
        });
        const user = listData?.users?.find((u) => u.email === userEmail);

        if (user) {
          await client.auth.admin.updateUserById(user.id, {
            email_confirm: true,
          });
        }

        // Generate a recovery link via admin API
        const { data: linkData, error: linkErr } = await client.auth.admin.generateLink({
          type: 'recovery',
          email: userEmail,
          options: { redirectTo },
        });

        if (linkErr || !linkData) {
          logger.error('Failed to generate recovery link', linkErr, {
            feature: 'platform_admin',
            operation: 'resend_invite',
            email: userEmail,
          });
          return { success: false, error: linkErr?.message ?? 'Failed to generate recovery link.' };
        }

        // Build the redirect URL with the token from the generated link
        const actionLink = linkData.properties?.action_link;
        if (actionLink) {
          return { success: true, recoveryLink: actionLink };
        }

        return { success: false, error: 'Could not generate recovery link.' };
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
