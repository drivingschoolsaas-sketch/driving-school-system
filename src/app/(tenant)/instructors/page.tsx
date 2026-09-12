import { getTenantData } from '@/lib/tenant';
import { getAdminClient } from '@/lib/database/supabase-admin';
import type { Instructor } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instructors',
};

export default async function InstructorsPage() {
  const data = await getTenantData();
  if (!data) return <PageNotConfigured />;

  const client = getAdminClient();
  const { data: instructorsData } = await client
    .from('instructors')
    .select('*')
    .eq('organization_id', data.organization.id)
    .eq('is_active', true)
    .order('display_name');

  const instructors = (instructorsData ?? []) as Instructor[];

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Our Instructors
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Our team of experienced, patient, and fully qualified driving instructors.
          </p>
        </div>

        {instructors.length === 0 ? (
          <p className="mt-12 text-center text-gray-500 dark:text-gray-400">
            Instructor profiles coming soon.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.map((inst) => (
              <div
                key={inst.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center hover:shadow-lg transition-shadow"
              >
                {inst.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
                  <img
                    src={inst.photo_url}
                    alt={inst.display_name}
                    className="mx-auto h-32 w-32 rounded-full object-cover"
                  />
                ) : (
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                    <span className="text-4xl font-bold text-gray-500 dark:text-gray-400">
                      {inst.display_name.charAt(0)}
                    </span>
                  </div>
                )}
                <h2 className="mt-6 text-lg font-semibold text-gray-900 dark:text-white">
                  {inst.display_name}
                </h2>
                {inst.bio && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    {inst.bio}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 capitalize">
                    {inst.transmission_type}
                  </span>
                  <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1">
                    {inst.default_lesson_duration} min lessons
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageNotConfigured() {
  return (
    <div className="py-24 text-center">
      <p className="text-gray-500 dark:text-gray-400">This page is not available.</p>
    </div>
  );
}
