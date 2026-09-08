// ==================================================
// Dashboard: Success Stories Management Page
// ==================================================
// Admins manage success stories with consent tracking.
// Stories require explicit consent before publishing.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getSuccessStories } from '@/services/success-story-service';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  published: {
    label: 'Published',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  archived: {
    label: 'Archived',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
};

export default async function SuccessStoriesAdminPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { auth } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.SUCCESS_STORY_MANAGE);

  const client = await createServerSupabaseClient();
  const statusFilter = searchParams.status;
  const stories = await getSuccessStories(client, auth, {
    status: statusFilter,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Success Stories
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Celebrate students who have passed their driving test.
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: undefined, label: 'All' },
          { value: 'draft', label: 'Drafts' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' },
        ].map((filter) => {
          const isActive =
            filter.value === statusFilter ||
            (!filter.value && !statusFilter);
          return (
            <a
              key={filter.label}
              href={
                filter.value
                  ? `/dashboard/success-stories?status=${filter.value}`
                  : '/dashboard/success-stories'
              }
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </a>
          );
        })}
      </div>

      {/* Stories */}
      {stories.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {statusFilter
              ? `No ${statusFilter} success stories found.`
              : 'No success stories yet. Add one to celebrate a student!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => {
            const statusInfo = STATUS_CONFIG[story.status] ?? {
              label: story.status,
              className: 'bg-gray-100 text-gray-800',
            };

            return (
              <div
                key={story.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
              >
                {/* Photo or placeholder */}
                {story.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
                  <img
                    src={story.photo_url}
                    alt={story.student_name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-20 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center text-3xl">
                    🏆
                  </div>
                )}

                <div className="p-4">
                  {/* Name + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {story.student_name}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {story.pass_date && (
                      <p>
                        📅 Passed{' '}
                        {new Date(
                          story.pass_date + 'T00:00:00'
                        ).toLocaleDateString()}
                      </p>
                    )}
                    {story.test_location && (
                      <p>📍 {story.test_location}</p>
                    )}
                  </div>

                  {/* Message preview */}
                  {story.message && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      &ldquo;{story.message}&rdquo;
                    </p>
                  )}

                  {/* Consent indicator */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {story.consent_given ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        ✓ Consent recorded
                        {story.consent_method && (
                          <span className="text-gray-400 dark:text-gray-500">
                            ({story.consent_method})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                        ⚠ No consent recorded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
