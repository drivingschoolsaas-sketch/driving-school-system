import { z } from 'zod';

// ==================================================
// Lesson Type Validators
// ==================================================

export const createLessonTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  description: z.string().max(2000).optional().nullable(),
  duration_minutes: z.number().int().min(15).max(240).default(60),
  price_cents: z.number().int().min(0, 'Price must be non-negative'),
  transmission: z.enum(['automatic', 'manual', 'both']).default('automatic'),
  sort_order: z.number().int().min(0).default(0),
  is_public: z.boolean().default(true),
});

export type CreateLessonTypeInput = z.infer<typeof createLessonTypeSchema>;

export const updateLessonTypeSchema = createLessonTypeSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

export type UpdateLessonTypeInput = z.infer<typeof updateLessonTypeSchema>;
