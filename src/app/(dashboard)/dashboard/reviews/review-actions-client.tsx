'use client';

import { useState, useTransition } from 'react';
import { moderateReviewAction, deleteReviewAction } from './actions';

interface Props {
  reviewId: string;
  currentStatus: string;
  primaryColor: string;
}

export function ReviewActions({ reviewId, currentStatus, primaryColor }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  function handleModerate(status: string) {
    if (status === 'rejected' && !showNotes) {
      setPendingAction(status);
      setShowNotes(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await moderateReviewAction(reviewId, status, notes || undefined);
      if (!result.success) setError(result.error ?? 'Failed');
      setShowNotes(false);
      setNotes('');
      setPendingAction(null);
    });
  }

  function handleDelete() {
    if (!confirm('Delete this review permanently?')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteReviewAction(reviewId);
      if (!result.success) setError(result.error ?? 'Failed');
    });
  }

  const actions: { status: string; label: string; className: string }[] = [];

  if (currentStatus === 'pending') {
    actions.push(
      { status: 'approved', label: 'Approve', className: 'bg-green-600 hover:bg-green-700 text-white' },
      { status: 'rejected', label: 'Reject', className: 'bg-red-600 hover:bg-red-700 text-white' },
      { status: 'featured', label: 'Feature', className: 'text-white' }
    );
  } else if (currentStatus === 'approved') {
    actions.push(
      { status: 'featured', label: 'Feature', className: 'text-white' },
      { status: 'rejected', label: 'Reject', className: 'bg-red-600 hover:bg-red-700 text-white' }
    );
  } else if (currentStatus === 'featured') {
    actions.push(
      { status: 'approved', label: 'Unfeature', className: 'bg-gray-600 hover:bg-gray-700 text-white' }
    );
  } else if (currentStatus === 'rejected') {
    actions.push(
      { status: 'approved', label: 'Approve', className: 'bg-green-600 hover:bg-green-700 text-white' }
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => handleModerate(action.status)}
            disabled={isPending}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${action.className}`}
            style={action.status === 'featured' ? { backgroundColor: primaryColor } : undefined}
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {showNotes && (
        <div className="flex gap-2 items-end">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for rejection (optional)"
            rows={2}
            maxLength={500}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
          <button
            onClick={() => handleModerate(pendingAction!)}
            disabled={isPending}
            className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? 'Rejecting…' : 'Confirm Reject'}
          </button>
          <button
            onClick={() => { setShowNotes(false); setPendingAction(null); }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
