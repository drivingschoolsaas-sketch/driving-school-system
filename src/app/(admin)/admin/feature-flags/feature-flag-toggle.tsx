'use client';

// ==================================================
// Feature Flag Toggle (Client Component)
// ==================================================
// Interactive toggle switch for enabling/disabling
// feature flags from the admin dashboard.

import { useTransition, useState } from 'react';
import { toggleFeatureFlagAction } from './actions';

interface Props {
  flagId: string;
  flagName: string;
  initialEnabled: boolean;
}

export function FeatureFlagToggle({ flagId, flagName, initialEnabled }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const newValue = !isEnabled;
    setError(null);
    // Optimistically update UI
    setIsEnabled(newValue);

    startTransition(async () => {
      const result = await toggleFeatureFlagAction(flagId, newValue);
      if (!result.success) {
        // Revert on failure
        setIsEnabled(!newValue);
        setError(result.error ?? 'Failed to toggle flag');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        aria-label={`Toggle ${flagName}`}
        disabled={isPending}
        onClick={handleToggle}
        className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
          isEnabled
            ? 'bg-green-500'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            isEnabled ? 'left-[1.375rem]' : 'left-0.5'
          }`}
        />
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
