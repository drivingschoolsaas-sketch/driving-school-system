'use client';

import { useState } from 'react';
import { updateMemberEmailAction } from './actions';

export function EditEmailButton({
  userId,
  currentEmail,
  organizationId,
}: {
  userId: string;
  currentEmail: string;
  organizationId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(currentEmail);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSave() {
    if (email === currentEmail) {
      setEditing(false);
      return;
    }
    setStatus('saving');
    setError('');
    const result = await updateMemberEmailAction(userId, email, organizationId);
    if (result.success) {
      setStatus('saved');
      setEditing(false);
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
      setError(result.error ?? 'Failed to update');
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setEditing(true);
            setStatus('idle');
            setError('');
          }}
          className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          title="Edit email"
        >
          ✏️
        </button>
        {status === 'saved' && (
          <span className="text-xs text-green-600 dark:text-green-400">Updated!</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setEditing(false);
            setEmail(currentEmail);
          }
        }}
        autoFocus
        className="w-48 rounded border border-blue-400 px-2 py-0.5 text-xs text-gray-900 dark:bg-gray-700 dark:text-white dark:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={handleSave}
        disabled={status === 'saving'}
        className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'saving' ? '…' : 'Save'}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setEmail(currentEmail);
          setError('');
        }}
        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
      >
        Cancel
      </button>
      {status === 'error' && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
