import { getTenantData } from '@/lib/tenant';
import { createServerSupabaseClient } from '@/lib/database';
import type { LessonType } from '@/types/database';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Lessons',
};

export default async function LessonsPage() {
  const data = await getTenantData();
  if (!data) return <PageNotConfigured />;

  const client = await createServerSupabaseClient();
  const { data: lessonTypes } = await client
    .from('lesson_types')
    .select('*')
    .eq('organization_id', data.organization.id)
    .eq('status', 'active')
    .eq('is_public', true)
    .order('sort_order')
    .order('name');

  const lessons = (lessonTypes ?? []) as LessonType[];
  const primaryColor = data.settings?.primary_color ?? '#2563eb';

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Our Lessons
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Choose the lesson type that suits your needs and experience level.
          </p>
        </div>

        {lessons.length === 0 ? (
          <p className="mt-12 text-center text-gray-500 dark:text-gray-400">
            Lesson information coming soon.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lt) => (
              <div
                key={lt.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex flex-col hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {lt.name}
                </h2>
                {lt.description && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex-1">
                    {lt.description}
                  </p>
                )}
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <span
                      className="text-3xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      ${(lt.price_cents / 100).toFixed(0)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                      / {lt.duration_minutes} min
                    </span>
                  </div>
                  <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs capitalize text-gray-600 dark:text-gray-400">
                    {lt.transmission}
                  </span>
                </div>
                <Link
                  href="/book"
                  className="mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  Book This Lesson
                </Link>
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
      <p className="text-gray-500 dark:text-gray-400">
        This page is not available.
      </p>
    </div>
  );
}
