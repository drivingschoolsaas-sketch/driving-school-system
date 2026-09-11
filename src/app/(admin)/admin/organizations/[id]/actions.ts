'use server';

// ==================================================
// Organization Detail Actions
// ==================================================
// Status changes for platform admin organization management.

import { revalidatePath } from 'next/cache';
import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { updateOrganizationStatus } from '@/services/platform-admin-service';

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
