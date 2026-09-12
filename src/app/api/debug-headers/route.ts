import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const headerStore = await headers();
  const allHeaders: Record<string, string> = {};

  headerStore.forEach((value, key) => {
    // Only show relevant headers for debugging
    if (
      key.startsWith('x-') ||
      key === 'host' ||
      key === 'cookie'
    ) {
      allHeaders[key] = key === 'cookie' ? '(present)' : value;
    }
  });

  return NextResponse.json({
    headers: allHeaders,
    host: headerStore.get('host'),
    tenantOverride: headerStore.get('x-tenant-override'),
    hostnameType: headerStore.get('x-hostname-type'),
  });
}
