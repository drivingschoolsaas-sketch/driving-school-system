import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv(fp: string) {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(fp, 'utf-8').split('\n')) {
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('\n🔧 Fixing school owner password...\n');

  const { data: list } = await admin.auth.admin.listUsers();
  const owner = list?.users?.find((u) => u.email === 'schoolowner1@driveflow.test');
  if (owner) {
    await admin.auth.admin.updateUserById(owner.id, { password: 'SW123456' });
    console.log('  ✅ School owner password updated to SW123456');
  } else {
    console.log('  ❌ School owner user not found');
  }

  console.log('\n🧪 Testing all logins...\n');

  const testClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const tests = [
    { email: 'tonmoy0024@gmail.com', password: 'MyPassword123', role: 'Platform Admin' },
    { email: 'schoolowner1@driveflow.test', password: 'SW123456', role: 'School Owner' },
    { email: 'instructor@driveflow.test', password: 'Instructor123', role: 'Instructor' },
  ];

  for (const t of tests) {
    const { error } = await testClient.auth.signInWithPassword({
      email: t.email,
      password: t.password,
    });
    if (error) {
      console.log(`  ❌ ${t.role} (${t.email}): FAILED — ${error.message}`);
    } else {
      console.log(`  ✅ ${t.role} (${t.email}): OK`);
    }
  }

  console.log('\n📋 Updated credentials:');
  console.log('  Platform Admin:  tonmoy0024@gmail.com / MyPassword123');
  console.log('  School Owner:    schoolowner1@driveflow.test / SW123456');
  console.log('  Instructor:      instructor@driveflow.test / Instructor123');
}

run().catch(console.error);
