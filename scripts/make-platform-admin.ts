// Upgrade a user to platform_owner role
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  } catch {}
  return env;
}

const env = loadEnv(resolve(__dirname, '../.env.local'));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function makePlatformAdmin() {
  const email = process.argv[2] || 'tonmoy0024@gmail.com';
  console.log(`\n🔑 Making ${email} a platform_owner...\n`);

  // Find user
  const { data: listData } = await admin.auth.admin.listUsers();
  const user = listData?.users?.find((u) => u.email === email);

  if (!user) {
    console.error('❌ User not found:', email);
    process.exit(1);
  }

  // Update existing membership to platform_owner
  const { data: membership, error: memErr } = await admin
    .from('organization_members')
    .update({ role: 'platform_owner' })
    .eq('user_id', user.id)
    .select()
    .single();

  if (memErr) {
    console.error('❌ Failed to update:', memErr.message);
    process.exit(1);
  }

  console.log('  ✅ Updated to platform_owner');
  console.log('  Membership:', JSON.stringify(membership, null, 2));
  console.log('\n🎉 You can now access /admin on localhost:3000');
}

makePlatformAdmin().catch(console.error);
