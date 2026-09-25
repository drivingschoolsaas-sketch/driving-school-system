'use client';

import { useState } from 'react';
import { resendInviteAction } from './actions';

export function ResendInviteButton({
  email,
  organizationId,
}: {
  email: string;
  organizationId: string;
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleResend() {
    setStatus('sending');
    setError('');
    const result = await resendInviteAction(email, organizationId);
    if (result.success) {
      setStatus('sent');
    } else {
      setStatus('error');
      setError(result.error ?? 'Failed to send');
    }
  }

  if (status === 'sent') {
    return (
      <span className="text-xs text-green-600 dark:text-green-400">
        Invite sent!
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleResend}
        disabled={status === 'sending'}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Resend Invite'}
      </button>
      {status === 'error' && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
