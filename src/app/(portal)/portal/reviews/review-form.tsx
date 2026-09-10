'use client';

// ==================================================
// Portal Review Form
// ==================================================
// Client component for students to submit a review.

import { useActionState, useState } from 'react';
import { submitReviewAction, type ReviewActionState } from './actions';

interface Instructor {
  id: string;
  display_name: string;
}

interface Props {
  studentName: string;
  instructors: Instructor[];
  primaryColor: string;
}

const initialState: ReviewActionState = { success: false };

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export function ReviewForm({ studentName, instructors, primaryColor }: Props) {
  const [state, formAction, isPending] = useActionState(submitReviewAction, initialState);
  const [rating, setRating] = useState(5);
  const [isAnonymous, setIsAnonymous] = useState(false);

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
        <label className={labelClass}>Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="text-3xl transition-transform hover:scale-110 focus:outline-none"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              {star <= rating ? '⭐' : '☆'}
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>

      {/* Name */}
      <div>
        <label className={labelClass}>Your Name</label>
        <input
          type="text"
          name="reviewer_name"
          defaultValue={isAnonymous ? 'Anonymous' : studentName}
          readOnly={isAnonymous}
          required
          className={inputClass}
        />
      </div>

      {/* Anonymous toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_anonymous"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
        />
        <input type="hidden" name="is_anonymous" value={isAnonymous.toString()} />
        <label htmlFor="is_anonymous" className="text-sm text-gray-700 dark:text-gray-300">
          Post anonymously
        </label>
      </div>

      {/* Instructor */}
      {instructors.length > 0 && (
        <div>
          <label className={labelClass}>Instructor (optional)</label>
          <select name="instructor_id" className={inputClass}>
            <option value="">General review</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.display_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>Title (optional)</label>
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
        <label className={labelClass}>Your Review</label>
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
