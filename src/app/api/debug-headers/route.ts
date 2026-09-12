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

      // Test 1: Direct org query by slug
      const { data: org, error: orgError } = await adminClient
        .from('organizations')
        .select('id, name, slug, status')
        .eq('slug', tenantOverride)
        .in('status', ['active', 'trial'])
        .single();

      result.orgQuery = { org, error: orgError?.message ?? null };

      // Test 2: Check if settings exist
      if (org) {
        const { data: settings, error: settingsError } = await adminClient
          .from('school_settings')
          .select('id, organization_id')
          .eq('organization_id', org.id)
          .maybeSingle();

        result.settingsQuery = {
          found: !!settings,
          error: settingsError?.message ?? null,
        };
      }
    } catch (err) {
      result.dbError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(result, { status: 200 });
}
