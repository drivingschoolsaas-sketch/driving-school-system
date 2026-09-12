// ==================================================
// Dashboard Authorization Helper
// ==================================================
// Server-side helper that resolves the authenticated
// user's context for the admin dashboard. Used by all
// dashboard pages to get the AuthorizedContext.

import 'server-only';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { resolveHostname, resolveTenantBySlug } from '@/lib/tenant/resolve-hostname';
import { getServerEnv } from '@/config/env';
import { logger } from '@/lib/logging';
import { authorizeForOrganization, type AuthorizedContext } from './authorization';
import type { OrganizationMember, Organization, SchoolSettings } from '@/types/database';
import { headers } from 'next/headers';

export interface DashboardContext {
  auth: AuthorizedContext;
  organization: Organization;
  settings: SchoolSettings | null;
}

/**
 * Get the authenticated user's dashboard context.
 *
 * This resolves tenant → authenticates user → authorizes for org.
 * If any step fails, redirects to sign-in.
 *
 * Used by all dashboard pages to ensure the user is authorized.
 */
export async function getDashboardContext(): Promise<DashboardContext> {
  try {
    const env = getServerEnv();
    const client = await createServerSupabaseClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
      redirect('/auth/sign-in');
    }

    // 2. Resolve tenant from hostname (or ?tenant= override on Vercel)
    // Use admin client for hostname resolution — the localhost dev
    // fallback queries organizations without user context, and RLS
    // may block the anon client when the user isn't a member of the
    // first org returned.
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
      } catch (err) {
        // redirect() throws a special error — rethrow it
        if (isRedirectError(err)) {
          throw err;
        }
        logger.warn('Dashboard: tenant override slug not found', {
          feature: 'dashboard',
          operation: 'get_dashboard_context',
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

    // 5. Load organization and settings
    const [orgRes, settingsRes] = await Promise.all([
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
    ]);

    if (!orgRes.data) {
      redirect('/auth/sign-in');
    }

    return {
      auth,
      organization: orgRes.data as Organization,
      settings: settingsRes.data ? (settingsRes.data as SchoolSettings) : null,
    };
  } catch (error) {
    // authorizeForOrganization throws AppError on failure
    // redirect() throws a special Next.js error — rethrow it
    if (isRedirectError(error)) {
      throw error;
    }

    logger.warn('Dashboard access denied', {
      feature: 'dashboard',
      operation: 'get_dashboard_context',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    redirect('/auth/sign-in');
  }
}
