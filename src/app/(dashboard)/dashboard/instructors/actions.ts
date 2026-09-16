'use server';

// ==================================================
// Instructor Server Actions
// ==================================================

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { PERMISSIONS } from '@/permissions/roles';
import { createInstructor, updateInstructor, deleteInstructor } from '@/services/instructor-service';
import { createInstructorSchema, updateInstructorSchema } from '@/validators/instructor';
import { audit } from '@/lib/audit';
import { requireUsageLimit } from '@/services/entitlement-service';

export interface InstructorActionState {
  success: boolean;
  error?: string;
}

export async function createInstructorAction(
  _prev: InstructorActionState,
  formData: FormData
): Promise<InstructorActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.INSTRUCTOR_CREATE);
    const client = await createServerSupabaseClient();

    await requireUsageLimit(client, auth.organizationId, 'instructors');

    const adminClient = getAdminClient();
    const email = (formData.get('email') as string)?.trim();
    const displayName = (formData.get('display_name') as string)?.trim();

    if (!email) {
      return { success: false, error: 'Email is required to create an instructor account.' };
    }

    let userId: string;
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { full_name: displayName },
    });
    if (createError) {
      if (createError.message?.includes('already been registered') || createError.status === 422) {
        const { data: { users }, error: lookupError } = await adminClient.auth.admin.listUsers({
          perPage: 1,
          page: 1,
          filter: { email },
        } as Parameters<typeof adminClient.auth.admin.listUsers>[0]);
        const existingUser = users?.find((u) => u.email === email);
        if (lookupError || !existingUser) {
          return { success: false, error: 'A user with this email exists but could not be found. Please try again.' };
        }
        userId = existingUser.id;
      } else {
        return { success: false, error: createError.message ?? 'Failed to create instructor account.' };
      }
    } else if (!createData.user) {
      return { success: false, error: 'Failed to create instructor account.' };
    } else {
      userId = createData.user.id;
    }

    const input = createInstructorSchema.parse({
      user_id: userId,
      display_name: displayName,
      phone: formData.get('phone') || null,
      email,
      bio: formData.get('bio') || null,
      license_number: formData.get('license_number') || null,
      transmission_type: formData.get('transmission_type') || 'automatic',
      max_daily_lessons: formData.get('max_daily_lessons') ? parseInt(formData.get('max_daily_lessons') as string, 10) : null,
      default_lesson_duration: formData.get('default_lesson_duration') ? parseInt(formData.get('default_lesson_duration') as string, 10) : 60,
    });

    const instructor = await createInstructor(client, auth, input);
    audit(client, auth, { action: 'instructor.created', resourceType: 'instructor', resourceId: instructor.id, details: { display_name: input.display_name } });
    revalidatePath('/dashboard/instructors');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create instructor';
    return { success: false, error: message };
  }
}

export async function updateInstructorAction(
  instructorId: string,
  formData: FormData
): Promise<InstructorActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.INSTRUCTOR_EDIT);
    const client = await createServerSupabaseClient();

    const updates: Record<string, unknown> = {};
    const fields = ['display_name', 'phone', 'email', 'bio', 'license_number', 'transmission_type'];
    for (const field of fields) {
      if (formData.has(field)) {
        const val = (formData.get(field) as string)?.trim();
        updates[field] = val || null;
      }
    }

    const numberFields = ['max_daily_lessons', 'default_lesson_duration'];
    for (const field of numberFields) {
      if (formData.has(field)) {
        const val = formData.get(field) as string;
        updates[field] = val ? parseInt(val, 10) : null;
      }
    }

    if (formData.has('is_active')) {
      updates.is_active = formData.get('is_active') === 'true';
    }

    const input = updateInstructorSchema.parse(updates);
    await updateInstructor(client, auth, instructorId, input);
    audit(client, auth, { action: 'instructor.updated', resourceType: 'instructor', resourceId: instructorId, details: updates });
    revalidatePath('/dashboard/instructors');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update instructor';
    return { success: false, error: message };
  }
}

export async function deleteInstructorAction(instructorId: string): Promise<InstructorActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.INSTRUCTOR_DELETE);
    const client = await createServerSupabaseClient();

    await deleteInstructor(client, auth, instructorId);
    audit(client, auth, { action: 'instructor.deleted', resourceType: 'instructor', resourceId: instructorId });
    revalidatePath('/dashboard/instructors');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete instructor';
    return { success: false, error: message };
  }
}
