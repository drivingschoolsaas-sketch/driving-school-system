// ==================================================
// Lesson Type Service
// ==================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LessonType } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { CreateLessonTypeInput, UpdateLessonTypeInput } from '@/validators/lesson-type';
import { logger } from '@/lib/logging';

export async function getLessonTypes(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<LessonType[]> {
  const { data, error } = await client
    .from('lesson_types')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('sort_order')
    .order('name');

  if (error) {
    logger.error('Failed to fetch lesson types', error, {
      feature: 'lesson-types',
      operation: 'list',
      organizationId: context.organizationId,
    });
    return [];
  }

  return (data ?? []) as LessonType[];
}

/**
 * Get public, active lesson types for the booking page.
 * Does not require authentication.
 */
export async function getPublicLessonTypes(
  client: SupabaseClient,
  organizationId: string
): Promise<LessonType[]> {
  const { data, error } = await client
    .from('lesson_types')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_public', true)
    .eq('status', 'active')
    .order('sort_order')
    .order('name');

  if (error) {
    logger.error('Failed to fetch public lesson types', error, {
      feature: 'lesson-types',
      operation: 'list_public',
      organizationId,
    });
    return [];
  }

  return (data ?? []) as LessonType[];
}

export async function getLessonType(
  client: SupabaseClient,
  context: AuthorizedContext,
  lessonTypeId: string
): Promise<LessonType | null> {
  const { data, error } = await client
    .from('lesson_types')
    .select('*')
    .eq('id', lessonTypeId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch lesson type', error, {
      feature: 'lesson-types',
      operation: 'get',
      organizationId: context.organizationId,
      entityId: lessonTypeId,
    });
    return null;
  }

  return data as LessonType | null;
}

export async function createLessonType(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateLessonTypeInput
): Promise<LessonType> {
  const { data, error } = await client
    .from('lesson_types')
    .insert({
      organization_id: context.organizationId,
      ...input,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create lesson type', error, {
      feature: 'lesson-types',
      operation: 'create',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create lesson type.');
  }

  logger.info('Lesson type created', {
    feature: 'lesson-types',
    operation: 'create',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as LessonType;
}

export async function updateLessonType(
  client: SupabaseClient,
  context: AuthorizedContext,
  lessonTypeId: string,
  input: UpdateLessonTypeInput
): Promise<LessonType> {
  const { data, error } = await client
    .from('lesson_types')
    .update(input)
    .eq('id', lessonTypeId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update lesson type', error, {
      feature: 'lesson-types',
      operation: 'update',
      organizationId: context.organizationId,
      entityId: lessonTypeId,
    });
    throw new Error('Failed to update lesson type.');
  }

  return data as LessonType;
}

export async function deleteLessonType(
  client: SupabaseClient,
  context: AuthorizedContext,
  lessonTypeId: string
): Promise<void> {
  const { error } = await client
    .from('lesson_types')
    .delete()
    .eq('id', lessonTypeId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete lesson type', error, {
      feature: 'lesson-types',
      operation: 'delete',
      organizationId: context.organizationId,
      entityId: lessonTypeId,
    });
    throw new Error('Failed to delete lesson type.');
  }

  logger.info('Lesson type deleted', {
    feature: 'lesson-types',
    operation: 'delete',
    organizationId: context.organizationId,
    entityId: lessonTypeId,
  });
}
