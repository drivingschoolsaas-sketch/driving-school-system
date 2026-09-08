// ==================================================
// Create Admin User Script
// ==================================================
// Creates a Supabase Auth user and adds them as a
// school_owner member of an organization.
//
// Usage:
//   npx tsx scripts/create-admin-user.ts <email> <password> [org-slug]
//
// If org-slug is omitted, uses 'sydney-driving-academy' (the demo org).

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const [, , email, password, orgSlug = 'sydney-driving-academy'] = process.argv;

if (!email || !password) {
  console.error('Usage: npx tsx scripts/create-admin-user.ts <email> <password> [org-slug]');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAdminUser() {
  console.log(`\n🔑 Creating admin user: ${email}\n`);

  // 1. Find the organization
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, name')
    .eq('slug', orgSlug)
    .single();

  if (orgErr || !org) {
    console.error(`❌ Organization not found: ${orgSlug}`);
    console.error('   Run seed-demo.ts first, or provide an existing org slug.');
    process.exit(1);
  }

  console.log(`  Organization: ${org.name} (${org.id})`);

  // 2. Create Auth user
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification for seed
  });

  if (authErr) {
    // Check if user already exists
    if (authErr.message.includes('already been registered')) {
      console.log('  ℹ️  User already exists, looking up...');
      const { data: existing } = await admin.auth.admin.listUsers();
      const user = existing?.users?.find((u) => u.email === email);
      if (!user) {
        console.error('❌ Could not find existing user');
        process.exit(1);
      }
      await addMember(org.id, user.id);
      return;
    }
    console.error('❌ Failed to create user:', authErr.message);
    process.exit(1);
  }

  console.log(`  ✅ Auth user created: ${authUser.user.id}`);
  await addMember(org.id, authUser.user.id);
}

async function addMember(orgId: string, userId: string) {
  // Check if membership already exists
  const { data: existing } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    console.log('  ℹ️  Membership already exists');
  } else {
    const { error: memErr } = await admin.from('organization_members').insert({
      organization_id: orgId,
      user_id: userId,
      role: 'school_owner',
      status: 'active',
    });

    if (memErr) {
      console.error('❌ Failed to add member:', memErr.message);
      process.exit(1);
    }
    console.log('  ✅ Added as school_owner');
  }

  console.log('\n🎉 Done! You can now sign in at:');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log('   URL:      http://localhost:3000/auth/sign-in');
}

createAdminUser().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
