// ==================================================
// Tenant Public Success Stories Page
// ==================================================
// Displays published success stories with consent.
// Only stories with consent_given=true and
// status='published' appear here.

import { getTenantData } from '@/lib/tenant';
import { createServerSupabaseClient } from '@/lib/database';
import { getPublicSuccessStories } from '@/services/success-story-service';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTenantData();
  if (!data) return { title: 'Success Stories' };
  return { title: `Success Stories | ${data.organization.name}` };
}

export default async function SuccessStoriesPage() {
  const data = await getTenantData();

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-500">Site not found.</p>
      </div>
    );
  }

  const { organization, settings } = data;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const client = await createServerSupabaseClient();
  const stories = await getPublicSuccessStories(client, organization.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🎉 Success Stories
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Congratulations to our students who have passed their driving tests!
        </p>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">
            No success stories yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              primaryColor={primaryColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// Sub-components
// --------------------------------------------------

function StoryCard({
  story,
  primaryColor,
}: {
  story: {
    id: string;
    student_name: string;
    photo_url: string | null;
    test_location: string | null;
    pass_date: string | null;
    message: string | null;
  };
  primaryColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
      {/* Photo or placeholder */}
      {story.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
        <img
          src={story.photo_url}
          alt={story.student_name}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div
          className="w-full h-32 flex items-center justify-center text-4xl"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          🏆
        </div>
      )}

      <div className="p-5">
        {/* Name */}
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {story.student_name}
        </h3>

        {/* Details */}
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          {story.pass_date && (
            <span>
              📅 Passed{' '}
              {new Date(story.pass_date + 'T00:00:00').toLocaleDateString(
                undefined,
                { year: 'numeric', month: 'short', day: 'numeric' }
              )}
            </span>
          )}
          {story.test_location && <span>📍 {story.test_location}</span>}
        </div>

        {/* Message */}
        {story.message && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            &ldquo;{story.message}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
