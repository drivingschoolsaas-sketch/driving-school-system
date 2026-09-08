// ==================================================
// Instructor Service
// ==================================================
// CRUD operations for instructors within an organization.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Instructor } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { CreateInstructorInput, UpdateInstructorInput } from '@/validators/instructor';
import { logger } from '@/lib/logging';

export async function getInstructors(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<Instructor[]> {
  const { data, error } = await client
    .from('instructors')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('display_name');

  if (error) {
    logger.error('Failed to fetch instructors', error, {
      feature: 'instructors',
      operation: 'list',
      organizationId: context.organizationId,
    });
    return [];
  }

  return (data ?? []) as Instructor[];
}

export async function getInstructor(
  client: SupabaseClient,
  context: AuthorizedContext,
  instructorId: string
): Promise<Instructor | null> {
  const { data, error } = await client
    .from('instructors')
    .select('*')
    .eq('id', instructorId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch instructor', error, {
      feature: 'instructors',
      operation: 'get',
      organizationId: context.organizationId,
      entityId: instructorId,
    });
    return null;
  }

  return data as Instructor | null;
}

export async function createInstructor(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateInstructorInput
): Promise<Instructor> {
  const { data, error } = await client
    .from('instructors')
    .insert({
      organization_id: context.organizationId,
      ...input,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create instructor', error, {
      feature: 'instructors',
      operation: 'create',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create instructor.');
  }

  logger.info('Instructor created', {
    feature: 'instructors',
    operation: 'create',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as Instructor;
}

export async function updateInstructor(
  client: SupabaseClient,
  context: AuthorizedContext,
  instructorId: string,
  input: UpdateInstructorInput
): Promise<Instructor> {
  const { data, error } = await client
    .from('instructors')
    .update(input)
    .eq('id', instructorId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update instructor', error, {
      feature: 'instructors',
      operation: 'update',
      organizationId: context.organizationId,
      entityId: instructorId,
    });
    throw new Error('Failed to update instructor.');
  }

  return data as Instructor;
}

export async function deleteInstructor(
  client: SupabaseClient,
  context: AuthorizedContext,
  instructorId: string
): Promise<void> {
  const { error } = await client
    .from('instructors')
    .delete()
    .eq('id', instructorId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete instructor', error, {
      feature: 'instructors',
      operation: 'delete',
      organizationId: context.organizationId,
      entityId: instructorId,
    });
    throw new Error('Failed to delete instructor.');
  }

  logger.info('Instructor deleted', {
    feature: 'instructors',
    operation: 'delete',
    organizationId: context.organizationId,
    entityId: instructorId,
  });
}
