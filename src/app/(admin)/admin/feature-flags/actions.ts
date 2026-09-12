// ==================================================
// Feature Flag Server Actions
// ==================================================
// Toggle feature flags on/off from the admin dashboard.

'use server';

import { revalidatePath } from 'next/cache';
import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { toggleFeatureFlag } from '@/services/platform-admin-service';
import { logger } from '@/lib/logging';

export interface ToggleFlagState {
  success: boolean;
  error?: string;
}

export async function toggleFeatureFlagAction(
  flagId: string,
  isEnabled: boolean
): Promise<ToggleFlagState> {
  try {
    const admin = await getPlatformAdminContext();
    const client = getAdminClient();

    await toggleFeatureFlag(client, flagId, isEnabled, admin.userId);
    revalidatePath('/admin/feature-flags');
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to toggle feature flag';

    logger.error('Toggle feature flag action failed', {
      feature: 'platform_admin',
      operation: 'toggle_feature_flag',
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}
