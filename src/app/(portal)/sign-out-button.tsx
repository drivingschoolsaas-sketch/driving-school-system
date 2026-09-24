'use client';

import { useTransition } from 'react';
import { signOutAction } from '@/lib/auth/auth-actions';

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => signOutAction())}
      className="text-xs text-white/70 hover:text-white transition-colors disabled:opacity-50"
    >
      {isPending ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
