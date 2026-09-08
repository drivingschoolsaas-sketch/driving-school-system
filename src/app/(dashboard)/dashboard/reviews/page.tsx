// ==================================================
// Dashboard: Review Moderation Page
// ==================================================
// Admins can view, filter, and moderate student reviews.
// Reviews start as "pending" and must be approved before
// appearing on the public website.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getReviews } from '@/services/review-service';

// Status display config
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  featured: {
    label: 'Featured',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
};

export default async function ReviewsAdminPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { auth } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.REVIEW_MODERATE);

  const client = await createServerSupabaseClient();
  const statusFilter = searchParams.status;
  const reviews = await getReviews(client, auth, {
    status: statusFilter,
  });

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reviews
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Moderate student reviews before they appear on your website.
          </p>
        </div>
        {pendingCount > 0 && !statusFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 text-sm font-medium text-yellow-800 dark:text-yellow-300">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: undefined, label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'featured', label: 'Featured' },
          { value: 'rejected', label: 'Rejected' },
        ].map((filter) => {
          const isActive =
            filter.value === statusFilter ||
            (!filter.value && !statusFilter);
          return (
            <a
              key={filter.label}
              href={
                filter.value
                  ? `/dashboard/reviews?status=${filter.value}`
                  : '/dashboard/reviews'
              }
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </a>
          );
        })}
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {statusFilter
              ? `No ${statusFilter} reviews found.`
              : 'No reviews yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const statusInfo = STATUS_CONFIG[review.status] ?? {
              label: review.status,
              className: 'bg-gray-100 text-gray-800',
            };

            return (
              <div
                key={review.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header: name, rating, status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {review.is_anonymous
                          ? 'Anonymous'
                          : review.reviewer_name}
                      </span>

                      {/* Stars */}
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-sm ${
                              star <= review.rating
                                ? 'text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Title */}
                    {review.title && (
                      <p className="mt-1 font-medium text-gray-800 dark:text-gray-200 text-sm">
                        {review.title}
                      </p>
                    )}

                    {/* Body */}
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {review.body}
                    </p>

                    {/* Meta */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <time dateTime={review.created_at}>
                        Submitted{' '}
                        {new Date(review.created_at).toLocaleDateString()}
                      </time>
                      {review.moderated_at && (
                        <span>
                          Moderated{' '}
                          {new Date(review.moderated_at).toLocaleDateString()}
                        </span>
                      )}
                      {review.moderation_notes && (
                        <span className="italic">
                          Note: {review.moderation_notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
