'use server';

// ==================================================
// Student Server Actions
// ==================================================

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { PERMISSIONS } from '@/permissions/roles';
import { createStudent, updateStudent, deleteStudent } from '@/services/student-service';
import { createStudentSchema, updateStudentSchema } from '@/validators/student';
import { audit } from '@/lib/audit';
import { notifyStudentWelcome } from '@/services/booking-notifications';
import { requireUsageLimit } from '@/services/entitlement-service';

export interface StudentActionState {
  success: boolean;
  error?: string;
}

export async function createStudentAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  try {
    const { auth, organization } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.STUDENT_CREATE);
    const client = await createServerSupabaseClient();

    await requireUsageLimit(client, auth.organizationId, 'students');

    const adminClient = getAdminClient();
    const email = (formData.get('email') as string)?.trim();
    const displayName = (formData.get('display_name') as string)?.trim();

    if (!email) {
      return { success: false, error: 'Email is required to create a student account.' };
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
        return { success: false, error: createError.message ?? 'Failed to create student account.' };
      }
    } else if (!createData.user) {
      return { success: false, error: 'Failed to create student account.' };
    } else {
      userId = createData.user.id;
    }

    const input = createStudentSchema.parse({
      user_id: userId,
      display_name: displayName,
      phone: formData.get('phone') || null,
      email,
      pickup_address: formData.get('pickup_address') || null,
      pickup_suburb: formData.get('pickup_suburb') || null,
      preferred_transmission: formData.get('preferred_transmission') || null,
      notes: formData.get('notes') || null,
    });

    const student = await createStudent(client, auth, input);
    audit(client, auth, { action: 'student.created', resourceType: 'student', resourceId: student.id, details: { display_name: input.display_name } });

    // Send welcome email — await so failures are logged with context
    try {
      await notifyStudentWelcome(client, auth.organizationId, userId, displayName, email, organization.name);
    } catch {
      // Non-blocking: student was created successfully even if notification fails
    }

    revalidatePath('/dashboard/students');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create student';
    return { success: false, error: message };
  }
}

export async function updateStudentAction(
  studentId: string,
  formData: FormData
): Promise<StudentActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.STUDENT_EDIT);
    const client = await createServerSupabaseClient();

    const updates: Record<string, unknown> = {};
    const fields = ['display_name', 'phone', 'email', 'pickup_address', 'pickup_suburb', 'preferred_transmission', 'notes'];
    for (const field of fields) {
      if (formData.has(field)) {
        const val = (formData.get(field) as string)?.trim();
        updates[field] = val || null;
      }
    }

    if (formData.has('is_active')) {
      updates.is_active = formData.get('is_active') === 'true';
    }

    const input = updateStudentSchema.parse(updates);
    await updateStudent(client, auth, studentId, input);
    audit(client, auth, { action: 'student.updated', resourceType: 'student', resourceId: studentId, details: updates });
    revalidatePath('/dashboard/students');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update student';
    return { success: false, error: message };
  }
}

export async function deleteStudentAction(studentId: string): Promise<StudentActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.STUDENT_DELETE);
    const client = await createServerSupabaseClient();

    await deleteStudent(client, auth, studentId);
    audit(client, auth, { action: 'student.deleted', resourceType: 'student', resourceId: studentId });
    revalidatePath('/dashboard/students');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete student';
    return { success: false, error: message };
  }
}
