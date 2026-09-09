// ==================================================
// Add Domain Form (Client Component)
// ==================================================
// Modal form for platform admins to assign a domain
// hostname to an organization.

'use client';

import { useActionState, useState, useEffect } from 'react';
import { addDomainAction } from '../actions';

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

export function AddDomainForm({ organizations }: { organizations: OrgOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [domainType, setDomainType] = useState<string>('custom_root');

  const [state, formAction, isPending] = useActionState(addDomainAction, {
    success: false,
  });

  // Close modal on success
  useEffect(() => {
    if (state.success) {
      setIsOpen(false);
      setDomainType('custom_root');
    }
  }, [state.success]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <span>🌐</span>
        Add Domain
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Domain to Organization
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
              >
                ✕
              </button>
            </div>

            {state.error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {state.error}
              </div>
            )}

            <form action={formAction} className="space-y-4">
              {/* Organization Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organization *
                </label>
                <select
                  name="organizationId"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a school…</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Domain Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Domain Type *
                </label>
                <select
                  name="domainType"
                  value={domainType}
                  onChange={(e) => setDomainType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="custom_root">Custom Root Domain (e.g. myschool.com.au)</option>
                  <option value="custom_subdomain">Custom Subdomain (e.g. booking.myschool.com.au)</option>
                  <option value="platform_subdomain">Platform Subdomain (e.g. myschool.driveflow.com.au)</option>
                </select>
              </div>

              {/* Hostname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hostname *
                </label>
                <input
                  name="hostname"
                  type="text"
                  required
                  placeholder={
                    domainType === 'platform_subdomain'
                      ? 'myschool.driveflow.com.au'
                      : domainType === 'custom_subdomain'
                        ? 'booking.myschool.com.au'
                        : 'myschool.com.au'
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The full hostname without http:// or trailing slash.
                </p>
              </div>

              {/* Primary toggle */}
              <div className="flex items-center gap-3">
                <input
                  name="isPrimary"
                  type="checkbox"
                  value="true"
                  id="isPrimary"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label
                  htmlFor="isPrimary"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Set as primary domain (other domains will redirect here)
                </label>
              </div>

              {/* DNS Instructions */}
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                  📋 DNS Configuration Required
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  After adding, the school owner needs to point their domain's DNS
                  to the platform. For custom domains, add a CNAME record pointing
                  to <code className="font-mono bg-blue-100 px-1 rounded dark:bg-blue-800">driveflow.com.au</code> or
                  an A record to the platform IP.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Adding…' : 'Add Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
