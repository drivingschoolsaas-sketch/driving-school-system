'use client';

// ==================================================
// Hero Image Slider (Client Component)
// ==================================================
// Auto-sliding carousel for the tenant landing page.
// Supports title/subtitle overlay, CTA buttons, and
// dot navigation. Pauses on hover.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Slide {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  link_text: string | null;
}

interface HeroSliderProps {
  slides: Slide[];
  primaryColor: string;
  autoPlayInterval?: number; // ms, default 5000
}

export function HeroSlider({
  slides,
  primaryColor,
  autoPlayInterval = 5000,
}: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-play
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(goNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [isPaused, goNext, autoPlayInterval, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="relative w-full flex-shrink-0">
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image_url}
              alt={slide.title ?? 'Hero slide'}
              className="w-full h-[400px] sm:h-[500px] lg:h-[600px] object-cover"
            />

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Content overlay */}
            {(slide.title || slide.subtitle || slide.link_url) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                {slide.title && (
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white drop-shadow-lg leading-tight max-w-4xl">
                    {slide.title}
                  </h2>
                )}
                {slide.subtitle && (
                  <p className="mt-3 text-lg sm:text-xl text-white/90 drop-shadow max-w-2xl">
                    {slide.subtitle}
                  </p>
                )}
                {slide.link_url && (
                  <Link
                    href={slide.link_url}
                    className="mt-6 inline-flex rounded-lg px-8 py-3 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {slide.link_text ?? 'Learn More'}
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Arrow navigation */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === current
                  ? 'w-8 bg-white'
                  : 'w-2.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
