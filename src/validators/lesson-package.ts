import { z } from 'zod';

// ==================================================
// Lesson Package Validators
// ==================================================

export const createLessonPackageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  description: z.string().max(2000).optional().nullable(),
  lesson_type_id: z.string().uuid('Invalid lesson type ID'),
  lesson_count: z.number().int().min(1, 'Must include at least 1 lesson').max(100),
  price_cents: z.number().int().min(0, 'Price must be non-negative'),
  savings_cents: z.number().int().min(0).default(0),
  validity_days: z.number().int().min(1).max(365).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
  is_public: z.boolean().default(true),
});

export type CreateLessonPackageInput = z.infer<typeof createLessonPackageSchema>;

export const updateLessonPackageSchema = createLessonPackageSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export type UpdateLessonPackageInput = z.infer<typeof updateLessonPackageSchema>;
