import { z } from 'zod';

// ==================================================
// Service Area Validators
// ==================================================

export const createServiceAreaSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  suburb: z.string().max(100).optional().nullable(),
  postcode: z.string().max(10).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
});

export type CreateServiceAreaInput = z.infer<typeof createServiceAreaSchema>;

export const updateServiceAreaSchema = createServiceAreaSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type UpdateServiceAreaInput = z.infer<typeof updateServiceAreaSchema>;

export const assignInstructorAreaSchema = z.object({
  instructor_id: z.string().uuid('Invalid instructor ID'),
  service_area_id: z.string().uuid('Invalid service area ID'),
  travel_buffer_minutes: z.number().int().min(0).max(120).default(15),
});

export type AssignInstructorAreaInput = z.infer<typeof assignInstructorAreaSchema>;
