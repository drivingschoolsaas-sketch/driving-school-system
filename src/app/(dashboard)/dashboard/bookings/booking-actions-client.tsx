'use client';

// ==================================================
// Booking Action Buttons (Client Component)
// ==================================================
// Status transition buttons + cancel with reason dialog.

import { useState, useTransition } from 'react';
import { transitionStatusAction, cancelBookingAction } from './actions';

// Valid transitions — mirrors booking-service VALID_TRANSITIONS
const VALID_TRANSITIONS: Record<string, string[]> = {
  new_request: ['contacted', 'confirmed', 'rejected', 'cancelled'],
  contacted: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

const STATUS_LABELS: Record<string, string> = {
  contacted: '📞 Mark Contacted',
  confirmed: '✅ Confirm',
  completed: '🏁 Complete',
  rejected: '❌ Reject',
  cancelled: '🚫 Cancel',
  no_show: '⚠️ No Show',
};

const STATUS_BUTTON_STYLES: Record<string, string> = {
  contacted: 'bg-orange-600 hover:bg-orange-700 text-white',
  confirmed: 'bg-green-600 hover:bg-green-700 text-white',
  completed: 'bg-blue-600 hover:bg-blue-700 text-white',
  rejected: 'bg-red-600 hover:bg-red-700 text-white',
  cancelled: 'bg-gray-600 hover:bg-gray-700 text-white',
  no_show: 'bg-red-500 hover:bg-red-600 text-white',
};

interface BookingActionsProps {
  bookingId: string;
  currentStatus: string;
}

export function BookingActions({ bookingId, currentStatus }: BookingActionsProps) {
  const transitions = VALID_TRANSITIONS[currentStatus] ?? [];
  const [isPending, startTransition] = useTransition();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (transitions.length === 0) return null;

  function handleTransition(newStatus: string) {
    if (newStatus === 'cancelled') {
      setShowCancelDialog(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await transitionStatusAction(bookingId, newStatus);
      if (!result.success) {
        setError(result.error ?? 'Failed');
      }
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId, cancelReason);
      if (!result.success) {
        setError(result.error ?? 'Failed');
      }
      setShowCancelDialog(false);
      setCancelReason('');
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((status) => (
          <button
            key={status}
            onClick={() => handleTransition(status)}
            disabled={isPending}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${STATUS_BUTTON_STYLES[status] ?? 'bg-gray-200 text-gray-800'}`}
          >
            {STATUS_LABELS[status] ?? status}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {showCancelDialog && (
        <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Cancellation reason (optional)
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            placeholder="Enter reason..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
            <button
              onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}
              className="rounded-lg bg-gray-200 dark:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
