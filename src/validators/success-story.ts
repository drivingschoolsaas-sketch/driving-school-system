// ==================================================
// Success Story Validators
// ==================================================

import { z } from 'zod';

/**
 * Schema for creating a success story (admin workflow).
 */
export const createSuccessStorySchema = z.object({
  student_name: z.string().min(1, 'Student name is required').max(200),
  student_id: z.string().uuid().optional(),
  instructor_id: z.string().uuid().optional(),
  photo_url: z.string().url('Must be a valid URL').optional(),
  test_location: z.string().max(200).optional(),
  pass_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  message: z.string().max(1000).optional(),
  consent_given: z.boolean(),
  consent_method: z.enum(['verbal', 'written', 'digital', 'parent_guardian']).optional(),
  consent_given_by: z.string().max(200).optional(),
}).refine(
  (data) => {
    // If consent is given, method must be provided
    if (data.consent_given && !data.consent_method) return false;
    return true;
  },
  { message: 'Consent method is required when consent is given', path: ['consent_method'] }
);

export type CreateSuccessStoryInput = z.infer<typeof createSuccessStorySchema>;

/**
 * Schema for updating a success story.
 */
export const updateSuccessStorySchema = z.object({
  student_name: z.string().min(1).max(200).optional(),
  instructor_id: z.string().uuid().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  test_location: z.string().max(200).nullable().optional(),
  pass_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  message: z.string().max(1000).nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  consent_given: z.boolean().optional(),
  consent_method: z.enum(['verbal', 'written', 'digital', 'parent_guardian']).nullable().optional(),
  consent_given_by: z.string().max(200).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type UpdateSuccessStoryInput = z.infer<typeof updateSuccessStorySchema>;
