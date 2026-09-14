// ==================================================
// Vehicle Service
// ==================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Vehicle } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { CreateVehicleInput, UpdateVehicleInput } from '@/validators/vehicle';
import { logger } from '@/lib/logging';

export async function getVehicles(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<Vehicle[]> {
  const { data, error } = await client
    .from('vehicles')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('name');

  if (error) {
    logger.error('Failed to fetch vehicles', error, {
      feature: 'vehicles',
      operation: 'list',
      organizationId: context.organizationId,
    });
    return [];
  }

  return (data ?? []) as Vehicle[];
}

export async function getVehicle(
  client: SupabaseClient,
  context: AuthorizedContext,
  vehicleId: string
): Promise<Vehicle | null> {
  const { data, error } = await client
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch vehicle', error, {
      feature: 'vehicles',
      operation: 'get',
      organizationId: context.organizationId,
      entityId: vehicleId,
    });
    return null;
  }

  return data as Vehicle | null;
}

export async function createVehicle(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateVehicleInput
): Promise<Vehicle> {
  const { data, error } = await client
    .from('vehicles')
    .insert({
      ...input,
      organization_id: context.organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create vehicle', error, {
      feature: 'vehicles',
      operation: 'create',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create vehicle.');
  }

  logger.info('Vehicle created', {
    feature: 'vehicles',
    operation: 'create',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as Vehicle;
}

export async function updateVehicle(
  client: SupabaseClient,
  context: AuthorizedContext,
  vehicleId: string,
  input: UpdateVehicleInput
): Promise<Vehicle> {
  const { data, error } = await client
    .from('vehicles')
    .update(input)
    .eq('id', vehicleId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update vehicle', error, {
      feature: 'vehicles',
      operation: 'update',
      organizationId: context.organizationId,
      entityId: vehicleId,
    });
    throw new Error('Failed to update vehicle.');
  }

  return data as Vehicle;
}

export async function deleteVehicle(
  client: SupabaseClient,
  context: AuthorizedContext,
  vehicleId: string
): Promise<void> {
  const { error } = await client
    .from('vehicles')
    .delete()
    .eq('id', vehicleId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete vehicle', error, {
      feature: 'vehicles',
      operation: 'delete',
      organizationId: context.organizationId,
      entityId: vehicleId,
    });
    throw new Error('Failed to delete vehicle.');
  }

  logger.info('Vehicle deleted', {
    feature: 'vehicles',
    operation: 'delete',
    organizationId: context.organizationId,
    entityId: vehicleId,
  });
}
