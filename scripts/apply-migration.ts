// Apply the hero_slides migration via Supabase Management API
// Usage: npx tsx scripts/apply-migration.ts

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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = env.SUPABASE_DB_PASSWORD;

if (!url || !serviceKey) {
  console.error('❌ Missing SUPABASE env vars');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = url.replace('https://', '').replace('.supabase.co', '');

const migrationFile = process.argv[2] || 'supabase/migrations/00017_hero_slides.sql';
const sql = readFileSync(resolve(__dirname, '..', migrationFile), 'utf-8');
console.log(`\n📦 Applying: ${migrationFile}\n`);

async function run() {
  // Use Supabase SQL API (available on hosted instances)
  const resp = await fetch(`${url}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  });

  // The PostgREST API doesn't support raw SQL.
  // We need to use the pg_net extension or the SQL query endpoint.
  // Let's try the Supabase query endpoint
  const sqlResp = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (sqlResp.ok) {
    console.log('  ✅ Migration applied successfully!');
    return;
  }

  // If that doesn't work, output instructions
  console.log('  ⚠️  Direct SQL API not available.');
  console.log('\n📋 Please run the migration manually:');
  console.log(`   1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log(`   2. Paste the contents of: ${migrationFile}`);
  console.log('   3. Click "Run"');
  console.log('\n   Or install the Supabase CLI: npm i -g supabase');
  console.log('   Then run: supabase db push');
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
