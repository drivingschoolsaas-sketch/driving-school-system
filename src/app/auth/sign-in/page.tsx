'use client';

// ==================================================
// Sign In Page
// ==================================================

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInAction, type AuthActionResult } from '@/lib/auth/auth-actions';

const initialState: AuthActionResult = {};

function SignInForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') ?? '/';
  const message = searchParams.get('message');
  const [state, formAction, isPending] = useActionState(
    async (_prev: AuthActionResult, formData: FormData) => {
      return signInAction(formData);
    },
    initialState
  );

  return (
    <div className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-gray-900/5">
      <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">
        Sign in to your account
      </h2>

      {message === 'password_updated' && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Password updated successfully. Please sign in with your new password.
        </div>
      )}

      {message === 'confirmed' && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Email confirmed. You can now sign in.
        </div>
      )}

      {state.error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="returnTo" value={returnTo} />

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm">
        <p>
          <Link
            href="/auth/forgot-password"
            className="text-blue-600 hover:text-blue-500"
          >
            Forgot your password?
          </Link>
        </p>
        <p className="text-gray-600">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/sign-up"
            className="text-blue-600 hover:text-blue-500"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-gray-900/5">
          <div className="text-center text-sm text-gray-500">Loading…</div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
