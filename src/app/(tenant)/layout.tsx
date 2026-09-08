import { getTenantData } from '@/lib/tenant';
import type { Metadata } from 'next';
import Link from 'next/link';

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

  return (
    <div
      style={
        {
          '--brand-primary': primaryColor,
          '--brand-secondary': secondaryColor,
        } as React.CSSProperties
      }
    >
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo / Name */}
            <Link href="/" className="flex items-center gap-2">
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
            <div className="hidden md:flex items-center gap-6">
              <NavLinks sections={sections} />
              <Link
                href="/book"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                Book Now
              </Link>
            </div>

            {/* Mobile: phone + book CTA */}
            <div className="flex md:hidden items-center gap-3">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {phone}
                </a>
              )}
              <Link
                href="/book"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Book
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* About */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {schoolName}
              </h3>
              {settings?.about_text && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                  {settings.about_text}
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Quick Links
              </h3>
              <ul className="mt-2 space-y-2">
                <FooterLink href="/lessons">Lessons</FooterLink>
                <FooterLink href="/packages">Packages</FooterLink>
                <FooterLink href="/instructors">Our Instructors</FooterLink>
                <FooterLink href="/book">Book Online</FooterLink>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Contact
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {phone && (
                  <li>
                    <a href={`tel:${phone}`} className="hover:underline">
                      📞 {phone}
                    </a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="hover:underline">
                      ✉️ {email}
                    </a>
                  </li>
                )}
                {settings?.contact_address && (
                  <li>📍 {settings.contact_address}</li>
                )}
              </ul>
            </div>

            {/* Social */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Follow Us
              </h3>
              <div className="mt-2 flex gap-3">
                {settings?.social_facebook && (
                  <SocialLink href={settings.social_facebook} label="Facebook">
                    FB
                  </SocialLink>
                )}
                {settings?.social_instagram && (
                  <SocialLink href={settings.social_instagram} label="Instagram">
                    IG
                  </SocialLink>
                )}
                {settings?.social_tiktok && (
                  <SocialLink href={settings.social_tiktok} label="TikTok">
                    TK
                  </SocialLink>
                )}
                {settings?.social_google_review && (
                  <SocialLink
                    href={settings.social_google_review}
                    label="Google Reviews"
                  >
                    G
                  </SocialLink>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-xs text-gray-500 dark:text-gray-500">
            © {new Date().getFullYear()} {schoolName}. All rights reserved.
            <span className="mx-2">·</span>
            Powered by DriveFlow
          </div>
        </div>
      </footer>
    </div>
  );
}

// --------------------------------------------------
// Sub-components
// --------------------------------------------------

function NavLinks({ sections }: { sections: string[] }) {
  const links: Array<{ href: string; label: string; section: string }> = [
    { href: '/lessons', label: 'Lessons', section: 'lessons' },
    { href: '/packages', label: 'Packages', section: 'packages' },
    { href: '/instructors', label: 'Instructors', section: 'instructors' },
    { href: '/reviews', label: 'Reviews', section: 'reviews' },
    { href: '/success-stories', label: 'Success Stories', section: 'success_stories' },
    { href: '/areas', label: 'Areas', section: 'areas' },
    { href: '/contact', label: 'Contact', section: 'contact' },
  ];

  return (
    <>
      {links
        .filter((l) => sections.includes(l.section))
        .map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
          >
            {l.label}
          </Link>
        ))}
    </>
  );
}

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
        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
    >
      {children}
    </a>
  );
}
