// ==================================================
// School Settings Service
// ==================================================
// Per-organization settings and branding configuration.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SchoolSettings } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { UpdateSchoolSettingsInput } from '@/validators/school-settings';
import { logger } from '@/lib/logging';

/**
 * Get school settings for an organization.
 * Creates default settings if none exist.
 */
export async function getSchoolSettings(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<SchoolSettings> {
  const { data, error } = await client
    .from('school_settings')
    .select('*')
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch school settings', error, {
      feature: 'school-settings',
      operation: 'get',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to fetch school settings.');
  }

  if (data) {
    return data as SchoolSettings;
  }

  // Auto-create default settings
  return createDefaultSettings(client, context.organizationId);
}

/**
 * Get school settings by organization ID (public access for website).
 */
export async function getPublicSchoolSettings(
  client: SupabaseClient,
  organizationId: string
): Promise<SchoolSettings | null> {
  const { data, error } = await client
    .from('school_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch public school settings', error, {
      feature: 'school-settings',
      operation: 'get_public',
      organizationId,
    });
    return null;
  }

  return data as SchoolSettings | null;
}

/**
 * Update school settings.
 */
export async function updateSchoolSettings(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: UpdateSchoolSettingsInput
): Promise<SchoolSettings> {
  // Ensure settings exist first
  await getSchoolSettings(client, context);

  const { data, error } = await client
    .from('school_settings')
    .update(input)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update school settings', error, {
      feature: 'school-settings',
      operation: 'update',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to update school settings.');
  }

  logger.info('School settings updated', {
    feature: 'school-settings',
    operation: 'update',
    organizationId: context.organizationId,
  });

  return data as SchoolSettings;
}

/**
 * Create default settings for a new organization.
 */
async function createDefaultSettings(
  client: SupabaseClient,
  organizationId: string
): Promise<SchoolSettings> {
  const { data, error } = await client
    .from('school_settings')
    .insert({
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create default school settings', error, {
      feature: 'school-settings',
      operation: 'create_defaults',
      organizationId,
    });
    throw new Error('Failed to create school settings.');
  }

  logger.info('Default school settings created', {
    feature: 'school-settings',
    operation: 'create_defaults',
    organizationId,
  });

  return data as SchoolSettings;
}
