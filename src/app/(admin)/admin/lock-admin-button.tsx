'use client';

// ==================================================
// Lock Admin Button (Client Component)
// ==================================================
// Clears the PIN verification cookie and redirects
// back to the PIN entry page.

import { useTransition } from 'react';
import { lockAdminAction } from './lock-admin-action';

export function LockAdminButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => lockAdminAction())}
      disabled={isPending}
      className="text-xs text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
      title="Lock admin panel"
    >
      {isPending ? '…' : '🔒 Lock'}
    </button>
  );
}
