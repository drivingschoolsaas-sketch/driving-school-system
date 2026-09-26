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
      price_cents: Math.round(parseFloat(formData.get('price_dollars') as string) * 100) || 0,
      savings_cents: Math.round(parseFloat(formData.get('savings_dollars') as string) * 100) || 0,
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

export async function updatePackageAction(
  packageId: string,
  formData: FormData
): Promise<PackageActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);
    const client = await createServerSupabaseClient();

    const updates: Record<string, unknown> = {};
    if (formData.has('name')) updates.name = (formData.get('name') as string)?.trim();
    if (formData.has('description')) updates.description = (formData.get('description') as string)?.trim() || null;
    if (formData.has('lesson_type_id')) updates.lesson_type_id = formData.get('lesson_type_id');
    if (formData.has('lesson_count')) updates.lesson_count = parseInt(formData.get('lesson_count') as string, 10);
    if (formData.has('price_dollars')) updates.price_cents = Math.round(parseFloat(formData.get('price_dollars') as string) * 100);
    if (formData.has('savings_dollars')) updates.savings_cents = Math.round(parseFloat(formData.get('savings_dollars') as string) * 100);
    if (formData.has('validity_days')) {
      const val = formData.get('validity_days') as string;
      updates.validity_days = val ? parseInt(val, 10) : null;
    }
    if (formData.has('is_public')) updates.is_public = formData.get('is_public') === 'true';
    if (formData.has('status')) updates.status = formData.get('status');

    const input = updateLessonPackageSchema.parse(updates);
    await updateLessonPackage(client, auth, packageId, input);
    revalidatePath('/dashboard/packages');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update package';
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
