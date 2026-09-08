// ==================================================
// Location Service
// ==================================================
// Business logic for location (branch) management.
// All operations are scoped by organization_id.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Location } from '@/types/database';
import type { CreateLocationInput, UpdateLocationInput } from '@/validators/location';
import { ValidationErrors } from '@/lib/errors';
import { logger } from '@/lib/logging';

/**
 * Get all locations for an organization.
 */
export async function getLocations(
  client: SupabaseClient,
  organizationId: string
): Promise<Location[]> {
  const { data, error } = await client
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) {
    logger.error('Failed to fetch locations', error, {
      feature: 'locations',
      operation: 'list',
      organizationId,
    });
    return [];
  }

  return (data ?? []) as Location[];
}

/**
 * Get a single location.
 */
export async function getLocation(
  client: SupabaseClient,
  organizationId: string,
  locationId: string
): Promise<Location | null> {
  const { data, error } = await client
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .eq('organization_id', organizationId) // Always scope by org
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch location', error, {
      feature: 'locations',
      operation: 'get',
      organizationId,
      entityId: locationId,
    });
    return null;
  }

  return data as Location | null;
}

/**
 * Create a location.
 */
export async function createLocation(
  client: SupabaseClient,
  organizationId: string,
  input: CreateLocationInput
): Promise<Location> {
  const { data, error } = await client
    .from('locations')
    .insert({
      organization_id: organizationId,
      ...input,
    })
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to create location', error, {
      feature: 'locations',
      operation: 'create',
      organizationId,
    });
    throw ValidationErrors.invalidInput('Failed to create location.');
  }

  logger.info('Location created', {
    feature: 'locations',
    operation: 'create',
    entityType: 'location',
    entityId: data.id,
    organizationId,
  });

  return data as Location;
}

/**
 * Update a location.
 */
export async function updateLocation(
  client: SupabaseClient,
  organizationId: string,
  locationId: string,
  input: UpdateLocationInput
): Promise<Location> {
  const { data, error } = await client
    .from('locations')
    .update(input)
    .eq('id', locationId)
    .eq('organization_id', organizationId) // Always scope by org
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to update location', error, {
      feature: 'locations',
      operation: 'update',
      organizationId,
      entityId: locationId,
    });
    throw ValidationErrors.invalidInput('Failed to update location.');
  }

  logger.info('Location updated', {
    feature: 'locations',
    operation: 'update',
    entityType: 'location',
    entityId: locationId,
    organizationId,
  });

  return data as Location;
}

/**
 * Delete a location (hard delete).
 */
export async function deleteLocation(
  client: SupabaseClient,
  organizationId: string,
  locationId: string
): Promise<void> {
  const { error } = await client
    .from('locations')
    .delete()
    .eq('id', locationId)
    .eq('organization_id', organizationId); // Always scope by org

  if (error) {
    logger.error('Failed to delete location', error, {
      feature: 'locations',
      operation: 'delete',
      organizationId,
      entityId: locationId,
    });
    throw ValidationErrors.invalidInput('Failed to delete location.');
  }

  logger.info('Location deleted', {
    feature: 'locations',
    operation: 'delete',
    entityType: 'location',
    entityId: locationId,
    organizationId,
  });
}
