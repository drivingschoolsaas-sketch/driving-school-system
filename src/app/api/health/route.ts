// ==================================================
// Health Check Endpoint
// ==================================================
// GET /api/health — returns 200 if the app is running
// and can reach Supabase. Used by uptime monitors.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  const checks: Record<string, 'ok' | 'error'> = {
    app: 'ok',
    database: 'error',
  };

  // Test Supabase connectivity
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      const { error } = await client
        .from('organizations')
        .select('id')
        .limit(1);

      checks.database = error ? 'error' : 'ok';
    }
  } catch {
    checks.database = 'error';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');
  const latencyMs = Date.now() - start;

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      latencyMs,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'local',
      timestamp: new Date().toISOString(),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
