'use client';

// ==================================================
// Admin PIN Form (Client Component)
// ==================================================
// PIN entry form with masked input and attempt tracking.

import { useActionState, useRef, useEffect } from 'react';
import { verifyAdminPinAction } from './actions';

export function AdminPinForm() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPending] = useActionState(
    verifyAdminPinAction,
    { success: false, attempts: 0 }
  );

  // Auto-focus the PIN input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clear input on failed attempt
  useEffect(() => {
    if (state.error && inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }, [state.error, state.attempts]);

  const isLocked = (state.attempts ?? 0) >= 5;

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300 text-center">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="pin"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Admin PIN
        </label>
        <input
          ref={inputRef}
          id="pin"
          name="pin"
          type="password"
          required
          autoComplete="off"
          disabled={isLocked || isPending}
          maxLength={32}
          placeholder="Enter PIN"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-[0.3em] font-mono text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || isLocked}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Verifying…' : isLocked ? 'Locked — Try later' : 'Verify'}
      </button>

      {isLocked && (
        <p className="text-center text-xs text-red-500 dark:text-red-400">
          Too many failed attempts. Please wait 15 minutes.
        </p>
      )}
    </form>
  );
}
