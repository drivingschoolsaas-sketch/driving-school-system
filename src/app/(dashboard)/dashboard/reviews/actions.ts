'use server';

// ==================================================
// Review Moderation Server Actions
// ==================================================

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import { moderateReview, deleteReview } from '@/services/review-service';
import { moderateReviewSchema } from '@/validators/review';
import { audit } from '@/lib/audit';

export interface ReviewActionState {
  success: boolean;
  error?: string;
}

export async function moderateReviewAction(
  reviewId: string,
  status: string,
  notes?: string
): Promise<ReviewActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.REVIEW_MODERATE);
    const client = await createServerSupabaseClient();

    const input = moderateReviewSchema.parse({
      status,
      moderation_notes: notes || undefined,
    });

    await moderateReview(client, auth, reviewId, input);
    audit(client, auth, { action: `review.${status}`, resourceType: 'review', resourceId: reviewId, details: { moderation_notes: notes } });
    revalidatePath('/dashboard/reviews');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to moderate review';
    return { success: false, error: message };
  }
}

export async function deleteReviewAction(reviewId: string): Promise<ReviewActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.REVIEW_MODERATE);
    const client = await createServerSupabaseClient();

    await deleteReview(client, auth, reviewId);
    audit(client, auth, { action: 'review.deleted', resourceType: 'review', resourceId: reviewId });
    revalidatePath('/dashboard/reviews');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete review';
    return { success: false, error: message };
  }
}
