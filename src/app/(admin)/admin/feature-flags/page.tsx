// ==================================================
// Platform Admin: Feature Flags Page
// ==================================================
// View and manage platform-wide feature flags.

import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import { getFeatureFlags } from '@/services/platform-admin-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feature Flags — Platform Admin',
};

export default async function FeatureFlagsPage() {
  await getPlatformAdminContext();
  const client = getAdminClient();

  const flags = await getFeatureFlags(client);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Feature Flags
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Control platform-wide feature rollouts
        </p>
      </div>

      {flags.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No feature flags configured. Feature flags can be added via database
            migration or admin API.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                    {flag.name}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      flag.is_enabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400'
                    }`}
                  >
                    {flag.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {flag.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {flag.description}
                  </p>
                )}
                {flag.allowed_organizations &&
                  flag.allowed_organizations.length > 0 && (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Scoped to {flag.allowed_organizations.length} organization
                      {flag.allowed_organizations.length !== 1 ? 's' : ''}
                    </p>
                  )}
              </div>
              <div className="flex-shrink-0">
                <div
                  className={`h-6 w-11 rounded-full ${
                    flag.is_enabled
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                      flag.is_enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
