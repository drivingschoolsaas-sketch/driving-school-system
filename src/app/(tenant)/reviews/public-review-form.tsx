'use client';

// ==================================================
// Public Review Form
// ==================================================
// Allows anyone visiting the school's public website
// to submit a review without logging in. The review
// starts as "pending" and must be approved by the
// school owner before appearing publicly.

import { useActionState, useState } from 'react';
import { submitPublicReviewAction, type PublicReviewActionState } from './actions';

interface Props {
  primaryColor: string;
}

const initialState: PublicReviewActionState = { success: false };

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-offset-0 focus:outline-none';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export function PublicReviewForm({ primaryColor }: Props) {
  const [state, formAction, isPending] = useActionState(submitPublicReviewAction, initialState);
  const [rating, setRating] = useState(5);
  const [hoveredStar, setHoveredStar] = useState(0);

  if (state.success) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-8 text-center">
        <span className="text-4xl">🎉</span>
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Thank You for Your Review!
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Your review has been submitted and is pending moderation.
          It will appear on the website once approved by the school.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Rating */}
      <div>
        <label className={labelClass}>Your Rating *</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="text-3xl transition-transform hover:scale-110 focus:outline-none"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <span
                className={
                  star <= (hoveredStar || rating)
                    ? 'text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }
              >
                ★
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>

      {/* Name */}
      <div>
        <label className={labelClass}>Your Name *</label>
        <input
          type="text"
          name="reviewer_name"
          required
          maxLength={200}
          placeholder="Enter your full name"
          className={inputClass}
          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
        />
      </div>

      {/* Title */}
      <div>
        <label className={labelClass}>Review Title (optional)</label>
        <input
          type="text"
          name="title"
          maxLength={200}
          placeholder="Sum up your experience in a few words"
          className={inputClass}
        />
      </div>

      {/* Body */}
      <div>
        <label className={labelClass}>Your Review *</label>
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder="Tell us about your experience learning to drive…"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Minimum 10 characters. Your review will be published after moderation.
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: primaryColor }}
      >
        {isPending ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}
