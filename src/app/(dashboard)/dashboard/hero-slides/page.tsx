// ==================================================
// Dashboard: Hero Slides Page
// ==================================================
// Manage the landing page image carousel.
// Upload, edit, reorder, and toggle hero slides.

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { PERMISSIONS } from '@/permissions/roles';
import { getHeroSlides } from '@/services/hero-slide-service';
import { SlideManager } from './slide-manager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hero Slides',
};

export default async function HeroSlidesPage() {
  const { auth, settings } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.ORG_MANAGE_BRANDING);
  const primaryColor = settings?.primary_color ?? '#2563eb';

  const client = await createServerSupabaseClient();
  const slides = await getHeroSlides(client, auth.organizationId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Hero Slides
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage the image carousel on your landing page. Active slides auto-rotate for visitors.
        </p>
      </div>

      <SlideManager
        slides={slides.map((s) => ({
          id: s.id,
          image_url: s.image_url,
          title: s.title,
          subtitle: s.subtitle,
          link_url: s.link_url,
          link_text: s.link_text,
          sort_order: s.sort_order,
          is_active: s.is_active,
        }))}
        primaryColor={primaryColor}
      />
    </div>
  );
}
