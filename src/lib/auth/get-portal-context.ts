// ==================================================
// Student Portal Authorization Helper
// ==================================================
// Server-side helper for the student portal.
// Resolves authenticated user → tenant → student record.
// Similar to getDashboardContext but adds the Student record.

import 'server-only';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { resolveHostname, resolveTenantBySlug } from '@/lib/tenant/resolve-hostname';
import { getServerEnv } from '@/config/env';
import { logger } from '@/lib/logging';
import { authorizeForOrganization, type AuthorizedContext } from './authorization';
import type { OrganizationMember, Organization, SchoolSettings, Student } from '@/types/database';
import { headers } from 'next/headers';

export interface PortalContext {
  auth: AuthorizedContext;
  organization: Organization;
  settings: SchoolSettings | null;
  student: Student;
}

/**
 * Get the authenticated student's portal context.
 *
 * Resolves tenant → authenticates → authorizes → finds student record.
 * Redirects to sign-in if not authenticated or not a student in this org.
 */
export async function getPortalContext(): Promise<PortalContext> {
  try {
    const env = getServerEnv();
    const client = await createServerSupabaseClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      redirect('/auth/sign-in');
    }

    // 2. Resolve tenant from hostname (or ?tenant= override on Vercel)
    const headerStore = await headers();
    const hostname = headerStore.get('host') ?? 'localhost';
    const tenantOverride = headerStore.get('x-tenant-override');
    const adminClient = getAdminClient();

    let orgId: string;

    // On Vercel (.vercel.app), hostname resolves as 'preview' not 'tenant'.
    // Check for ?tenant= query parameter override first (set by middleware).
    if (tenantOverride) {
      try {
        const overrideResolved = await resolveTenantBySlug(adminClient, tenantOverride, hostname);
        if (overrideResolved.kind !== 'tenant') {
          redirect('/auth/sign-in');
        }
        orgId = overrideResolved.tenant.organizationId;
      } catch {
        logger.warn('Portal: tenant override slug not found', {
          feature: 'portal',
          operation: 'get_portal_context',
          tenantOverride,
        });
        redirect('/auth/sign-in');
      }
    } else {
      const resolved = await resolveHostname(hostname, {
        platformDomain: env.NEXT_PUBLIC_PLATFORM_DOMAIN,
        adminSubdomain: env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN,
      }, adminClient);

      if (resolved.kind !== 'tenant') {
        redirect('/auth/sign-in');
      }
      orgId = resolved.tenant.organizationId;
    }

    // 3. Get user's memberships
    const { data: memberships } = await client
      .from('organization_members')
      .select('*')
      .eq('user_id', user.id);

    // 4. Authorize for this organization
    const auth = authorizeForOrganization({
      userId: user.id,
      resolvedOrganizationId: orgId,
      memberships: (memberships ?? []) as OrganizationMember[],
    });

    // 5. Load organization, settings, and student record in parallel
    const [orgRes, settingsRes, studentRes] = await Promise.all([
      client
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single(),
      client
        .from('school_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle(),
      client
        .from('students')
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (!orgRes.data) {
      redirect('/auth/sign-in');
    }

    if (!studentRes.data) {
      // User is authenticated but has no student record
      // This could be an admin — redirect them to the admin dashboard
      redirect('/dashboard');
    }

    return {
      auth,
      organization: orgRes.data as Organization,
      settings: settingsRes.data ? (settingsRes.data as SchoolSettings) : null,
      student: studentRes.data as Student,
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logger.warn('Portal access denied', {
      feature: 'portal',
      operation: 'get_portal_context',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    redirect('/auth/sign-in');
  }
}
