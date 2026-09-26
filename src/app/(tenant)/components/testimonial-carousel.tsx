'use client';

import { useState, useCallback } from 'react';
import type { Review } from '@/types/database';

interface TestimonialCarouselProps {
  reviews: Review[];
  primaryColor: string;
}

export function TestimonialCarousel({ reviews, primaryColor }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Show 3 at a time on desktop, 1 on mobile
  const visibleReviews = reviews.slice(0, 9); // max 9 for carousel
  const totalSlides = Math.max(1, visibleReviews.length);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  if (visibleReviews.length === 0) return null;

  // Show 3 cards on desktop with wrap-around
  const getVisibleCards = () => {
    const cards = [];
    for (let i = 0; i < Math.min(3, visibleReviews.length); i++) {
      cards.push(visibleReviews[(currentIndex + i) % visibleReviews.length]);
    }
    return cards;
  };

  const visibleCards = getVisibleCards();

  return (
    <div className="relative">
      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visibleCards.map((review, i) => (
          <div
            key={`${review.id}-${i}`}
            className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Stars */}
            <div className="flex gap-0.5 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-lg ${
                    star <= review.rating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

            {/* Title */}
            {review.title && (
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                {review.title}
              </h3>
            )}

            {/* Body */}
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-4">
              &ldquo;{review.body}&rdquo;
            </p>

            {/* Author */}
            <div className="mt-4 flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {(review.is_anonymous || !review.reviewer_name ? 'A' : review.reviewer_name.charAt(0)).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {review.is_anonymous || !review.reviewer_name ? 'Anonymous' : review.reviewer_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(review.created_at).toLocaleDateString('en-AU', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {visibleReviews.length > 3 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={goPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Previous reviews"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {Array.from({ length: Math.ceil(visibleReviews.length / 3) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i * 3)}
                className="w-2.5 h-2.5 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    Math.floor(currentIndex / 3) === i ? primaryColor : '#d1d5db',
                }}
                aria-label={`Go to review set ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Next reviews"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
