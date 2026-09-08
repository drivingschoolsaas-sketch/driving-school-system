import { getTenantData } from '@/lib/tenant';
import { createServerSupabaseClient } from '@/lib/database';
import type { LessonType, Instructor } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book a Lesson',
};

/**
 * Public booking page — allows visitors to see available
 * lesson types and instructors. The actual booking flow
 * (date/time selection, conflict checking, payment) will
 * be built in a later phase as an interactive client component.
 * This server page provides the data foundation.
 */
export default async function BookPage() {
  const data = await getTenantData();
  if (!data) return <PageNotConfigured />;

  const client = await createServerSupabaseClient();
  const orgId = data.organization.id;

  const [lessonTypesRes, instructorsRes] = await Promise.all([
    client
      .from('lesson_types')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_public', true)
      .order('sort_order'),
    client
      .from('instructors')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('display_name'),
  ]);

  const lessonTypes = (lessonTypesRes.data ?? []) as LessonType[];
  const instructors = (instructorsRes.data ?? []) as Instructor[];
  const primaryColor = data.settings?.primary_color ?? '#2563eb';
  const phone = data.settings?.contact_phone ?? data.organization.phone;

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Book a Lesson
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Choose your lesson type and preferred instructor to get started.
          </p>
        </div>

        <div className="mt-12 space-y-12">
          {/* Step 1: Choose Lesson Type */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              1. Choose a Lesson Type
            </h2>
            {lessonTypes.length === 0 ? (
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                No lessons available at this time.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {lessonTypes.map((lt) => (
                  <div
                    key={lt.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:ring-2 transition-all"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {lt.name}
                        </h3>
                        {lt.description && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {lt.description}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-lg font-bold whitespace-nowrap ml-4"
                        style={{ color: primaryColor }}
                      >
                        ${(lt.price_cents / 100).toFixed(0)}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{lt.duration_minutes} min</span>
                      <span>·</span>
                      <span className="capitalize">{lt.transmission}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Step 2: Choose Instructor */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              2. Choose an Instructor
            </h2>
            {instructors.length === 0 ? (
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                No instructors available at this time.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {instructors.map((inst) => (
                  <div
                    key={inst.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:ring-2 transition-all text-center"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  >
                    {inst.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
                      <img
                        src={inst.photo_url}
                        alt={inst.display_name}
                        className="mx-auto h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                          {inst.display_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {inst.display_name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {inst.transmission_type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Step 3: Date/Time Selection placeholder */}
          <section className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              3. Choose Date &amp; Time
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Interactive availability calendar coming soon.
            </p>
            {phone && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                In the meantime, call us at{' '}
                <a
                  href={`tel:${phone}`}
                  className="font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  {phone}
                </a>{' '}
                to book your lesson.
              </p>
            )}
          </section>
        </div>
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
