'use server';

// ==================================================
// Lesson Package Server Actions
// ==================================================

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import { createLessonPackage, updateLessonPackage, deleteLessonPackage } from '@/services/lesson-package-service';
import { createLessonPackageSchema, updateLessonPackageSchema } from '@/validators/lesson-package';

export interface PackageActionState {
  success: boolean;
  error?: string;
}

export async function createPackageAction(
  _prev: PackageActionState,
  formData: FormData
): Promise<PackageActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);
    const client = await createServerSupabaseClient();

    const input = createLessonPackageSchema.parse({
      name: formData.get('name'),
      description: formData.get('description') || null,
      lesson_type_id: formData.get('lesson_type_id'),
      lesson_count: parseInt(formData.get('lesson_count') as string, 10) || 1,
      price_cents: parseInt(formData.get('price_cents') as string, 10) || 0,
      savings_cents: parseInt(formData.get('savings_cents') as string, 10) || 0,
      validity_days: formData.get('validity_days') ? parseInt(formData.get('validity_days') as string, 10) : null,
      is_public: formData.get('is_public') !== 'false',
    });

    await createLessonPackage(client, auth, input);
    revalidatePath('/dashboard/packages');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create package';
    return { success: false, error: message };
  }
}

export async function deletePackageAction(packageId: string): Promise<PackageActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);
    const client = await createServerSupabaseClient();

    await deleteLessonPackage(client, auth, packageId);
    revalidatePath('/dashboard/packages');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete package';
    return { success: false, error: message };
  }
}
