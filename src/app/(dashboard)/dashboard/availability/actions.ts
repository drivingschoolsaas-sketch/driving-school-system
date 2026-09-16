'use server';

// ==================================================
// Availability Server Actions
// ==================================================
// CRUD for availability rules, exceptions, and blocked times.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import {
  createAvailabilityRule,
  updateAvailabilityRule,
  deleteAvailabilityRule,
} from '@/services/availability-rule-service';
import {
  createAvailabilityException,
  deleteAvailabilityException,
} from '@/services/availability-exception-service';
import {
  createBlockedTime,
  deleteBlockedTime,
} from '@/services/blocked-time-service';
import { createAvailabilityRuleSchema } from '@/validators/availability-rule';
import { createAvailabilityExceptionSchema } from '@/validators/availability-exception';
import { createBlockedTimeSchema } from '@/validators/blocked-time';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import { getAdminClient } from '@/lib/database/supabase-admin';

export interface AvailabilityActionState {
  success: boolean;
  error?: string;
}

async function isInstructorSelf(auth: AuthorizedContext, instructorId: string): Promise<boolean> {
  if (auth.membership.role !== 'instructor') return false;
  const adminClient = getAdminClient();
  const { data } = await adminClient
    .from('instructors')
    .select('user_id')
    .eq('id', instructorId)
    .eq('organization_id', auth.organizationId)
    .maybeSingle();
  return (data as { user_id: string } | null)?.user_id === auth.userId;
}

// ── Availability Rules ──────────────────────────────

export async function createRuleAction(
  _prev: AvailabilityActionState,
  formData: FormData
): Promise<AvailabilityActionState> {
  try {
    const { auth } = await getDashboardContext();
    const targetInstructorId = formData.get('instructor_id') as string;

    // Instructors can manage their own availability; admins/owners can manage any
    const isOwnAvailability = await isInstructorSelf(auth, targetInstructorId);
    if (isOwnAvailability) {
      requirePermission(auth, PERMISSIONS.INSTRUCTOR_MANAGE_OWN_AVAILABILITY);
    } else {
      requirePermission(auth, PERMISSIONS.AVAILABILITY_MANAGE);
    }

    const client = await createServerSupabaseClient();

    const input = createAvailabilityRuleSchema.parse({
      instructor_id: targetInstructorId,
      day_of_week: formData.get('day_of_week'),
      start_time: formData.get('start_time'),
      end_time: formData.get('end_time'),
      is_active: true,
    });

    await createAvailabilityRule(client, auth, input);
    revalidatePath('/dashboard/availability');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create rule';
    return { success: false, error: message };
  }
}

export async function deleteRuleAction(ruleId: string): Promise<AvailabilityActionState> {
  try {
    const { auth } = await getDashboardContext();
    const client = await createServerSupabaseClient();

    // Check if this rule belongs to the instructor themselves
    const { data: rule } = await client
      .from('availability_rules')
      .select('instructor_id')
      .eq('id', ruleId)
      .eq('organization_id', auth.organizationId)
      .maybeSingle();

    if (!rule) {
      return { success: false, error: 'Rule not found.' };
    }

    const isOwn = await isInstructorSelf(auth, rule.instructor_id);
    if (isOwn) {
      requirePermission(auth, PERMISSIONS.INSTRUCTOR_MANAGE_OWN_AVAILABILITY);
    } else {
      requirePermission(auth, PERMISSIONS.AVAILABILITY_MANAGE);
    }

    await deleteAvailabilityRule(client, auth, ruleId);
    revalidatePath('/dashboard/availability');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete rule';
    return { success: false, error: message };
  }
}

// ── Availability Exceptions ─────────────────────────

