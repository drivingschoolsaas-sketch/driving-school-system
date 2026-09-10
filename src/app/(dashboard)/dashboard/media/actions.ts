'use server';

// ==================================================
// Media Library Server Actions
// ==================================================

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import {
  uploadMediaAsset,
  deleteMediaAsset,
  updateMediaAsset,
} from '@/services/media-library-service';
import type { UpdateMediaAssetInput } from '@/services/media-library-service';
import { logger } from '@/lib/logging';

export async function uploadMediaAction(formData: FormData) {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);

    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: 'No file selected.' };
    }

    const folder = (formData.get('folder') as string) || 'general';
    const altText = (formData.get('alt_text') as string)?.trim() || undefined;

    const client = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    await uploadMediaAsset(client, adminClient, auth, {
      file,
      folder,
      altText,
    });

    revalidatePath('/dashboard/media');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    logger.error('Media upload action failed', {
      feature: 'media-library',
      operation: 'upload',
      errorMessage: message,
    });
    return { success: false, error: message };
  }
}

export async function deleteMediaAction(assetId: string) {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);

    const client = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    await deleteMediaAsset(client, adminClient, auth, assetId);

    revalidatePath('/dashboard/media');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return { success: false, error: message };
  }
}

export async function updateMediaAction(
  assetId: string,
  input: UpdateMediaAssetInput
) {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);

    const client = await createServerSupabaseClient();

    await updateMediaAsset(client, auth, assetId, input);

    revalidatePath('/dashboard/media');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return { success: false, error: message };
  }
}
