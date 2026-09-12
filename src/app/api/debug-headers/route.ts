import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/database/supabase-admin';

export async function GET() {
  const headerStore = await headers();
  const tenantOverride = headerStore.get('x-tenant-override');
  const host = headerStore.get('host');

  const result: Record<string, unknown> = {
    host,
    tenantOverride,
    hostnameType: headerStore.get('x-hostname-type'),
  };

  // If tenant override is present, test the actual database query
  if (tenantOverride) {
    try {
      const adminClient = getAdminClient();

      // Test 1: Direct org query by slug (cast to any to avoid generated type issues)
      const orgResult = await adminClient
        .from('organizations')
        .select('*')
        .eq('slug', tenantOverride)
        .in('status', ['active', 'trial'])
        .single();

      const org = orgResult.data as Record<string, unknown> | null;
      const orgError = orgResult.error;

      result.orgQuery = {
        found: !!org,
        slug: org?.slug ?? null,
        name: org?.name ?? null,
        id: org?.id ?? null,
        error: orgError?.message ?? null,
      };

      // Test 2: Check if settings exist
      if (org?.id) {
        const settingsResult = await adminClient
          .from('school_settings')
          .select('*')
          .eq('organization_id', org.id as string)
          .maybeSingle();

        result.settingsQuery = {
          found: !!settingsResult.data,
          error: settingsResult.error?.message ?? null,
        };
      }
    } catch (err) {
      result.dbError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(result, { status: 200 });
}
