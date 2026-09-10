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

export interface StudentActionState {
  success: boolean;
  error?: string;
}

export async function createStudentAction(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.STUDENT_CREATE);
    const client = await createServerSupabaseClient();

    // Create a Supabase Auth user for the student via invite
    const adminClient = getAdminClient();
    const email = (formData.get('email') as string)?.trim();
    const displayName = (formData.get('display_name') as string)?.trim();

    if (!email) {
      return { success: false, error: 'Email is required to create a student account.' };
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Invite the student — they'll set their own password
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: displayName },
      });
      if (inviteError || !inviteData.user) {
        return { success: false, error: inviteError?.message ?? 'Failed to create student account.' };
      }
      userId = inviteData.user.id;
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

    await createStudent(client, auth, input);
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
    revalidatePath('/dashboard/students');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete student';
    return { success: false, error: message };
  }
}
