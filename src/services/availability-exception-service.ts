// ==================================================
// Availability Exception Service
// ==================================================
// CRUD for date-specific availability overrides.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AvailabilityException } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type {
  CreateAvailabilityExceptionInput,
  UpdateAvailabilityExceptionInput,
} from '@/validators/availability-exception';
import { logger } from '@/lib/logging';

export async function getAvailabilityExceptions(
  client: SupabaseClient,
  context: AuthorizedContext,
  instructorId: string,
  options?: { from?: string; to?: string }
): Promise<AvailabilityException[]> {
  let query = client
    .from('availability_exceptions')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('instructor_id', instructorId)
    .order('exception_date');

  if (options?.from) {
    query = query.gte('exception_date', options.from);
  }
  if (options?.to) {
    query = query.lte('exception_date', options.to);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch availability exceptions', error, {
      feature: 'availability',
      operation: 'list_exceptions',
      organizationId: context.organizationId,
      entityId: instructorId,
    });
    return [];
  }

  return (data ?? []) as AvailabilityException[];
}

export async function getAvailabilityException(
  client: SupabaseClient,
  context: AuthorizedContext,
  exceptionId: string
): Promise<AvailabilityException | null> {
  const { data, error } = await client
    .from('availability_exceptions')
    .select('*')
    .eq('id', exceptionId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch availability exception', error, {
      feature: 'availability',
      operation: 'get_exception',
      organizationId: context.organizationId,
      entityId: exceptionId,
    });
    return null;
  }

  return data as AvailabilityException | null;
}

export async function createAvailabilityException(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateAvailabilityExceptionInput
): Promise<AvailabilityException> {
  const { data, error } = await client
    .from('availability_exceptions')
    .insert({
      ...input,
      organization_id: context.organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create availability exception', error, {
      feature: 'availability',
      operation: 'create_exception',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create availability exception.');
  }

  logger.info('Availability exception created', {
    feature: 'availability',
    operation: 'create_exception',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as AvailabilityException;
}

export async function updateAvailabilityException(
  client: SupabaseClient,
  context: AuthorizedContext,
  exceptionId: string,
  input: UpdateAvailabilityExceptionInput
): Promise<AvailabilityException> {
  const { data, error } = await client
    .from('availability_exceptions')
    .update(input)
    .eq('id', exceptionId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update availability exception', error, {
      feature: 'availability',
      operation: 'update_exception',
      organizationId: context.organizationId,
      entityId: exceptionId,
    });
    throw new Error('Failed to update availability exception.');
  }

  return data as AvailabilityException;
}

export async function deleteAvailabilityException(
  client: SupabaseClient,
  context: AuthorizedContext,
  exceptionId: string
): Promise<void> {
  const { error } = await client
    .from('availability_exceptions')
    .delete()
    .eq('id', exceptionId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete availability exception', error, {
      feature: 'availability',
      operation: 'delete_exception',
      organizationId: context.organizationId,
      entityId: exceptionId,
    });
    throw new Error('Failed to delete availability exception.');
  }

  logger.info('Availability exception deleted', {
    feature: 'availability',
    operation: 'delete_exception',
    organizationId: context.organizationId,
    entityId: exceptionId,
  });
}
