import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/database/supabase-server';
import { classifyHostname } from '@/lib/tenant/domain-normalizer';
import { getServerEnv } from '@/config/env';
import { isPlatformRole } from '@/permissions/roles';
import type { UserRole } from '@/config/constants';

export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    // Step 1: Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    results.cookieCount = allCookies.length;
    results.authCookies = allCookies
      .filter(c => c.name.startsWith('sb-'))
      .map(c => ({ name: c.name, valueLength: c.value.length }));

    // Step 2: Check env
    const env = getServerEnv();
    results.envOk = true;

    // Step 3: Check hostname classification
    const hostname = 'driving-school-system-psi.vercel.app';
    const classification = classifyHostname(
      hostname,
      env.NEXT_PUBLIC_PLATFORM_DOMAIN,
      env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN
    );
    results.hostnameType = classification.type;
    results.isAllowed = ['platform_admin', 'platform_website', 'localhost', 'preview'].includes(classification.type);

    // Step 4: Check getUser
    const client = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    results.getUserOk = !authError && !!user;
    results.getUserError = authError?.message;
    results.userId = user?.id;
    results.userEmail = user?.email;

    // Step 5: Check memberships
    if (user) {
      const { data: memberships, error: memError } = await client
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('status', 'active');

      results.memberships = memberships;
      results.membershipError = memError?.message;

      const platformMembership = (memberships ?? []).find((m) =>
        isPlatformRole(m.role as UserRole)
      );
      results.hasPlatformRole = !!platformMembership;
      results.platformRole = platformMembership?.role;
    }

    results.wouldPass = results.isAllowed && results.getUserOk && results.hasPlatformRole;
  } catch (err) {
    results.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
