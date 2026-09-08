// Quick script to reset admin password and verify sign-in works
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
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resetPassword() {
  const email = 'tonmoy0024@gmail.com';
  const newPassword = 'MyPassword123';

  console.log(`\n🔑 Resetting password for: ${email}\n`);

  // Find user
  const { data: listData } = await admin.auth.admin.listUsers();
  const user = listData?.users?.find((u) => u.email === email);

  if (!user) {
    console.error('❌ User not found:', email);
    process.exit(1);
  }

  console.log(`  Found user: ${user.id}`);
  console.log(`  Email confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`);

  // Update password and ensure email is confirmed
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true,
  });

  if (error) {
    console.error('❌ Failed to update:', error.message);
    process.exit(1);
  }

  console.log('  ✅ Password updated!');

  // Test sign-in with anon key
  if (ANON_KEY) {
    const testClient = createClient(SUPABASE_URL!, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signIn, error: signInErr } = await testClient.auth.signInWithPassword({
      email,
      password: newPassword,
    });

    if (signInErr) {
      console.error('  ❌ Test sign-in FAILED:', signInErr.message);
    } else {
      console.log('  ✅ Test sign-in PASSED! User ID:', signIn.user?.id);
    }
  }

  console.log(`\n🎉 You can now sign in with:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${newPassword}`);
}

resetPassword().catch(console.error);
