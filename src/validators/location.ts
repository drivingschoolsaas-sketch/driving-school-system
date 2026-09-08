import { z } from 'zod';

// ==================================================
// Location Validators
// ==================================================

export const createLocationSchema = z.object({
  name: z
    .string()
    .min(2, 'Location name must be at least 2 characters')
    .max(100, 'Location name must be at most 100 characters')
    .trim(),
  address: z.string().max(255).nullable().optional(),
  suburb: z.string().max(100).nullable().optional(),
  state: z.string().max(50).nullable().optional(),
  postcode: z.string().max(10).nullable().optional(),
  country: z.string().length(2).default('AU'),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = createLocationSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
