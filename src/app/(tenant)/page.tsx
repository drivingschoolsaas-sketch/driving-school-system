import { getTenantPageData } from '@/lib/tenant';
import Link from 'next/link';

/**
 * Tenant home page — the public-facing landing page for a driving school.
 * Renders configurable sections based on school settings.
 */
export default async function HomePage() {
  const data = await getTenantPageData();

  if (!data) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-bold">Welcome to DriveFlow</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure your school to see your website here.
        </p>
      </div>
    );
  }

  const { organization, settings, lessonTypes, lessonPackages, instructors, serviceAreas } = data;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const sections = settings?.sections_enabled ?? [
    'hero',
    'lessons',
    'packages',
    'instructors',
    'areas',
    'contact',
  ];

  return (
    <>
      {/* Hero Section */}
      {sections.includes('hero') && (
        <section className="relative py-20 sm:py-32" style={{ backgroundColor: primaryColor }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              {settings?.hero_title ?? `Learn to Drive with ${organization.name}`}
            </h1>
            {settings?.hero_subtitle && (
              <p className="mt-6 text-lg text-white/90 max-w-2xl mx-auto">
                {settings.hero_subtitle}
              </p>
            )}
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/book"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold shadow-sm transition-colors hover:bg-gray-100"
                style={{ color: primaryColor }}
              >
                Book a Lesson
              </Link>
              <Link
                href="/lessons"
                className="rounded-lg border-2 border-white/50 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                View Lessons
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Lessons Preview */}
      {sections.includes('lessons') && lessonTypes.length > 0 && (
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Our Lessons
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Choose the right lesson for your experience level
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {lessonTypes.slice(0, 6).map((lt) => (
                <LessonTypeCard key={lt.id} lessonType={lt} primaryColor={primaryColor} />
              ))}
            </div>
            {lessonTypes.length > 6 && (
              <div className="mt-8 text-center">
                <Link
                  href="/lessons"
                  className="text-sm font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  View all lessons →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Packages Preview */}
      {sections.includes('packages') && lessonPackages.length > 0 && (
        <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Lesson Packages
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Save with our multi-lesson packages
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {lessonPackages.slice(0, 6).map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} primaryColor={primaryColor} />
              ))}
            </div>
            {lessonPackages.length > 6 && (
              <div className="mt-8 text-center">
                <Link
                  href="/packages"
                  className="text-sm font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  View all packages →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Instructors Preview */}
      {sections.includes('instructors') && instructors.length > 0 && (
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Meet Our Instructors
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Experienced, patient, and fully qualified
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {instructors.slice(0, 4).map((inst) => (
                <InstructorCard key={inst.id} instructor={inst} />
              ))}
            </div>
            {instructors.length > 4 && (
              <div className="mt-8 text-center">
                <Link
                  href="/instructors"
                  className="text-sm font-semibold hover:underline"
                  style={{ color: primaryColor }}
                >
                  View all instructors →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Service Areas */}
      {sections.includes('areas') && serviceAreas.length > 0 && (
        <section className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Service Areas
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                We provide driving lessons in these areas
              </p>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {serviceAreas.map((area) => (
                <span
                  key={area.id}
                  className="rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  {area.name}
                  {area.suburb && area.suburb !== area.name && ` · ${area.suburb}`}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact CTA */}
      {sections.includes('contact') && (
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Book your first lesson today or get in touch with any questions.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                href="/book"
                className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Book a Lesson
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

// --------------------------------------------------
// Card Components
// --------------------------------------------------

import type { LessonType, LessonPackage, Instructor } from '@/types/database';

function LessonTypeCard({
  lessonType,
  primaryColor,
}: {
  lessonType: LessonType;
  primaryColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {lessonType.name}
      </h3>
      {lessonType.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex-1">
          {lessonType.description}
        </p>
      )}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold" style={{ color: primaryColor }}>
            ${(lessonType.price_cents / 100).toFixed(0)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
            / {lessonType.duration_minutes} min
          </span>
        </div>
        <span className="text-xs uppercase text-gray-500 dark:text-gray-400">
          {lessonType.transmission}
        </span>
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  primaryColor,
}: {
  pkg: LessonPackage;
  primaryColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {pkg.name}
      </h3>
      {pkg.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex-1">
          {pkg.description}
        </p>
      )}
      <div className="mt-4">
        <span className="text-2xl font-bold" style={{ color: primaryColor }}>
          ${(pkg.price_cents / 100).toFixed(0)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
          {pkg.lesson_count} lesson{pkg.lesson_count !== 1 ? 's' : ''}
        </span>
      </div>
      {pkg.savings_cents > 0 && (
        <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
          Save ${(pkg.savings_cents / 100).toFixed(0)}
        </p>
      )}
    </div>
  );
}

function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
      {instructor.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
        <img
          src={instructor.photo_url}
          alt={instructor.display_name}
          className="mx-auto h-24 w-24 rounded-full object-cover"
        />
      ) : (
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
          <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
            {instructor.display_name.charAt(0)}
          </span>
        </div>
      )}
      <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
        {instructor.display_name}
      </h3>
      {instructor.bio && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
          {instructor.bio}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 capitalize">
        {instructor.transmission_type} · {instructor.default_lesson_duration} min
      </p>
    </div>
  );
}
