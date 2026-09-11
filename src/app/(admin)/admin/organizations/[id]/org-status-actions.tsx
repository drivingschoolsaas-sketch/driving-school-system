'use client';

// ==================================================
// Organization Status Actions
// ==================================================
// Suspend / activate / cancel buttons for platform admins.

import { useTransition, useState } from 'react';
import { updateOrgStatusAction } from './actions';

interface Props {
  organizationId: string;
  currentStatus: string;
}

export function OrgStatusActions({ organizationId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleStatusChange(newStatus: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateOrgStatusAction(organizationId, newStatus);
      if (result.success) {
        setMessage(`Status changed to ${newStatus}`);
      } else {
        setError(result.error ?? 'Failed to update status');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {currentStatus !== 'active' && (
          <button
            onClick={() => handleStatusChange('active')}
            disabled={isPending}
            className="rounded-lg bg-green-600 hover:bg-green-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Activate
          </button>
        )}
        {currentStatus !== 'suspended' && currentStatus !== 'cancelled' && (
          <button
            onClick={() => handleStatusChange('suspended')}
            disabled={isPending}
            className="rounded-lg bg-yellow-600 hover:bg-yellow-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Suspend
          </button>
        )}
        {currentStatus !== 'cancelled' && (
          <button
            onClick={() => handleStatusChange('cancelled')}
            disabled={isPending}
            className="rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="text-xs text-green-600 dark:text-green-400">{message}</p>}
    </div>
  );
}
