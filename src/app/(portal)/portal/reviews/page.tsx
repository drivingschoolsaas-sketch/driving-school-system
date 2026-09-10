// ==================================================
// Student Portal — Reviews
// ==================================================
// Students can leave a review after completing lessons.
// Shows existing review or the review form.

import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import type { Review, Instructor } from '@/types/database';
import type { Metadata } from 'next';
import { ReviewForm } from './review-form';

export const metadata: Metadata = {
  title: 'Leave a Review',
};

export default async function PortalReviewsPage() {
  const { auth, student, settings } = await getPortalContext();
  const client = await createServerSupabaseClient();
  const orgId = auth.organizationId;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  // Check if student already submitted a review
  const { data: existingReviews } = await client
    .from('reviews')
    .select('*')
    .eq('organization_id', orgId)
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const existingReview = (existingReviews?.[0] ?? null) as Review | null;

  // Check completed lesson count
  const { count: completedCount } = await client
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('student_id', student.id)
    .eq('status', 'completed');

  const hasCompletedLessons = (completedCount ?? 0) > 0;

  // Get instructors for the dropdown
  const { data: instructorsData } = await client
    .from('instructors')
    .select('id, display_name')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('display_name');

  const instructors = (instructorsData ?? []) as Pick<Instructor, 'id' | 'display_name'>[];

  const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
    pending: {
      label: 'Pending Moderation',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      icon: '⏳',
    },
    approved: {
      label: 'Published',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      icon: '✅',
    },
    featured: {
      label: 'Featured',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      icon: '⭐',
    },
    rejected: {
      label: 'Not Published',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: '❌',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave a Review</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Share your experience with the driving school.
        </p>
      </div>

      {existingReview ? (
        // Show existing review
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1 text-lg">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i}>{i < existingReview.rating ? '⭐' : '☆'}</span>
                ))}
              </div>
              {existingReview.title && (
                <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                  {existingReview.title}
                </h3>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusLabels[existingReview.status]?.color ?? ''
              }`}
            >
              {statusLabels[existingReview.status]?.icon}{' '}
              {statusLabels[existingReview.status]?.label ?? existingReview.status}
            </span>
          </div>

          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {existingReview.body}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span>
              By {existingReview.is_anonymous ? 'Anonymous' : existingReview.reviewer_name}
            </span>
            <span>·</span>
            <span>
              {new Date(existingReview.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {existingReview.status === 'rejected' && existingReview.moderation_notes && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs font-medium text-red-700 dark:text-red-300">
                Moderator note: {existingReview.moderation_notes}
              </p>
            </div>
          )}
        </div>
      ) : !hasCompletedLessons ? (
        // No completed lessons yet
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <span className="text-4xl">📝</span>
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Complete a Lesson First
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You can leave a review after completing at least one driving lesson.
          </p>
        </div>
      ) : (
        // Show review form
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <ReviewForm
            studentName={student.display_name}
            instructors={instructors}
            primaryColor={primaryColor}
          />
        </div>
      )}
    </div>
  );
}
