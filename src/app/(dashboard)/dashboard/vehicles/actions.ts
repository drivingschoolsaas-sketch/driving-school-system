'use server';

// ==================================================
// Vehicle Server Actions
// ==================================================

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import { createVehicle, updateVehicle, deleteVehicle } from '@/services/vehicle-service';
import { createVehicleSchema, updateVehicleSchema } from '@/validators/vehicle';

export interface VehicleActionState {
  success: boolean;
  error?: string;
}

export async function createVehicleAction(
  _prev: VehicleActionState,
  formData: FormData
): Promise<VehicleActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.VEHICLE_MANAGE);
    const client = await createServerSupabaseClient();

    const input = createVehicleSchema.parse({
      name: formData.get('name'),
      make: formData.get('make'),
      model: formData.get('model'),
      year: formData.get('year') ? parseInt(formData.get('year') as string, 10) : null,
      registration: formData.get('registration') || null,
      transmission: formData.get('transmission') || 'automatic',
      assigned_instructor_id: formData.get('assigned_instructor_id') || null,
      notes: formData.get('notes') || null,
    });

    await createVehicle(client, auth, input);
    revalidatePath('/dashboard/vehicles');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create vehicle';
    return { success: false, error: message };
  }
}

export async function updateVehicleAction(
  vehicleId: string,
  formData: FormData
): Promise<VehicleActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.VEHICLE_MANAGE);
    const client = await createServerSupabaseClient();

    const updates: Record<string, unknown> = {};
    const fields = ['name', 'make', 'model', 'registration', 'transmission', 'notes'];
    for (const field of fields) {
      if (formData.has(field)) {
        const val = (formData.get(field) as string)?.trim();
        updates[field] = val || null;
      }
    }
    if (formData.has('year')) {
      const val = formData.get('year') as string;
      updates.year = val ? parseInt(val, 10) : null;
    }
    if (formData.has('assigned_instructor_id')) {
      updates.assigned_instructor_id = (formData.get('assigned_instructor_id') as string) || null;
    }
    if (formData.has('status')) {
      updates.status = formData.get('status');
    }

    const input = updateVehicleSchema.parse(updates);
    await updateVehicle(client, auth, vehicleId, input);
    revalidatePath('/dashboard/vehicles');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update vehicle';
    return { success: false, error: message };
  }
}

export async function deleteVehicleAction(vehicleId: string): Promise<VehicleActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.VEHICLE_MANAGE);
    const client = await createServerSupabaseClient();

    await deleteVehicle(client, auth, vehicleId);
    revalidatePath('/dashboard/vehicles');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete vehicle';
    return { success: false, error: message };
  }
}
