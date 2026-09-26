'use server';

// ==================================================
// Lesson Type Server Actions
// ==================================================

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import { createLessonType, updateLessonType, deleteLessonType } from '@/services/lesson-type-service';
import { createLessonTypeSchema, updateLessonTypeSchema } from '@/validators/lesson-type';

export interface LessonTypeActionState {
  success: boolean;
  error?: string;
}

export async function createLessonTypeAction(
  _prev: LessonTypeActionState,
  formData: FormData
): Promise<LessonTypeActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);
    const client = await createServerSupabaseClient();

    const input = createLessonTypeSchema.parse({
      name: formData.get('name'),
      description: formData.get('description') || null,
      duration_minutes: parseInt(formData.get('duration_minutes') as string, 10) || 60,
      price_cents: Math.round(parseFloat(formData.get('price_dollars') as string) * 100) || 0,
      transmission: formData.get('transmission') || 'automatic',
      is_public: formData.get('is_public') !== 'false',
    });

    await createLessonType(client, auth, input);
    revalidatePath('/dashboard/lesson-types');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create lesson type';
    return { success: false, error: message };
  }
}

export async function updateLessonTypeAction(
  lessonTypeId: string,
  formData: FormData
): Promise<LessonTypeActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);
    const client = await createServerSupabaseClient();

    const updates: Record<string, unknown> = {};
    if (formData.has('name')) updates.name = (formData.get('name') as string)?.trim();
    if (formData.has('description')) updates.description = (formData.get('description') as string)?.trim() || null;
    if (formData.has('duration_minutes')) updates.duration_minutes = parseInt(formData.get('duration_minutes') as string, 10);
    if (formData.has('price_dollars')) updates.price_cents = Math.round(parseFloat(formData.get('price_dollars') as string) * 100);
    if (formData.has('transmission')) updates.transmission = formData.get('transmission');
    if (formData.has('is_public')) updates.is_public = formData.get('is_public') === 'true';
    if (formData.has('status')) updates.status = formData.get('status');

    const input = updateLessonTypeSchema.parse(updates);
    await updateLessonType(client, auth, lessonTypeId, input);
    revalidatePath('/dashboard/lesson-types');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update lesson type';
    return { success: false, error: message };
  }
}

export async function deleteLessonTypeAction(lessonTypeId: string): Promise<LessonTypeActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);
    const client = await createServerSupabaseClient();

    await deleteLessonType(client, auth, lessonTypeId);
    revalidatePath('/dashboard/lesson-types');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete lesson type';
    return { success: false, error: message };
  }
}
