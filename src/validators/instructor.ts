import { z } from 'zod';

// ==================================================
// Instructor Validators
// ==================================================

export const createInstructorSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  display_name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  photo_url: z.string().url().max(2048).optional().nullable(),
  license_number: z.string().max(50).optional().nullable(),
  license_expiry: z.string().optional().nullable(),
  transmission_type: z.enum(['automatic', 'manual', 'both']).default('automatic'),
  max_daily_lessons: z.number().int().min(1).max(20).optional().nullable(),
  default_lesson_duration: z.number().int().min(30).max(180).default(60),
});

export type CreateInstructorInput = z.infer<typeof createInstructorSchema>;

export const updateInstructorSchema = createInstructorSchema
  .omit({ user_id: true })
  .partial()
  .extend({
    is_active: z.boolean().optional(),
  });

export type UpdateInstructorInput = z.infer<typeof updateInstructorSchema>;
