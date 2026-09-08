// ==================================================
// Run Migrations via Supabase
// ==================================================
// Usage: npx tsx scripts/run-migrations.ts
// Reads .env.local manually (no dotenv dependency).

import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// Parse .env.local manually
function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      env[key] = value;
    }
  } catch {
    // File doesn't exist
  }
  return env;
}

const envFile = resolve(__dirname, '../.env.local');
const env = loadEnv(envFile);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Set them in .env.local or as environment variables.');
  process.exit(1);
}

const migrationsDir = resolve(__dirname, '../supabase/migrations');
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

async function runSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
  // Try the /pg endpoint (Supabase's raw SQL execution)
  const response = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text };
  }

  const body = await response.json();
  if (body && body.error) {
    return { ok: false, error: body.error };
  }

  return { ok: true };
}

async function runMigrations() {
  console.log('🗄️  Running DriveFlow migrations...\n');
  console.log(`  Project: ${projectRef}`);
  console.log(`  URL:     ${SUPABASE_URL}\n`);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Test connectivity
  const testResult = await runSQL('SELECT 1 AS test;');

  if (!testResult.ok) {
    console.log('⚠️  Cannot run SQL directly via API.');
    console.log('  Please run each migration in the Supabase SQL Editor:\n');
    console.log(`  👉 https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
    console.log('  Run these files IN ORDER (copy-paste each into the editor, click "Run"):\n');
    for (const file of files) {
      console.log(`    📄 ${file}`);
    }
    console.log(`\n  Files are in: supabase/migrations/`);
    process.exit(0);
  }

  console.log('  ✅ Database connected\n');

  let succeeded = 0;

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');

    process.stdout.write(`  → ${file} ... `);

    const result = await runSQL(sql);

    if (!result.ok) {
      const errStr = result.error ?? '';
      // "already exists" errors mean migration was already applied
      if (errStr.includes('already exists') || errStr.includes('duplicate')) {
        console.log('⏭️  (already applied)');
        succeeded++;
        continue;
      }
      console.log('❌');
      console.error(`    Error: ${errStr}\n`);
      process.exit(1);
    }

    console.log('✅');
    succeeded++;
  }

  console.log(`\n🎉 All ${succeeded} migrations applied!\n`);
  console.log('Next steps:');
  console.log('  npx tsx scripts/seed-demo.ts                      # Seed demo school');
  console.log('  npx tsx scripts/create-admin-user.ts email pass   # Create admin user');
  console.log('  npm run dev                                        # Start dev server');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
