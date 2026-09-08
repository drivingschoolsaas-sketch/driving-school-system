// ==================================================
// Organization Service
// ==================================================
// Business logic for organization CRUD operations.
// All operations are scoped to the authorized context.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Organization } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@/validators/organization';
import { TenantErrors, ValidationErrors } from '@/lib/errors';
import { logger } from '@/lib/logging';

/**
 * Get organization by ID.
 * The user must have an active membership (enforced by RLS).
 */
export async function getOrganization(
  client: SupabaseClient,
  organizationId: string
): Promise<Organization> {
  const { data, error } = await client
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error || !data) {
    throw TenantErrors.organizationNotFound({ organizationId });
  }

  return data as Organization;
}

/**
 * Create a new organization.
 * This is a privileged operation — typically called during onboarding
 * via a service-role client.
 */
export async function createOrganization(
  client: SupabaseClient,
  input: CreateOrganizationInput
): Promise<Organization> {
  // Check slug uniqueness
  const { data: existing } = await client
    .from('organizations')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle();

  if (existing) {
    throw ValidationErrors.invalidInput(
      `The slug "${input.slug}" is already taken.`,
      { slug: input.slug }
    );
  }

  const { data, error } = await client
    .from('organizations')
    .insert({
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
      currency: input.currency,
      country: input.country,
      phone: input.phone ?? null,
      email: input.email ?? null,
      status: 'trial',
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create organization', error, {
      feature: 'organizations',
      operation: 'create',
    });
    throw ValidationErrors.invalidInput(
      'Failed to create organization.',
      { supabaseError: error.message }
    );
  }

  logger.info('Organization created', {
    feature: 'organizations',
    operation: 'create',
    entityType: 'organization',
    entityId: data.id,
  });

  return data as Organization;
}

/**
 * Update an organization.
 * Requires authorized context — caller must have appropriate permission.
 */
export async function updateOrganization(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: UpdateOrganizationInput
): Promise<Organization> {
  const { data, error } = await client
    .from('organizations')
    .update(input)
    .eq('id', context.organizationId)
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to update organization', error, {
      feature: 'organizations',
      operation: 'update',
      organizationId: context.organizationId,
      userId: context.userId,
    });
    throw ValidationErrors.invalidInput('Failed to update organization.');
  }

  logger.info('Organization updated', {
    feature: 'organizations',
    operation: 'update',
    entityType: 'organization',
    entityId: context.organizationId,
    userId: context.userId,
  });

  return data as Organization;
}
