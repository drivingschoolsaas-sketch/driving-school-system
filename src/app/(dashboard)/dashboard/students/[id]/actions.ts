'use server';

// ==================================================
// Student Detail — Server Actions
// ==================================================
// Progress tracking updates by instructors/admins.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import { upsertStudentProgress } from '@/services/student-progress-service';

export interface ProgressActionState {
  success: boolean;
  error?: string;
}

export async function updateProgressAction(
  studentId: string,
  skillId: string,
  level: string,
  notes?: string
): Promise<ProgressActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.STUDENT_EDIT);
    const client = await createServerSupabaseClient();

    await upsertStudentProgress(client, auth, {
      student_id: studentId,
      skill_id: skillId,
      level,
      notes: notes || null,
    });

    revalidatePath(`/dashboard/students/${studentId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update progress';
    return { success: false, error: message };
  }
}
