// ==================================================
// Review Validators
// ==================================================

import { z } from 'zod';

/**
 * Schema for a student submitting a review.
 */
export const createReviewSchema = z.object({
  reviewer_name: z.string().min(1, 'Name is required').max(200),
  rating: z.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
  title: z.string().max(200).optional(),
  body: z.string().min(10, 'Review must be at least 10 characters').max(2000),
  instructor_id: z.string().uuid().optional(),
  is_anonymous: z.boolean().default(false),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/**
 * Schema for admin moderating a review.
 */
export const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'featured']),
  moderation_notes: z.string().max(500).optional(),
});

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
