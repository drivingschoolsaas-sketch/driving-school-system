// ==================================================
// Lesson Package Service
// ==================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LessonPackage } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { CreateLessonPackageInput, UpdateLessonPackageInput } from '@/validators/lesson-package';
import { logger } from '@/lib/logging';

export async function getLessonPackages(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<LessonPackage[]> {
  const { data, error } = await client
    .from('lesson_packages')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('sort_order')
    .order('name');

  if (error) {
    logger.error('Failed to fetch lesson packages', error, {
      feature: 'lesson-packages',
      operation: 'list',
      organizationId: context.organizationId,
    });
    return [];
  }

  return (data ?? []) as LessonPackage[];
}

/**
 * Get public, active packages for the booking page.
 */
export async function getPublicLessonPackages(
  client: SupabaseClient,
  organizationId: string
): Promise<LessonPackage[]> {
  const { data, error } = await client
    .from('lesson_packages')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_public', true)
    .eq('status', 'active')
    .order('sort_order')
    .order('name');

  if (error) {
    logger.error('Failed to fetch public lesson packages', error, {
      feature: 'lesson-packages',
      operation: 'list_public',
      organizationId,
    });
    return [];
  }

  return (data ?? []) as LessonPackage[];
}

export async function getLessonPackage(
  client: SupabaseClient,
  context: AuthorizedContext,
  packageId: string
): Promise<LessonPackage | null> {
  const { data, error } = await client
    .from('lesson_packages')
    .select('*')
    .eq('id', packageId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch lesson package', error, {
      feature: 'lesson-packages',
      operation: 'get',
      organizationId: context.organizationId,
      entityId: packageId,
    });
    return null;
  }

  return data as LessonPackage | null;
}

export async function createLessonPackage(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateLessonPackageInput
): Promise<LessonPackage> {
  const { data, error } = await client
    .from('lesson_packages')
    .insert({
      organization_id: context.organizationId,
      ...input,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create lesson package', error, {
      feature: 'lesson-packages',
      operation: 'create',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create lesson package.');
  }

  logger.info('Lesson package created', {
    feature: 'lesson-packages',
    operation: 'create',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as LessonPackage;
}

export async function updateLessonPackage(
  client: SupabaseClient,
  context: AuthorizedContext,
  packageId: string,
  input: UpdateLessonPackageInput
): Promise<LessonPackage> {
  const { data, error } = await client
    .from('lesson_packages')
    .update(input)
    .eq('id', packageId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update lesson package', error, {
      feature: 'lesson-packages',
      operation: 'update',
      organizationId: context.organizationId,
      entityId: packageId,
    });
    throw new Error('Failed to update lesson package.');
  }

  return data as LessonPackage;
}

export async function deleteLessonPackage(
  client: SupabaseClient,
  context: AuthorizedContext,
  packageId: string
): Promise<void> {
  const { error } = await client
    .from('lesson_packages')
    .delete()
    .eq('id', packageId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete lesson package', error, {
      feature: 'lesson-packages',
      operation: 'delete',
      organizationId: context.organizationId,
      entityId: packageId,
    });
    throw new Error('Failed to delete lesson package.');
  }

  logger.info('Lesson package deleted', {
    feature: 'lesson-packages',
    operation: 'delete',
    organizationId: context.organizationId,
    entityId: packageId,
  });
}
