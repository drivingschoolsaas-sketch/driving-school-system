import { z } from 'zod';

// ==================================================
// Vehicle Validators
// ==================================================

export const createVehicleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  make: z.string().min(1, 'Make is required').max(50).trim(),
  model: z.string().min(1, 'Model is required').max(50).trim(),
  year: z.number().int().min(1990).max(2100).optional().nullable(),
  registration: z.string().max(20).optional().nullable(),
  transmission: z.enum(['automatic', 'manual', 'both']).default('automatic'),
  assigned_instructor_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: z.enum(['active', 'maintenance', 'retired']).optional(),
});

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
