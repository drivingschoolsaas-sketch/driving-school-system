// ==================================================
// Create Platform Admin (SaaS Business Admin)
// ==================================================
// Creates a platform_owner membership for an existing user,
// giving them access to the /admin panel to manage all
// schools, domains, subscriptions, etc.
//
// Usage: npx tsx scripts/create-platform-admin.ts

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
  const email = 'tonmoy0024@gmail.com';

  console.log(`\n🔑 Setting up Platform Admin: ${email}\n`);

  // Find the user
  const { data: listData } = await admin.auth.admin.listUsers();
  const user = listData?.users?.find((u) => u.email === email);

  if (!user) {
    console.error('❌ User not found. Create the user first.');
    process.exit(1);
  }

  console.log(`  User ID: ${user.id}`);

  // Get the first org (platform admin needs at least one org membership to be detected)
  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!org) {
    console.error('❌ No organization found');
    process.exit(1);
  }

  // Check if already has platform_owner membership
  const { data: existing } = await admin
    .from('organization_members')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('role', 'platform_owner')
    .single();

  if (existing) {
    console.log('  ℹ️  Already a platform_owner');
  } else {
    // Add platform_owner membership
    const { error } = await admin.from('organization_members').insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'platform_owner',
      status: 'active',
    });

    if (error) {
      // Might conflict with existing school_owner membership — update it instead
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        // User already has a membership in this org, add a second one or update
        console.log('  ℹ️  User already has membership in this org. Adding platform role...');

        // Try inserting with a different approach — platform admin can span orgs
        // The membership might already exist as school_owner, so we need a separate record
        // or we update the existing one
        const { data: existingMem } = await admin
          .from('organization_members')
          .select('id, role')
          .eq('organization_id', org.id)
          .eq('user_id', user.id)
          .single();

        if (existingMem) {
          // Update to platform_owner (highest role)
          const { error: updateErr } = await admin
            .from('organization_members')
            .update({ role: 'platform_owner' })
            .eq('id', existingMem.id);

          if (updateErr) {
            console.error('❌ Failed to update role:', updateErr.message);
            process.exit(1);
          }
          console.log(`  ✅ Upgraded from ${existingMem.role} → platform_owner`);
        }
      } else {
        console.error('❌ Failed:', error.message);
        process.exit(1);
      }
    } else {
      console.log('  ✅ Added as platform_owner');
    }
  }

  console.log('\n🎉 Platform Admin is ready!');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: (use your existing password)`);
  console.log(`   Admin:    http://localhost:3000/admin`);
  console.log('\n   This user can now:');
  console.log('   • View/manage all driving schools');
  console.log('   • Approve/suspend domains');
  console.log('   • Manage subscriptions');
  console.log('   • View audit logs');
  console.log('   • Toggle feature flags');
}

run().catch(console.error);
