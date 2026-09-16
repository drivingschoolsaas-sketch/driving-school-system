// ==================================================
// Tenant Data Fetcher
// ==================================================
// Server-side helper that resolves the current tenant
// from the request hostname and loads public data
// needed by the tenant website pages.

import 'server-only';
import { headers } from 'next/headers';
import type { Organization, SchoolSettings, LessonType, LessonPackage, Instructor, ServiceArea, Review, HeroSlide, SuccessStory } from '@/types/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { resolveHostname, resolveTenantBySlug } from './resolve-hostname';
import { getServerEnv } from '@/config/env';
import { logger } from '@/lib/logging';

export interface TenantData {
  organization: Organization;
  settings: SchoolSettings | null;
}

export interface TenantPageData extends TenantData {
  lessonTypes: LessonType[];
  lessonPackages: LessonPackage[];
  instructors: Instructor[];
  serviceAreas: ServiceArea[];
  reviews: Review[];
  heroSlides: HeroSlide[];
  successStories: SuccessStory[];
}

/**
 * Resolve tenant context from the current request headers.
 * Returns organization and settings data for the public website.
 * Returns null if no tenant can be resolved (platform pages, errors).
 */
export async function getTenantData(): Promise<TenantData | null> {
  try {
    const env = getServerEnv();
    const headerStore = await headers();
    const hostname = headerStore.get('host') ?? 'localhost';

    // Use admin client for public tenant resolution — RLS blocks
    // unauthenticated reads on organizations/settings tables, but
    // public website visitors are never authenticated.
    const adminClient = getAdminClient();

    // Check for ?tenant= query parameter override (set by middleware).
    // This allows testing tenant sites on Vercel where wildcard
    // subdomains aren't available on .vercel.app domains.
    const tenantOverride = headerStore.get('x-tenant-override');
    if (tenantOverride) {
      try {
        const resolved = await resolveTenantBySlug(adminClient, tenantOverride, hostname);
        if (resolved.kind === 'tenant') {
          const orgId = resolved.tenant.organizationId;
          const { data: org } = await adminClient
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();
          if (!org) return null;
          const { data: settings } = await adminClient
            .from('school_settings')
            .select('*')
            .eq('organization_id', orgId)
            .maybeSingle();
          return {
            organization: org as Organization,
            settings: settings ? (settings as SchoolSettings) : null,
          };
        }
      } catch {
        // Fall through to normal hostname resolution
        logger.debug('Tenant override slug not found, falling back to hostname', {
          feature: 'tenant',
          operation: 'get_tenant_data',
          tenantOverride,
        });
      }
    }

    const resolved = await resolveHostname(hostname, {
      platformDomain: env.NEXT_PUBLIC_PLATFORM_DOMAIN,
      adminSubdomain: env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN,
    }, adminClient);

    if (resolved.kind !== 'tenant') {
      return null;
    }

    const orgId = resolved.tenant.organizationId;

    // Load organization
    const { data: org } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (!org) return null;

    // Load settings
    const { data: settings } = await adminClient
      .from('school_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    return {
      organization: org as Organization,
      settings: settings ? (settings as SchoolSettings) : null,
    };
  } catch (error) {
    logger.error('Failed to get tenant data', error instanceof Error ? error : new Error(String(error)), {
      feature: 'tenant',
      operation: 'get_tenant_data',
    });
    return null;
  }
}

/**
 * Load all public page data for the tenant website.
 * Used by the home page and other pages that need multiple data types.
 */
export async function getTenantPageData(): Promise<TenantPageData | null> {
  try {
    const tenantData = await getTenantData();
    if (!tenantData) return null;

    // Use admin client — public website visitors are unauthenticated
    const adminClient = getAdminClient();
    const orgId = tenantData.organization.id;

    const [lessonTypesRes, packagesRes, instructorsRes, areasRes, reviewsRes, heroSlidesRes, successStoriesRes] = await Promise.all([
      adminClient
        .from('lesson_types')
        .select('id, organization_id, name, description, duration_minutes, price_cents, transmission_type, status, is_public, sort_order, created_at')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .eq('is_public', true)
        .order('sort_order')
        .order('name'),
      adminClient
        .from('lesson_packages')
        .select('id, organization_id, name, description, lesson_count, price_cents, per_lesson_price_cents, savings_cents, lesson_type_id, status, is_public, sort_order, validity_days, created_at')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .eq('is_public', true)
        .order('sort_order')
        .order('name'),
      adminClient
        .from('instructors')
        .select('id, organization_id, display_name, bio, photo_url, transmission_type, is_active')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('display_name'),
      adminClient
        .from('service_areas')
        .select('id, organization_id, name, suburb, postcode, state, is_active')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name'),
      adminClient
        .from('reviews')
        .select('id, organization_id, reviewer_name, rating, title, body, status, is_anonymous, created_at')
        .eq('organization_id', orgId)
        .in('status', ['approved', 'featured'])
        .order('created_at', { ascending: false })
        .limit(10),
      adminClient
        .from('hero_slides')
        .select('id, organization_id, title, subtitle, image_url, link_text, link_url, is_active, sort_order')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('sort_order')
        .order('created_at'),
      adminClient
        .from('success_stories')
        .select('id, organization_id, student_name, photo_url, message, pass_date, test_location, status, sort_order')
        .eq('organization_id', orgId)
        .eq('status', 'published')
        .eq('consent_given', true)
        .order('sort_order')
        .order('pass_date', { ascending: false })
        .limit(12),
    ]);

    return {
      ...tenantData,
      lessonTypes: (lessonTypesRes.data ?? []) as LessonType[],
      lessonPackages: (packagesRes.data ?? []) as LessonPackage[],
      instructors: (instructorsRes.data ?? []) as Instructor[],
      serviceAreas: (areasRes.data ?? []) as ServiceArea[],
      reviews: (reviewsRes.data ?? []) as Review[],
      heroSlides: (heroSlidesRes.data ?? []) as HeroSlide[],
      successStories: (successStoriesRes.data ?? []) as SuccessStory[],
    };
  } catch (error) {
    logger.error('Failed to get tenant page data', error instanceof Error ? error : new Error(String(error)), {
      feature: 'tenant',
      operation: 'get_tenant_page_data',
    });
    return null;
  }
}
