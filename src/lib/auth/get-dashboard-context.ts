// ==================================================
// Dashboard Authorization Helper
// ==================================================
// Server-side helper that resolves the authenticated
// user's context for the admin dashboard. Used by all
// dashboard pages to get the AuthorizedContext.

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { resolveHostname } from '@/lib/tenant/resolve-hostname';
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

    // 2. Resolve tenant from hostname
    // Use admin client for hostname resolution — the localhost dev
    // fallback queries organizations without user context, and RLS
    // may block the anon client when the user isn't a member of the
    // first org returned.
    const headerStore = await headers();
    const hostname = headerStore.get('host') ?? 'localhost';
    const resolved = await resolveHostname(hostname, {
      platformDomain: env.NEXT_PUBLIC_PLATFORM_DOMAIN,
      adminSubdomain: env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN,
    }, getAdminClient());

    if (resolved.kind !== 'tenant') {
      redirect('/auth/sign-in');
    }

    const orgId = resolved.tenant.organizationId;

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
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
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
