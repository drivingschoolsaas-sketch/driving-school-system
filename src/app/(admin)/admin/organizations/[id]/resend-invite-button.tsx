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
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'link' | 'error'>('idle');
  const [error, setError] = useState('');
  const [recoveryLink, setRecoveryLink] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleResend() {
    setStatus('sending');
    setError('');
    setRecoveryLink('');
    const result = await resendInviteAction(email, organizationId);
    if (result.success) {
      if (result.recoveryLink) {
        setRecoveryLink(result.recoveryLink);
        setStatus('link');
      } else {
        setStatus('sent');
      }
    } else {
      setStatus('error');
      setError(result.error ?? 'Failed to send');
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(recoveryLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
    }
  }

  if (status === 'sent') {
    return (
      <span className="text-xs text-green-600 dark:text-green-400">
        Invite sent!
      </span>
    );
  }

  if (status === 'link') {
    return (
      <div className="space-y-1">
        <p className="text-xs text-green-600 dark:text-green-400">
          Recovery link generated! Share it with the user:
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={recoveryLink}
            className="w-64 rounded border border-gray-300 px-2 py-1 text-xs font-mono text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 select-all"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={handleCopy}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
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
