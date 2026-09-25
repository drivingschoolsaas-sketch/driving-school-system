'use client';

import { useState } from 'react';
import { setMemberPasswordAction } from './actions';

export function SetPasswordButton({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!password) return;
    setStatus('saving');
    setError('');
    const result = await setMemberPasswordAction(userId, password, organizationId);
    if (result.success) {
      setStatus('saved');
      setEditing(false);
      setPassword('');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
      setError(result.error ?? 'Failed');
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
          className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
        >
          Set Password
        </button>
        {status === 'saved' && (
          <span className="text-xs text-green-600 dark:text-green-400">Password set!</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setEditing(false);
            setPassword('');
          }
        }}
        placeholder="New password (min 8 chars)"
        autoFocus
        className="w-48 rounded border border-orange-400 px-2 py-0.5 text-xs text-gray-900 dark:bg-gray-700 dark:text-white dark:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
      <button
        onClick={handleSave}
        disabled={status === 'saving' || password.length < 8}
        className="rounded bg-orange-600 px-2 py-0.5 text-xs text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {status === 'saving' ? '…' : 'Set'}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setPassword('');
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
