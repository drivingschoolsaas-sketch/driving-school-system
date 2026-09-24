import { getTenantData } from '@/lib/tenant';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact',
};

export default async function ContactPage() {
  const data = await getTenantData();
  if (!data) return <PageNotConfigured />;

  const { organization, settings } = data;
  const phone = settings?.contact_phone ?? organization.phone;
  const email = settings?.contact_email ?? organization.email;
  const address = settings?.contact_address;
  const primaryColor = settings?.primary_color ?? '#2563eb';

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Get in touch with {organization.name} — we&apos;d love to hear from you.
          </p>
        </div>

        <div className="mt-12 mx-auto max-w-2xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {/* Phone */}
            {phone && (
              <ContactCard
                icon="📞"
                title="Phone"
                content={phone}
                href={`tel:${phone}`}
                action="Call Now"
              />
            )}

            {/* Email */}
            {email && (
              <ContactCard
                icon="✉️"
                title="Email"
                content={email}
                href={`mailto:${email}`}
                action="Send Email"
              />
            )}

            {/* Address */}
            {address && (
              <ContactCard icon="📍" title="Address" content={address} />
            )}

            {/* Hours */}
            <ContactCard
              icon="🕐"
              title="Business Hours"
              content="Contact us for our current hours"
            />
          </div>

          {/* Social Links */}
          {(settings?.social_facebook ||
            settings?.social_instagram ||
            settings?.social_tiktok ||
            settings?.social_google_review) && (
            <div className="mt-12 text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Follow Us
              </h2>
              <div className="mt-4 flex justify-center gap-4">
                {settings?.social_facebook && (
                  <SocialButton href={settings.social_facebook} label="Facebook" primaryColor={primaryColor} />
                )}
                {settings?.social_instagram && (
                  <SocialButton href={settings.social_instagram} label="Instagram" primaryColor={primaryColor} />
                )}
                {settings?.social_tiktok && (
                  <SocialButton href={settings.social_tiktok} label="TikTok" primaryColor={primaryColor} />
                )}
                {settings?.social_google_review && (
                  <SocialButton
                    href={settings.social_google_review}
                    label="Google Reviews"
                    primaryColor={primaryColor}
                  />
                )}
              </div>
            </div>
          )}

          {/* Book CTA */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Ready to book your first lesson?
            </p>
            <Link
              href="/book"
              className="mt-4 inline-block rounded-lg px-8 py-3 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Book Online
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  icon,
  title,
  content,
  href,
  action,
}: {
  icon: string;
  title: string;
  content: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
      <span className="text-3xl">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{content}</p>
      {href && action && (
        <a
          href={href}
          className="mt-3 inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          {action} →
        </a>
      )}
    </div>
  );
}

function SocialButton({
  href,
  label,
  primaryColor,
}: {
  href: string;
  label: string;
  primaryColor: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
      style={{ borderColor: primaryColor, color: primaryColor }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = primaryColor;
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = primaryColor;
      }}
    >
      {label}
    </a>
  );
}

function PageNotConfigured() {
  return (
    <div className="py-24 text-center">
      <p className="text-gray-500 dark:text-gray-400">This page is not available.</p>
    </div>
  );
}
