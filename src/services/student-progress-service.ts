import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { DrivingSkill, StudentProgress } from '@/types/database';

// ==================================================
// Student Progress Service
// ==================================================
// CRUD for driving skills and student progress tracking.

// ── Driving Skills (admin-configurable) ─────────────

export async function getDrivingSkills(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<DrivingSkill[]> {
  const { data, error } = await client
    .from('driving_skills')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('category')
    .order('sort_order');

  if (error) throw error;
  return data as DrivingSkill[];
}

export async function createDrivingSkill(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: { name: string; description?: string | null; category: string; sort_order?: number }
): Promise<DrivingSkill> {
  const { data, error } = await client
    .from('driving_skills')
    .insert({
      organization_id: context.organizationId,
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      sort_order: input.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DrivingSkill;
}

export async function deleteDrivingSkill(
  client: SupabaseClient,
  context: AuthorizedContext,
  skillId: string
): Promise<void> {
  const { error } = await client
    .from('driving_skills')
    .delete()
    .eq('id', skillId)
    .eq('organization_id', context.organizationId);

  if (error) throw error;
}

// ── Student Progress (instructor-assessed) ──────────

export async function getStudentProgress(
  client: SupabaseClient,
  context: AuthorizedContext,
  studentId: string
): Promise<StudentProgress[]> {
  const { data, error } = await client
    .from('student_progress')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('student_id', studentId);

  if (error) throw error;
  return data as StudentProgress[];
}

export async function upsertStudentProgress(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: {
    student_id: string;
    skill_id: string;
    level: string;
    notes?: string | null;
  }
): Promise<StudentProgress> {
  // Check if progress already exists
  const { data: existing } = await client
    .from('student_progress')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('student_id', input.student_id)
    .eq('skill_id', input.skill_id)
    .maybeSingle();

  if (existing) {
    // Update
    const { data, error } = await client
      .from('student_progress')
      .update({
        level: input.level,
        notes: input.notes ?? null,
        assessed_by: context.userId,
        assessed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('organization_id', context.organizationId)
      .select()
      .single();

    if (error) throw error;
    return data as StudentProgress;
  } else {
    // Insert
    const { data, error } = await client
      .from('student_progress')
      .insert({
        organization_id: context.organizationId,
        student_id: input.student_id,
        skill_id: input.skill_id,
        level: input.level,
        notes: input.notes ?? null,
        assessed_by: context.userId,
        assessed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as StudentProgress;
  }
}
