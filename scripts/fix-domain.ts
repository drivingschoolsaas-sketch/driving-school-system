// Fix the organization domain record for local development
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

async function fixDomain() {
  console.log('\n🔧 Fixing organization domain for local dev...\n');

  // Find the org
  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('slug', 'sydney-driving-academy')
    .single();

  if (!org) {
    console.error('❌ Organization not found');
    process.exit(1);
  }

  console.log(`  Organization: ${org.name} (${org.id})`);

  // Insert the domain with correct status
  const { data: inserted, error: insertError } = await admin
    .from('organization_domains')
    .insert({
      organization_id: org.id,
      hostname: 'sydney-driving-academy.driveflow.local',
      domain_type: 'platform_subdomain',
      is_primary: true,
      status: 'verified',
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    // Maybe it already exists with wrong status — try update
    const { error: updateError } = await admin
      .from('organization_domains')
      .update({ status: 'verified', hostname: 'sydney-driving-academy.driveflow.local' })
      .eq('organization_id', org.id);
    if (updateError) {
      console.error('❌ Update also failed:', updateError.message);
      process.exit(1);
    }
  }

  // Verify
  const { data: updated } = await admin
    .from('organization_domains')
    .select('*')
    .eq('organization_id', org.id);

  console.log('\n  ✅ Updated domain:', JSON.stringify(updated, null, 2));
  console.log('\n🎉 Domain fixed! Restart your dev server and visit:');
  console.log('   http://sydney-driving-academy.driveflow.local:3000/dashboard');
}

fixDomain().catch(console.error);
