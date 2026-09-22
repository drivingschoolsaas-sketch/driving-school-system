// ==================================================
// Tenant Public Reviews Page
// ==================================================
// Displays approved and featured reviews for the
// school's public website. Includes a public review
// submission form — reviews start as pending and must
// be approved by the school owner before appearing.

import { getTenantData } from '@/lib/tenant';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { getPublicReviews } from '@/services/review-service';
import { PublicReviewForm } from './public-review-form';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTenantData();
  if (!data) return { title: 'Reviews' };
  return { title: 'Reviews' };
}

export default async function ReviewsPage() {
  const data = await getTenantData();

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-500">Site not found.</p>
      </div>
    );
  }

  const { organization, settings } = data;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const client = getAdminClient();
  const reviews = await getPublicReviews(client, organization.id);

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const featuredReviews = reviews.filter((r) => r.status === 'featured');
  const regularReviews = reviews.filter((r) => r.status === 'approved');

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-12">
        <p
          className="text-sm font-semibold uppercase tracking-widest mb-2"
          style={{ color: primaryColor }}
        >
          Testimonials
        </p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          What Our Students Say
        </h1>
        {reviews.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-2xl ${
                    star <= Math.round(avgRating)
                      ? 'text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </span>
          </div>
        )}

        {/* Google Reviews link */}
        {settings?.social_google_review && (
          <a
            href={settings.social_google_review}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: primaryColor }}
          >
            See us on Google Reviews →
          </a>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-8 mb-12">
          <p className="text-gray-500 dark:text-gray-400">
            No reviews yet. Be the first to share your experience!
          </p>
        </div>
      ) : (
        <div className="space-y-12 mb-16">
          {/* Featured Reviews */}
          {featuredReviews.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Featured Reviews
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {featuredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    featured
                    primaryColor={primaryColor}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All Reviews */}
          {regularReviews.length > 0 && (
            <section>
              {featuredReviews.length > 0 && (
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  All Reviews
                </h2>
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                {regularReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    primaryColor={primaryColor}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Write a Review Section */}
      <section className="border-t border-gray-200 dark:border-gray-700 pt-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Write a Review
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Share your experience with {organization.name}. Your review will be published after approval.
          </p>
        </div>
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <PublicReviewForm primaryColor={primaryColor} />
          </div>
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------
// Sub-components
// --------------------------------------------------

function ReviewCard({
  review,
  featured,
  primaryColor,
}: {
  review: { id: string; reviewer_name: string; rating: number; title: string | null; body: string; is_anonymous: boolean; created_at: string };
  featured?: boolean;
  primaryColor: string;
}) {
  const displayName = review.is_anonymous ? 'Anonymous' : review.reviewer_name;
  const reviewDate = new Date(review.created_at);
  const monthYear = reviewDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className={`rounded-xl border p-6 ${
        featured
          ? 'border-2 bg-white dark:bg-gray-800'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
      }`}
      style={featured ? { borderColor: primaryColor } : undefined}
    >
      {/* Stars */}
      <div className="flex gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= review.rating
                ? 'text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          >
            ★
          </span>
        ))}
      </div>

      {/* Title */}
      {review.title && (
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {review.title}
        </h3>
      )}

      {/* Body */}
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
        &ldquo;{review.body}&rdquo;
      </p>

      {/* Attribution */}
      <div className="mt-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {displayName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {monthYear}
          </p>
        </div>
      </div>
    </div>
  );
}
