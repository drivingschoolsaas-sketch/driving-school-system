'use client';

import { useState, useCallback } from 'react';

interface FAQ {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  faqs: FAQ[];
  primaryColor: string;
}

export function FAQAccordion({ faqs, primaryColor }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;

        return (
          <div
            key={i}
            className={`rounded-xl border transition-all ${
              isOpen
                ? 'border-2 bg-white dark:bg-gray-800 shadow-md'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
            }`}
            style={isOpen ? { borderColor: primaryColor } : undefined}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-base font-semibold text-gray-900 dark:text-white pr-4">
                {faq.q}
              </span>
              <svg
                className={`w-5 h-5 shrink-0 text-gray-500 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={isOpen ? { color: primaryColor } : undefined}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? 'max-h-96 pb-5' : 'max-h-0'
              }`}
            >
              <p className="px-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {faq.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
