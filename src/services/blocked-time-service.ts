// ==================================================
// Blocked Time Service
// ==================================================
// CRUD for instructor blocked time periods.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlockedTime } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type {
  CreateBlockedTimeInput,
  UpdateBlockedTimeInput,
} from '@/validators/blocked-time';
import { logger } from '@/lib/logging';

export async function getBlockedTimes(
  client: SupabaseClient,
  context: AuthorizedContext,
  instructorId: string,
  options?: { from?: string; to?: string }
): Promise<BlockedTime[]> {
  let query = client
    .from('blocked_times')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('instructor_id', instructorId)
    .order('start_datetime');

  if (options?.from) {
    query = query.gte('end_datetime', options.from);
  }
  if (options?.to) {
    query = query.lte('start_datetime', options.to);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch blocked times', error, {
      feature: 'availability',
      operation: 'list_blocked',
      organizationId: context.organizationId,
      entityId: instructorId,
    });
    return [];
  }

  return (data ?? []) as BlockedTime[];
}

export async function getBlockedTime(
  client: SupabaseClient,
  context: AuthorizedContext,
  blockedTimeId: string
): Promise<BlockedTime | null> {
  const { data, error } = await client
    .from('blocked_times')
    .select('*')
    .eq('id', blockedTimeId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch blocked time', error, {
      feature: 'availability',
      operation: 'get_blocked',
      organizationId: context.organizationId,
      entityId: blockedTimeId,
    });
    return null;
  }

  return data as BlockedTime | null;
}

export async function createBlockedTime(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateBlockedTimeInput
): Promise<BlockedTime> {
  const { data, error } = await client
    .from('blocked_times')
    .insert({
      ...input,
      organization_id: context.organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create blocked time', error, {
      feature: 'availability',
      operation: 'create_blocked',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create blocked time.');
  }

  logger.info('Blocked time created', {
    feature: 'availability',
    operation: 'create_blocked',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as BlockedTime;
}

export async function updateBlockedTime(
  client: SupabaseClient,
  context: AuthorizedContext,
  blockedTimeId: string,
  input: UpdateBlockedTimeInput
): Promise<BlockedTime> {
  const { data, error } = await client
    .from('blocked_times')
    .update(input)
    .eq('id', blockedTimeId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update blocked time', error, {
      feature: 'availability',
      operation: 'update_blocked',
      organizationId: context.organizationId,
      entityId: blockedTimeId,
    });
    throw new Error('Failed to update blocked time.');
  }

  return data as BlockedTime;
}

export async function deleteBlockedTime(
  client: SupabaseClient,
  context: AuthorizedContext,
  blockedTimeId: string
): Promise<void> {
  const { error } = await client
    .from('blocked_times')
    .delete()
    .eq('id', blockedTimeId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete blocked time', error, {
      feature: 'availability',
      operation: 'delete_blocked',
      organizationId: context.organizationId,
      entityId: blockedTimeId,
    });
    throw new Error('Failed to delete blocked time.');
  }

  logger.info('Blocked time deleted', {
    feature: 'availability',
    operation: 'delete_blocked',
    organizationId: context.organizationId,
    entityId: blockedTimeId,
  });
}
