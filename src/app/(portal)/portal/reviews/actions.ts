'use server';

// ==================================================
// Portal Review Actions
// ==================================================
// Students can submit reviews for their driving school
// after completing lessons.

import { revalidatePath } from 'next/cache';
import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { createReview } from '@/services/review-service';
import { createReviewSchema } from '@/validators/review';

export interface ReviewActionState {
  success: boolean;
  error?: string;
}

export async function submitReviewAction(
  _prev: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  try {
    const { auth, student } = await getPortalContext();
    const client = await createServerSupabaseClient();

    // Check the student has at least one completed lesson
    const { count } = await client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.organizationId)
      .eq('student_id', student.id)
      .eq('status', 'completed');

    if (!count || count === 0) {
      return {
        success: false,
        error: 'You need at least one completed lesson before leaving a review.',
      };
    }

    // Check student hasn't already submitted a review
    const { count: existingCount } = await client
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.organizationId)
      .eq('student_id', student.id);

    if (existingCount && existingCount > 0) {
      return {
        success: false,
        error: 'You have already submitted a review. Thank you!',
      };
    }

    // Parse and validate form data
    const raw = {
      reviewer_name: formData.get('reviewer_name') as string,
      rating: parseInt(formData.get('rating') as string, 10),
      title: (formData.get('title') as string) || undefined,
      body: formData.get('body') as string,
      instructor_id: (formData.get('instructor_id') as string) || undefined,
      is_anonymous: formData.get('is_anonymous') === 'true',
    };

    const parsed = createReviewSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid input';
      return { success: false, error: firstError };
    }

    await createReview(client, auth, parsed.data);

    revalidatePath('/portal/reviews');
    revalidatePath('/portal');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit review';
    return { success: false, error: message };
  }
}
