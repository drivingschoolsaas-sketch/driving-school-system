// ==================================================
// Review Service
// ==================================================
// Business logic for review collection and moderation.
// Reviews start as "pending" and must be moderated
// before appearing on the public website.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { Review } from '@/types/database';
import type { CreateReviewInput, ModerateReviewInput } from '@/validators/review';

/**
 * Get reviews for an organization with optional status filter.
 */
export async function getReviews(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: { status?: string }
): Promise<Review[]> {
  let query = client
    .from('reviews')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Review[];
}

/**
 * Get public reviews (approved + featured) for the tenant website.
 */
export async function getPublicReviews(
  client: SupabaseClient,
  organizationId: string
): Promise<Review[]> {
  const { data, error } = await client
    .from('reviews')
    .select('*')
    .eq('organization_id', organizationId)
    .in('status', ['approved', 'featured'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Review[];
}

/**
 * Submit a new review (starts as pending).
 */
export async function createReview(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateReviewInput
): Promise<Review> {
  // Look up the student record for this user
  const { data: student } = await client
    .from('students')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .maybeSingle();

  const { data, error } = await client
    .from('reviews')
    .insert({
      organization_id: context.organizationId,
      student_id: student?.id ?? null,
      instructor_id: input.instructor_id ?? null,
      reviewer_name: input.reviewer_name,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body,
      is_anonymous: input.is_anonymous,
      status: 'pending', // Always start as pending — never auto-publish
    })
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

/**
 * Moderate a review (approve, reject, or feature it).
 */
export async function moderateReview(
  client: SupabaseClient,
  context: AuthorizedContext,
  reviewId: string,
  input: ModerateReviewInput
): Promise<Review> {
  const { data, error } = await client
    .from('reviews')
    .update({
      status: input.status,
      moderated_by: context.userId,
      moderated_at: new Date().toISOString(),
      moderation_notes: input.moderation_notes ?? null,
    })
    .eq('id', reviewId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}

/**
 * Delete a review.
 */
export async function deleteReview(
  client: SupabaseClient,
  context: AuthorizedContext,
  reviewId: string
): Promise<void> {
  const { error } = await client
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('organization_id', context.organizationId);

  if (error) throw error;
}
