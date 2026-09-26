'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface SetupStep {
  label: string;
  href: string;
  done: boolean;
  icon: string;
}

interface Props {
  steps: SetupStep[];
  primaryColor: string;
}

export function SetupChecklist({ steps, primaryColor }: Props) {
  const completedCount = steps.filter((s) => s.done).length;
  const totalSteps = steps.length;
  const allDone = completedCount === totalSteps;

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('driveflow_checklist_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  if (allDone || dismissed) return null;

  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem('driveflow_checklist_dismissed', 'true');
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            🚀 Get Started
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complete these steps to set up your driving school
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: primaryColor }}>
            {completedCount}/{totalSteps}
          </span>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Dismiss checklist"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 mb-5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
              step.done
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-lg shrink-0">
              {step.done ? '✅' : step.icon}
            </span>
            <span
              className={`text-sm font-medium ${
                step.done
                  ? 'text-green-700 dark:text-green-400 line-through'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {step.label}
            </span>
            {!step.done && (
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">→</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
