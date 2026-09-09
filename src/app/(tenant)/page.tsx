import { getTenantPageData } from '@/lib/tenant';
import Link from 'next/link';
import type { LessonType, LessonPackage, Instructor, Review } from '@/types/database';
import { TestimonialCarousel } from './components/testimonial-carousel';
import { FAQAccordion } from './components/faq-accordion';

/**
 * Tenant home page — the public-facing landing page for a driving school.
 * Professional, student-friendly design inspired by top driving school websites.
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

  const { organization, settings, lessonTypes, lessonPackages, instructors, serviceAreas, reviews } = data;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const schoolName = organization.name;
  const sections = settings?.sections_enabled ?? [
    'hero',
    'lessons',
    'packages',
    'instructors',
    'areas',
    'reviews',
    'contact',
  ];

  return (
    <div className="tenant-home">
      {/* ========== HERO SECTION ========== */}
      {sections.includes('hero') && (
        <section
          className="relative overflow-hidden py-24 sm:py-32 lg:py-40"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${settings?.secondary_color ?? '#1e40af'} 100%)`,
          }}
        >
          {/* Decorative shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
            <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />
            <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/5" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white uppercase leading-tight">
              {settings?.hero_title ?? (
                <>
                  Develop Your Skills Today
                  <span className="block mt-2 text-white/90">Hit the Road Tomorrow</span>
                </>
              )}
            </h1>
            {settings?.hero_subtitle && (
              <p className="mt-6 text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
                {settings.hero_subtitle}
              </p>
            )}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="w-full sm:w-auto rounded-lg bg-white px-8 py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl hover:scale-105"
                style={{ color: primaryColor }}
              >
                Book a Lesson
              </Link>
              <Link
                href="/lessons"
                className="w-full sm:w-auto rounded-lg border-2 border-white/60 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-all"
              >
                View Our Lessons
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ========== VALUE PROPOSITIONS STRIP ========== */}
      <section className="relative -mt-6 z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-xl grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-700">
          {[
            { icon: '🎓', title: 'Qualified Instructors', desc: 'Fully licensed & experienced' },
            { icon: '🚗', title: 'Dual Control Cars', desc: 'Learn safely with confidence' },
            { icon: '📅', title: 'Flexible Scheduling', desc: '7 days a week availability' },
            { icon: '⭐', title: 'High Pass Rate', desc: 'Proven track record' },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center py-6 px-4 text-center">
              <span className="text-3xl mb-2">{item.icon}</span>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== WHY CHOOSE US ========== */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <span
                className="inline-block text-sm font-bold uppercase tracking-widest mb-4"
                style={{ color: primaryColor }}
              >
                About Us
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
                Why Choose {schoolName}?
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {settings?.about_text ??
                  `At ${schoolName}, we're dedicated to helping you become a safe, confident driver. Our qualified instructors provide personalized lessons tailored to your skill level and learning pace.`}
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Patient, friendly instructors who work at your pace',
                  'Modern dual-control vehicles for maximum safety',
                  'Tailored lesson plans for beginners to advanced drivers',
                  'Local area expertise — we know the test routes',
                  'Competitive pricing with no hidden costs',
                  'Flexible pickup locations across our service areas',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 mt-0.5 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      style={{ color: primaryColor }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  Start Your Journey
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
            {/* Feature grid on the right */}
            <div className="mt-12 lg:mt-0 grid grid-cols-2 gap-4">
              {[
                { icon: '🏆', title: 'Professional Lessons', desc: 'Structured curriculum designed for success' },
                { icon: '🛡️', title: 'Learn Safely', desc: '5-star safety rated dual control vehicles' },
                { icon: '💰', title: 'Affordable Prices', desc: 'Great value packages and lesson bundles' },
                { icon: '📍', title: 'Local Expertise', desc: 'We know the test routes inside and out' },
                { icon: '⏰', title: 'Flexible Hours', desc: 'Morning, afternoon & weekend slots' },
                { icon: '🎯', title: 'Test Preparation', desc: 'Dedicated test-day ready programs' },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-5 text-center hover:shadow-md transition-shadow"
                >
                  <span className="text-3xl block mb-3">{feat.icon}</span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{feat.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== LESSONS ========== */}
      {sections.includes('lessons') && lessonTypes.length > 0 && (
        <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span
                className="inline-block text-sm font-bold uppercase tracking-widest mb-2"
                style={{ color: primaryColor }}
              >
                What We Offer
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                Our Driving Lessons
              </h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Choose the right lesson type for your experience level and goals
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {lessonTypes.slice(0, 6).map((lt) => (
                <LessonTypeCard key={lt.id} lessonType={lt} primaryColor={primaryColor} />
              ))}
            </div>
            {lessonTypes.length > 6 && (
              <div className="mt-10 text-center">
                <Link
                  href="/lessons"
                  className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
                  style={{ color: primaryColor }}
                >
                  View all lessons
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========== PACKAGES ========== */}
      {sections.includes('packages') && lessonPackages.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span
                className="inline-block text-sm font-bold uppercase tracking-widest mb-2"
                style={{ color: primaryColor }}
              >
                Save More
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                Lesson Packages
              </h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Bundle your lessons and save — the more you book, the more you save
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {lessonPackages.slice(0, 6).map((pkg, i) => (
                <PackageCard key={pkg.id} pkg={pkg} primaryColor={primaryColor} popular={i === 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== INSTRUCTORS ========== */}
      {sections.includes('instructors') && instructors.length > 0 && (
        <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span
                className="inline-block text-sm font-bold uppercase tracking-widest mb-2"
                style={{ color: primaryColor }}
              >
                Our Team
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                Meet Our Instructors
              </h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Experienced, patient, and dedicated to helping you succeed
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {instructors.slice(0, 6).map((inst) => (
                <InstructorCard key={inst.id} instructor={inst} primaryColor={primaryColor} />
              ))}
            </div>
            {instructors.length > 6 && (
              <div className="mt-10 text-center">
                <Link
                  href="/instructors"
                  className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
                  style={{ color: primaryColor }}
                >
                  View all instructors
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========== TESTIMONIALS ========== */}
      {reviews.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span
                className="inline-block text-sm font-bold uppercase tracking-widest mb-2"
                style={{ color: primaryColor }}
              >
                Testimonials
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                What Our Students Say
              </h2>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-xl text-yellow-400">★</span>
                  ))}
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            <TestimonialCarousel reviews={reviews} primaryColor={primaryColor} />

            <div className="mt-10 text-center">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
                style={{ color: primaryColor }}
              >
                Read all reviews
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ========== SERVICE AREAS ========== */}
      {sections.includes('areas') && serviceAreas.length > 0 && (
        <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span
                className="inline-block text-sm font-bold uppercase tracking-widest mb-2"
                style={{ color: primaryColor }}
              >
                Coverage
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
                Areas We Serve
              </h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Convenient pickup from locations across our service areas
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {serviceAreas.map((area) => (
                <div
                  key={area.id}
                  className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-4 text-center hover:shadow-md transition-shadow group"
                >
                  <svg
                    className="w-5 h-5 mx-auto mb-2 text-gray-400 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: primaryColor }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {area.name}
                  </span>
                  {area.suburb && area.suburb !== area.name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{area.suburb}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========== FAQ ========== */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span
              className="inline-block text-sm font-bold uppercase tracking-widest mb-2"
              style={{ color: primaryColor }}
            >
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <FAQAccordion
            primaryColor={primaryColor}
            faqs={[
              {
                q: 'What do I need to bring to my first lesson?',
                a: "You'll need your learner's permit/licence and wear comfortable clothes and enclosed shoes. We provide everything else!",
              },
              {
                q: 'Do you offer automatic and manual lessons?',
                a: 'Yes! We offer lessons in both automatic and manual vehicles. Choose what suits you best when booking.',
              },
              {
                q: 'How long is each driving lesson?',
                a: 'Our standard lesson is 60 minutes, but we also offer 90-minute and 2-hour sessions. Longer lessons allow more time for practice and are great value.',
              },
              {
                q: 'Do you cover the local test routes?',
                a: 'Absolutely! Our instructors are experts in the local area and will familiarize you with the test routes, common hazards, and what the examiner looks for.',
              },
              {
                q: 'What safety measures are in place?',
                a: 'All our vehicles are fitted with dual controls (brake and accelerator), are fully insured, and have a 5-star safety rating. Your safety is our top priority.',
              },
              {
                q: 'Can I cancel or reschedule a lesson?',
                a: `Yes — we ask for at least ${settings?.cancellation_notice_hours ?? 24} hours' notice to cancel or reschedule without charge.`,
              },
            ]}
          />
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      {sections.includes('contact') && (
        <section
          className="py-20 sm:py-28"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${settings?.secondary_color ?? '#1e40af'} 100%)`,
          }}
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Ready to Start Your Driving Journey?
            </h2>
            <p className="mt-4 text-lg text-white/85 max-w-xl mx-auto">
              Book your first lesson today. Our friendly instructors are ready to help you become a confident, safe driver.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/book"
                className="w-full sm:w-auto rounded-lg bg-white px-8 py-4 text-base font-bold shadow-lg transition-all hover:shadow-xl hover:scale-105"
                style={{ color: primaryColor }}
              >
                Book a Lesson Now
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto rounded-lg border-2 border-white/60 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-all"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Scroll-reveal animation styles */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tenant-home section {
          animation: fadeInUp 0.6s ease-out both;
        }
      `}</style>
    </div>
  );
}

// --------------------------------------------------
// Card Components
// --------------------------------------------------

function LessonTypeCard({
  lessonType,
  primaryColor,
}: {
  lessonType: LessonType;
  primaryColor: string;
}) {
  return (
    <div className="group rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 flex flex-col hover:shadow-lg transition-all hover:-translate-y-1"
      style={{ borderLeftWidth: '4px', borderLeftColor: primaryColor }}
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        {lessonType.name}
      </h3>
      {lessonType.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex-1 leading-relaxed">
          {lessonType.description}
        </p>
      )}
      <div className="mt-5 flex items-end justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div>
          <span className="text-3xl font-extrabold" style={{ color: primaryColor }}>
            ${(lessonType.price_cents / 100).toFixed(0)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
            / {lessonType.duration_minutes} min
          </span>
        </div>
        <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
          {lessonType.transmission}
        </span>
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  primaryColor,
  popular,
}: {
  pkg: LessonPackage;
  primaryColor: string;
  popular?: boolean;
}) {
  return (
    <div
      className={`group relative rounded-xl p-6 flex flex-col hover:shadow-lg transition-all hover:-translate-y-1 ${
        popular
          ? 'bg-white dark:bg-gray-800 border-2 shadow-md'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      }`}
      style={popular ? { borderColor: primaryColor } : undefined}
    >
      {popular && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white uppercase tracking-wider"
          style={{ backgroundColor: primaryColor }}
        >
          Most Popular
        </span>
      )}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
        {pkg.name}
      </h3>
      {pkg.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex-1 leading-relaxed">
          {pkg.description}
        </p>
      )}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold" style={{ color: primaryColor }}>
            ${(pkg.price_cents / 100).toFixed(0)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {pkg.lesson_count} lesson{pkg.lesson_count !== 1 ? 's' : ''}
          </span>
        </div>
        {pkg.savings_cents > 0 && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Save ${(pkg.savings_cents / 100).toFixed(0)}
          </p>
        )}
      </div>
    </div>
  );
}

function InstructorCard({
  instructor,
  primaryColor,
}: {
  instructor: Instructor;
  primaryColor: string;
}) {
  return (
    <div className="group rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
      {/* Photo area */}
      <div
        className="h-48 flex items-center justify-center"
        style={{ backgroundColor: `${primaryColor}15` }}
      >
        {instructor.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
          <img
            src={instructor.photo_url}
            alt={instructor.display_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full text-white text-3xl font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {instructor.display_name.charAt(0)}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-5 text-center">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {instructor.display_name}
        </h3>
        {instructor.bio && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {instructor.bio}
          </p>
        )}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 font-medium capitalize">
            {instructor.transmission_type}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 font-medium">
            {instructor.default_lesson_duration} min
          </span>
        </div>
      </div>
    </div>
  );
}
