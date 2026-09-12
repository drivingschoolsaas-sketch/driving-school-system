import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/config/env';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Step 1: Check env vars
  try {
    const env = getServerEnv();
    results.envOk = true;
    results.supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    results.appUrl = env.NEXT_PUBLIC_APP_URL;
  } catch (err) {
    results.envOk = false;
    results.envError = err instanceof Error ? err.message : String(err);
    return NextResponse.json(results, { status: 500 });
  }

  // Step 2: Try signing in with the anon client (like createServerSupabaseClient does)
  const env = getServerEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'tonmoy0024@gmail.com',
    password: 'MyPassword123',
  });

  if (signInError) {
    results.signInOk = false;
    results.signInError = signInError.message;
    results.signInStatus = signInError.status;
  } else {
    results.signInOk = true;
    results.userId = signInData.user?.id;
    results.userEmail = signInData.user?.email;

    // Step 3: Check organization_members for this user
    const { data: memberships, error: memError } = await supabase
      .from('organization_members')
      .select('role, organization_id, status')
      .eq('user_id', signInData.user!.id)
      .eq('status', 'active');

    results.memberships = memberships;
    results.membershipError = memError?.message;

    // Step 4: Check with service role (bypasses RLS)
    const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: adminMemberships, error: adminMemError } = await adminClient
      .from('organization_members')
      .select('role, organization_id, status')
      .eq('user_id', signInData.user!.id);

    results.adminMemberships = adminMemberships;
    results.adminMembershipError = adminMemError?.message;
  }

  return NextResponse.json(results, { status: 200 });
}
