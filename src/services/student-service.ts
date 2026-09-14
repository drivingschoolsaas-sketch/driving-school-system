// ==================================================
// Student Service
// ==================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Student } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { CreateStudentInput, UpdateStudentInput } from '@/validators/student';
import { logger } from '@/lib/logging';

export async function getStudents(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<Student[]> {
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('display_name');

  if (error) {
    logger.error('Failed to fetch students', error, {
      feature: 'students',
      operation: 'list',
      organizationId: context.organizationId,
    });
    return [];
  }

  return (data ?? []) as Student[];
}

export async function getStudent(
  client: SupabaseClient,
  context: AuthorizedContext,
  studentId: string
): Promise<Student | null> {
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('id', studentId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch student', error, {
      feature: 'students',
      operation: 'get',
      organizationId: context.organizationId,
      entityId: studentId,
    });
    return null;
  }

  return data as Student | null;
}

export async function createStudent(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateStudentInput
): Promise<Student> {
  const { data, error } = await client
    .from('students')
    .insert({
      ...input,
      organization_id: context.organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create student', error, {
      feature: 'students',
      operation: 'create',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create student.');
  }

  logger.info('Student created', {
    feature: 'students',
    operation: 'create',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as Student;
}

export async function updateStudent(
  client: SupabaseClient,
  context: AuthorizedContext,
  studentId: string,
  input: UpdateStudentInput
): Promise<Student> {
  const { data, error } = await client
    .from('students')
    .update(input)
    .eq('id', studentId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update student', error, {
      feature: 'students',
      operation: 'update',
      organizationId: context.organizationId,
      entityId: studentId,
    });
    throw new Error('Failed to update student.');
  }

  return data as Student;
}

export async function deleteStudent(
  client: SupabaseClient,
  context: AuthorizedContext,
  studentId: string
): Promise<void> {
  const { error } = await client
    .from('students')
    .delete()
    .eq('id', studentId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete student', error, {
      feature: 'students',
      operation: 'delete',
      organizationId: context.organizationId,
      entityId: studentId,
    });
    throw new Error('Failed to delete student.');
  }

  logger.info('Student deleted', {
    feature: 'students',
    operation: 'delete',
    organizationId: context.organizationId,
    entityId: studentId,
  });
}
