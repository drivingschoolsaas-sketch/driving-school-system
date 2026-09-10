'use client';

import { useState, useTransition } from 'react';
import { cancelOwnBookingAction } from './actions';

interface Props {
  bookingId: string;
  primaryColor: string;
}

export function CancelBookingButton({ bookingId, primaryColor }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelOwnBookingAction(bookingId, reason || undefined);
      if (!result.success) {
        setError(result.error ?? 'Failed to cancel');
        setShowConfirm(false);
      }
    });
  }

  if (showConfirm) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          rows={2}
          maxLength={500}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-xs text-gray-900 dark:text-white"
        />
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {isPending ? 'Cancelling…' : 'Confirm Cancel'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300"
          >
            Back
          </button>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="rounded-lg border border-red-300 dark:border-red-700 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        Cancel Booking
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}
