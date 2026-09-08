'use client';

// ==================================================
// Auth Error Page
// ==================================================
// Displays user-friendly error messages for auth failures.

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  EXCHANGE_FAILED: {
    title: 'Authentication failed',
    description: 'The sign-in link has expired or is invalid. Please try signing in again.',
  },
  UNEXPECTED_ERROR: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred during authentication. Please try again.',
  },
  TENANT_RESOLUTION_FAILED: {
    title: 'Domain not recognized',
    description: 'This domain is not associated with any driving school. Please check the URL.',
  },
  NOT_A_TENANT: {
    title: 'Not a school domain',
    description: 'This page is only available on a driving school domain.',
  },
  ACCESS_DENIED: {
    title: 'Access denied',
    description: 'You do not have an active membership in this organization. Contact the school administrator.',
  },
  INSUFFICIENT_ROLE: {
    title: 'Insufficient permissions',
    description: 'Your role does not have the required access level for this page.',
  },
  INSUFFICIENT_PERMISSION: {
    title: 'Permission denied',
    description: 'You do not have the required permission to access this resource.',
  },
};

const DEFAULT_ERROR = {
  title: 'Authentication error',
  description: 'An error occurred. Please try signing in again.',
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const errorInfo = ERROR_MESSAGES[code] ?? DEFAULT_ERROR;

  return (
    <div className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-gray-900/5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {errorInfo.title}
        </h2>
        <p className="mt-2 text-sm text-gray-600">{errorInfo.description}</p>
        <div className="mt-6 space-y-2">
          <Link
            href="/auth/sign-in"
            className="block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="block text-sm text-blue-600 hover:text-blue-500"
          >
            Go to home page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg bg-white p-8 shadow-sm ring-1 ring-gray-900/5">
          <div className="text-center text-sm text-gray-500">Loading…</div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
