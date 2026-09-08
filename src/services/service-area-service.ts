// ==================================================
// Service Area Service
// ==================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceArea, InstructorServiceArea } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { CreateServiceAreaInput, UpdateServiceAreaInput } from '@/validators/service-area';
import { logger } from '@/lib/logging';

export async function getServiceAreas(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<ServiceArea[]> {
  const { data, error } = await client
    .from('service_areas')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('name');

  if (error) {
    logger.error('Failed to fetch service areas', error, {
      feature: 'service-areas',
      operation: 'list',
      organizationId: context.organizationId,
    });
    return [];
  }

  return (data ?? []) as ServiceArea[];
}

export async function getServiceArea(
  client: SupabaseClient,
  context: AuthorizedContext,
  areaId: string
): Promise<ServiceArea | null> {
  const { data, error } = await client
    .from('service_areas')
    .select('*')
    .eq('id', areaId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch service area', error, {
      feature: 'service-areas',
      operation: 'get',
      organizationId: context.organizationId,
      entityId: areaId,
    });
    return null;
  }

  return data as ServiceArea | null;
}

export async function createServiceArea(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateServiceAreaInput
): Promise<ServiceArea> {
  const { data, error } = await client
    .from('service_areas')
    .insert({
      organization_id: context.organizationId,
      ...input,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create service area', error, {
      feature: 'service-areas',
      operation: 'create',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to create service area.');
  }

  logger.info('Service area created', {
    feature: 'service-areas',
    operation: 'create',
    organizationId: context.organizationId,
    entityId: data.id,
  });

  return data as ServiceArea;
}

export async function updateServiceArea(
  client: SupabaseClient,
  context: AuthorizedContext,
  areaId: string,
  input: UpdateServiceAreaInput
): Promise<ServiceArea> {
  const { data, error } = await client
    .from('service_areas')
    .update(input)
    .eq('id', areaId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update service area', error, {
      feature: 'service-areas',
      operation: 'update',
      organizationId: context.organizationId,
      entityId: areaId,
    });
    throw new Error('Failed to update service area.');
  }

  return data as ServiceArea;
}

export async function deleteServiceArea(
  client: SupabaseClient,
  context: AuthorizedContext,
  areaId: string
): Promise<void> {
  const { error } = await client
    .from('service_areas')
    .delete()
    .eq('id', areaId)
    .eq('organization_id', context.organizationId);

  if (error) {
    logger.error('Failed to delete service area', error, {
      feature: 'service-areas',
      operation: 'delete',
      organizationId: context.organizationId,
      entityId: areaId,
    });
    throw new Error('Failed to delete service area.');
  }

  logger.info('Service area deleted', {
    feature: 'service-areas',
    operation: 'delete',
    organizationId: context.organizationId,
    entityId: areaId,
  });
}

// --- Instructor-Service Area assignments ---

export async function getInstructorServiceAreas(
  client: SupabaseClient,
  instructorId: string
): Promise<InstructorServiceArea[]> {
  const { data, error } = await client
    .from('instructor_service_areas')
    .select('*')
    .eq('instructor_id', instructorId);

  if (error) {
    logger.error('Failed to fetch instructor service areas', error, {
      feature: 'service-areas',
      operation: 'list_instructor_areas',
      entityId: instructorId,
    });
    return [];
  }

  return (data ?? []) as InstructorServiceArea[];
}

export async function assignInstructorArea(
  client: SupabaseClient,
  instructorId: string,
  serviceAreaId: string,
  travelBufferMinutes: number = 15
): Promise<InstructorServiceArea> {
  const { data, error } = await client
    .from('instructor_service_areas')
    .insert({
      instructor_id: instructorId,
      service_area_id: serviceAreaId,
      travel_buffer_minutes: travelBufferMinutes,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to assign instructor to area', error, {
      feature: 'service-areas',
      operation: 'assign_instructor',
      entityId: instructorId,
    });
    throw new Error('Failed to assign instructor to service area.');
  }

  return data as InstructorServiceArea;
}

export async function removeInstructorArea(
  client: SupabaseClient,
  instructorId: string,
  serviceAreaId: string
): Promise<void> {
  const { error } = await client
    .from('instructor_service_areas')
    .delete()
    .eq('instructor_id', instructorId)
    .eq('service_area_id', serviceAreaId);

  if (error) {
    logger.error('Failed to remove instructor from area', error, {
      feature: 'service-areas',
      operation: 'remove_instructor',
      entityId: instructorId,
    });
    throw new Error('Failed to remove instructor from service area.');
  }
}
