// ==================================================
// Availability Rule Service
// ==================================================
// CRUD for recurring weekly availability rules.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AvailabilityRule } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type {
  CreateAvailabilityRuleInput,
  UpdateAvailabilityRuleInput,
  SetWeeklyScheduleInput,
} from '@/validators/availability-rule';
import { logger } from '@/lib/logging';

export async function getAvailabilityRules(
  client: SupabaseClient,
  context: AuthorizedContext,
  instructorId: string
): Promise<AvailabilityRule[]> {
  const { data, error } = await client
    .from('availability_rules')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('instructor_id', instructorId)
    .order('day_of_week');

  if (error) {
    logger.error('Failed to fetch availability rules', error, {
      feature: 'availability',
      operation: 'list_rules',
      organizationId: context.organizationId,
      entityId: instructorId,
    });
    return [];
  }

  return (data ?? []) as AvailabilityRule[];
}

export async function getAvailabilityRule(
  client: SupabaseClient,
  context: AuthorizedContext,
  ruleId: string
): Promise<AvailabilityRule | null> {
  const { data, error } = await client
    .from('availability_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch availability rule', error, {
      feature: 'availability',
      operation: 'get_rule',
      organizationId: context.organizationId,
      entityId: ruleId,
    });
    return null;
  }

  return data as AvailabilityRule | null;
}

export async function createAvailabilityRule(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateAvailabilityRuleInput
): Promise<AvailabilityRule> {
  // Check for overlapping rules on the same day for the same instructor
  const { data: existing } = await client
    .from('availability_rules')
    .select('start_time, end_time')
    .eq('organization_id', context.organizationId)
    .eq('instructor_id', input.instructor_id)
    .eq('day_of_week', input.day_of_week);

  if (existing) {
    for (const rule of existing) {
      // Two time ranges overlap if one starts before the other ends AND vice versa
      if (input.start_time < rule.end_time && input.end_time > rule.start_time) {
        throw new Error(
          `This time block overlaps with an existing rule (${rule.start_time} – ${rule.end_time}). Split shifts must not overlap.`
        );
      }
    }
  }

  const { data, error } = await client
    .from('availability_rules')
    .insert({
      ...input,
      organization_id: context.organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create availability rule', error, {
      feature: 'availability',
      operation: 'create_rule',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create availability rule.');
  }

  logger.info('Availability rule created', {
    feature: 'availability',
    operation: 'create_rule',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as AvailabilityRule;
}

export async function updateAvailabilityRule(
  client: SupabaseClient,
  context: AuthorizedContext,
  ruleId: string,
  input: UpdateAvailabilityRuleInput
): Promise<AvailabilityRule> {
  const { data, error } = await client
    .from('availability_rules')
    .update(input)
    .eq('id', ruleId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update availability rule', error, {
      feature: 'availability',
      operation: 'update_rule',
      organizationId: context.organizationId,
      entityId: ruleId,
    });
    throw new Error('Failed to update availability rule.');
  }

  return data as AvailabilityRule;
}

export async function deleteAvailabilityRule(
  client: SupabaseClient,
  context: AuthorizedContext,
  ruleId: string
): Promise<void> {
  const { error } = await client
    .from('availability_rules')
    .delete()
    .eq('id', ruleId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete availability rule', error, {
      feature: 'availability',
      operation: 'delete_rule',
      organizationId: context.organizationId,
      entityId: ruleId,
    });
    throw new Error('Failed to delete availability rule.');
  }

  logger.info('Availability rule deleted', {
    feature: 'availability',
    operation: 'delete_rule',
    organizationId: context.organizationId,
    entityId: ruleId,
  });
}

/**
 * Replace all availability rules for an instructor with a new weekly schedule.
 * Deletes existing rules and inserts the new set.
 */
export async function setWeeklySchedule(
  client: SupabaseClient,
  context: AuthorizedContext,
  instructorId: string,
  schedule: SetWeeklyScheduleInput
): Promise<AvailabilityRule[]> {
  // Delete existing rules for this instructor
  const { error: deleteError } = await client
    .from('availability_rules')
    .delete()
    .eq('organization_id', context.organizationId)
    .eq('instructor_id', instructorId);

  if (deleteError) {
    logger.error('Failed to clear weekly schedule', deleteError, {
      feature: 'availability',
      operation: 'set_weekly_schedule',
      organizationId: context.organizationId,
      entityId: instructorId,
    });
    throw new Error('Failed to update weekly schedule.');
  }

  if (schedule.length === 0) {
    return [];
  }

  // Insert new rules
  const rows = schedule.map((entry) => ({
    ...entry,
    organization_id: context.organizationId,
    instructor_id: instructorId,
  }));

  const { data, error: insertError } = await client
    .from('availability_rules')
    .insert(rows)
    .select();

  if (insertError) {
    logger.error('Failed to insert weekly schedule', insertError, {
      feature: 'availability',
      operation: 'set_weekly_schedule',
      organizationId: context.organizationId,
      entityId: instructorId,
    });
    throw new Error('Failed to update weekly schedule.');
  }

  logger.info('Weekly schedule set', {
    feature: 'availability',
    operation: 'set_weekly_schedule',
    organizationId: context.organizationId,
    entityId: instructorId,
    daysCount: schedule.length,
  });

  return (data ?? []) as AvailabilityRule[];
}
