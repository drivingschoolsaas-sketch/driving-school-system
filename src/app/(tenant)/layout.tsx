import { getTenantData } from '@/lib/tenant';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MobileMenu } from './components/mobile-menu';

/**
 * Dynamic metadata for tenant websites — uses school branding.
 */
export async function generateMetadata(): Promise<Metadata> {
  const data = await getTenantData();
  if (!data) {
    return { title: 'DriveFlow' };
  }

  const { organization, settings } = data;
  const title = settings?.meta_title ?? organization.name;
  const description =
    settings?.meta_description ??
    `${organization.name} — Learn to drive with confidence.`;

  return {
    title: {
      default: title,
      template: `%s | ${organization.name}`,
    },
    description,
  };
}

/**
 * Tenant website layout — public-facing pages with branded header/footer.
 * Renders dynamic brand colours via CSS custom properties.
 */
export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getTenantData();

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Site Not Found
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This domain is not configured for any driving school.
          </p>
        </div>
      </div>
    );
  }

  const { organization, settings } = data;
  const primaryColor = settings?.primary_color ?? '#2563eb';
  const secondaryColor = settings?.secondary_color ?? '#1e40af';
  const schoolName = organization.name;
  const phone = settings?.contact_phone ?? organization.phone;
  const email = settings?.contact_email ?? organization.email;
  const sections = settings?.sections_enabled ?? [
    'hero',
    'lessons',
    'packages',
    'instructors',
    'contact',
  ];

  const navLinks = [
    { href: '/lessons', label: 'Lessons', section: 'lessons' },
    { href: '/packages', label: 'Packages', section: 'packages' },
    { href: '/instructors', label: 'Instructors', section: 'instructors' },
    { href: '/reviews', label: 'Reviews', section: 'reviews' },
    { href: '/success-stories', label: 'Success Stories', section: 'success_stories' },
    { href: '/areas', label: 'Areas', section: 'areas' },
    { href: '/contact', label: 'Contact', section: 'contact' },
  ].filter((l) => sections.includes(l.section));

  return (
    <div
      className="min-h-screen flex flex-col"
      style={
        {
          '--brand-primary': primaryColor,
          '--brand-secondary': secondaryColor,
        } as React.CSSProperties
      }
    >
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo / Name */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              {settings?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
                <img
                  src={settings.logo_url}
                  alt={schoolName}
                  className="h-8 w-auto"
                />
              )}
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {schoolName}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {phone}
                </a>
              )}
              <Link
                href="/portal"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/book"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                Book Now
              </Link>
            </div>

            {/* Mobile: hamburger menu */}
            <div className="flex lg:hidden items-center gap-3">
              <Link
                href="/book"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Book Now
              </Link>
              <MobileMenu
                links={navLinks}
                phone={phone}
                email={email}
                primaryColor={primaryColor}
              />
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* About */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                {schoolName}
              </h3>
              {settings?.about_text && (
                <p className="mt-3 text-sm text-gray-400 leading-relaxed line-clamp-4">
                  {settings.about_text}
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Quick Links
              </h3>
              <ul className="mt-3 space-y-2">
                <FooterLink href="/lessons">Lessons</FooterLink>
                <FooterLink href="/packages">Packages</FooterLink>
                <FooterLink href="/instructors">Our Instructors</FooterLink>
                <FooterLink href="/reviews">Reviews</FooterLink>
                <FooterLink href="/book">Book Online</FooterLink>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Contact
              </h3>
              <ul className="mt-3 space-y-3 text-sm text-gray-400">
                {phone && (
                  <li>
                    <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-white transition-colors">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {phone}
                    </a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {email}
                    </a>
                  </li>
                )}
                {settings?.contact_address && (
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {settings.contact_address}
                  </li>
                )}
              </ul>
            </div>

            {/* Social — only render when at least one link exists */}
            {(settings?.social_facebook || settings?.social_instagram || settings?.social_tiktok || settings?.social_google_review) && (
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Follow Us
                </h3>
                <div className="mt-3 flex gap-3">
                  {settings?.social_facebook && (
                    <SocialLink href={settings.social_facebook} label="Facebook">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </SocialLink>
                  )}
                  {settings?.social_instagram && (
                    <SocialLink href={settings.social_instagram} label="Instagram">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </SocialLink>
                  )}
                  {settings?.social_tiktok && (
                    <SocialLink href={settings.social_tiktok} label="TikTok">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                    </SocialLink>
                  )}
                  {settings?.social_google_review && (
                    <SocialLink href={settings.social_google_review} label="Google Reviews">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    </SocialLink>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 border-t border-gray-800 pt-8 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} {schoolName}. All rights reserved.
            <span className="mx-2">·</span>
            Powered by{' '}
            <span className="font-medium text-gray-400">DriveFlow</span>
          </div>
        </div>
      </footer>

      {/* Sticky Bottom CTA Bar (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between px-2 py-2">
          {email && (
            <a
              href={`mailto:${email}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Us
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-center w-12 h-12 rounded-full text-white mx-2 shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
              aria-label="Call us"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>
          )}
          <Link
            href="/book"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book Now
          </Link>
        </div>
      </div>

      {/* Bottom padding for sticky CTA bar on mobile */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}

// --------------------------------------------------
// Sub-components
// --------------------------------------------------

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
    >
      {children}
    </a>
  );
}