export async function createExceptionAction(
  _prev: AvailabilityActionState,
  formData: FormData
): Promise<AvailabilityActionState> {
  try {
    const { auth } = await getDashboardContext();
    const targetInstructorId = formData.get('instructor_id') as string;
    const isOwnAvailability = await isInstructorSelf(auth, targetInstructorId);
    if (isOwnAvailability) {
      requirePermission(auth, PERMISSIONS.INSTRUCTOR_MANAGE_OWN_AVAILABILITY);
    } else {
      requirePermission(auth, PERMISSIONS.AVAILABILITY_MANAGE);
    }
    const client = await createServerSupabaseClient();

    const isAvailable = formData.get('is_available') === 'true';

    const input = createAvailabilityExceptionSchema.parse({
      instructor_id: targetInstructorId,
      exception_date: formData.get('exception_date'),
      is_available: isAvailable,
      start_time: isAvailable ? formData.get('start_time') : null,
      end_time: isAvailable ? formData.get('end_time') : null,
      reason: formData.get('reason') || null,
    });

    await createAvailabilityException(client, auth, input);
    revalidatePath('/dashboard/availability');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create exception';
    return { success: false, error: message };
  }
}

export async function deleteExceptionAction(exceptionId: string): Promise<AvailabilityActionState> {
  try {
    const { auth } = await getDashboardContext();
    const client = await createServerSupabaseClient();

    const { data: exception } = await client
      .from('availability_exceptions')
      .select('instructor_id')
      .eq('id', exceptionId)
      .eq('organization_id', auth.organizationId)
      .maybeSingle();

    if (!exception) {
      return { success: false, error: 'Exception not found.' };
    }

    const isOwn = await isInstructorSelf(auth, exception.instructor_id);
    if (isOwn) {
      requirePermission(auth, PERMISSIONS.INSTRUCTOR_MANAGE_OWN_AVAILABILITY);
    } else {
      requirePermission(auth, PERMISSIONS.AVAILABILITY_MANAGE);
    }

    await deleteAvailabilityException(client, auth, exceptionId);
    revalidatePath('/dashboard/availability');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete exception';
    return { success: false, error: message };
  }
}

// ── Blocked Times ───────────────────────────────────

export async function createBlockedTimeAction(
  _prev: AvailabilityActionState,
  formData: FormData
): Promise<AvailabilityActionState> {
  try {
    const { auth } = await getDashboardContext();
    const targetInstructorId = formData.get('instructor_id') as string;
    const isOwnAvailability = await isInstructorSelf(auth, targetInstructorId);
    if (isOwnAvailability) {
      requirePermission(auth, PERMISSIONS.INSTRUCTOR_MANAGE_OWN_AVAILABILITY);
    } else {
      requirePermission(auth, PERMISSIONS.AVAILABILITY_MANAGE);
    }
    const client = await createServerSupabaseClient();

    const isAllDay = formData.get('is_all_day') === 'true';
    const date = formData.get('date') as string;
    const startTime = formData.get('start_time') as string;
    const endTime = formData.get('end_time') as string;

    let startDatetime: string;
    let endDatetime: string;

    if (isAllDay) {
      startDatetime = new Date(`${date}T00:00:00`).toISOString();
      endDatetime = new Date(`${date}T23:59:59`).toISOString();
    } else {
      startDatetime = new Date(`${date}T${startTime}:00`).toISOString();
      endDatetime = new Date(`${date}T${endTime}:00`).toISOString();
    }

    const input = createBlockedTimeSchema.parse({
      instructor_id: formData.get('instructor_id'),
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      reason: formData.get('reason') || 'other',
      notes: formData.get('notes') || null,
      is_all_day: isAllDay,
    });

    await createBlockedTime(client, auth, input);
    revalidatePath('/dashboard/availability');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create blocked time';
    return { success: false, error: message };
  }
}

export async function deleteBlockedTimeAction(blockedTimeId: string): Promise<AvailabilityActionState> {
  try {
    const { auth } = await getDashboardContext();
    const client = await createServerSupabaseClient();

    const { data: blocked } = await client
      .from('blocked_times')
      .select('instructor_id')
      .eq('id', blockedTimeId)
      .eq('organization_id', auth.organizationId)
      .maybeSingle();

    if (!blocked) {
      return { success: false, error: 'Blocked time not found.' };
    }

    const isOwn = await isInstructorSelf(auth, blocked.instructor_id);
    if (isOwn) {
      requirePermission(auth, PERMISSIONS.INSTRUCTOR_MANAGE_OWN_AVAILABILITY);
    } else {
      requirePermission(auth, PERMISSIONS.AVAILABILITY_MANAGE);
    }

    await deleteBlockedTime(client, auth, blockedTimeId);
    revalidatePath('/dashboard/availability');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete blocked time';
    return { success: false, error: message };
  }
}
