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
  const email = 'instructor@driveflow.test';
  const password = 'Instructor123';

  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', 'sydney-driving-academy')
    .single();

  if (!org) {
    console.error('❌ No org found');
    process.exit(1);
  }

  console.log(`Organization: ${org.id}`);

  let userId: string;
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Demo Instructor' },
  });

  if (authErr) {
    if (authErr.message.includes('already been registered')) {
      const { data: list } = await admin.auth.admin.listUsers();
      const u = list?.users?.find((u) => u.email === email);
      if (!u) { console.error('Cannot find user'); process.exit(1); }
      userId = u.id;
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      console.log('✅ User exists, password reset');
    } else {
      console.error('❌ Create error:', authErr.message);
      process.exit(1);
    }
  } else {
    userId = authUser.user.id;
    console.log(`✅ Created user: ${userId}`);
  }

  const { data: existing } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', org.id)
    .eq('user_id', userId!)
    .single();

  if (!existing) {
    const { error: memErr } = await admin.from('organization_members').insert({
      organization_id: org.id,
      user_id: userId!,
      role: 'instructor',
      status: 'active',
    });
    if (memErr) console.error('❌ Member insert error:', memErr.message);
    else console.log('✅ Added as instructor');
  } else {
    console.log('ℹ️  Membership already exists');
  }

  const testClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signErr } = await testClient.auth.signInWithPassword({ email, password });
  console.log(signErr ? '❌ Sign-in FAILED: ' + signErr.message : '✅ Sign-in verified');

  console.log('\n🎉 Tenant Instructor credentials:');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
}

run().catch(console.error);
