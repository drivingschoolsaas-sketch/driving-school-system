'use server';

// ==================================================
// Public Review Actions
// ==================================================
// Allows visitors to submit reviews without logging in.
// Uses admin client to bypass RLS since public visitors
// have no auth session.

import { revalidatePath } from 'next/cache';
import { getTenantData } from '@/lib/tenant';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { createReviewSchema } from '@/validators/review';

export interface PublicReviewActionState {
  success: boolean;
  error?: string;
}

export async function submitPublicReviewAction(
  _prev: PublicReviewActionState,
  formData: FormData
): Promise<PublicReviewActionState> {
  try {
    const data = await getTenantData();
    if (!data) {
      return { success: false, error: 'Could not identify the school. Please try again.' };
    }

    const adminClient = getAdminClient();
    const { organization } = data;

    // Parse and validate form data
    const raw = {
      reviewer_name: (formData.get('reviewer_name') as string)?.trim(),
      rating: parseInt(formData.get('rating') as string, 10),
      title: (formData.get('title') as string)?.trim() || undefined,
      body: (formData.get('body') as string)?.trim(),
      is_anonymous: false,
    };

    const parsed = createReviewSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Invalid input';
      return { success: false, error: firstError };
    }

    // Insert the review as pending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await adminClient
      .from('reviews')
      .insert({
        organization_id: organization.id,
        student_id: null,
        instructor_id: null,
        reviewer_name: parsed.data.reviewer_name,
        rating: parsed.data.rating,
        title: parsed.data.title ?? null,
        body: parsed.data.body,
        is_anonymous: false,
        status: 'pending',
      } as any);

    if (insertError) {
      return { success: false, error: 'Failed to submit review. Please try again.' };
    }

    // Send notification to school owner about the new review (fire-and-forget)
    void notifyNewReview(adminClient, organization.id, parsed.data.reviewer_name, parsed.data.rating);

    revalidatePath('/reviews');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit review';
    return { success: false, error: message };
  }
}

/**
 * Fire-and-forget notification to the school owner about a new pending review.
 */
async function notifyNewReview(
  client: ReturnType<typeof getAdminClient>,
  organizationId: string,
  reviewerName: string,
  rating: number
): Promise<void> {
  try {
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.from('notifications').insert({
      organization_id: organizationId,
      notification_type: 'custom',
      channel: 'email',
      recipient_email: null,
      recipient_name: 'School Admin',
      subject: `New Review Pending — ${reviewerName} (${stars})`,
      body: `A new ${rating}-star review from ${reviewerName} is waiting for your approval. Go to Dashboard → Reviews to approve or reject it.`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: { source: 'public_review' },
    } as any);
  } catch {
    // Notification is non-critical — don't fail the review submission
  }
}
