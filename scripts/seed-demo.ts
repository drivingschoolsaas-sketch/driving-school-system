// ==================================================
// Demo Seed Script
// ==================================================
// Creates a demo driving school with sample data.
// Usage: npx tsx scripts/seed-demo.ts
//
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
// in .env.local (or as environment variables).

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually (no dotenv dependency)
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
  } catch { /* file not found */ }
  return env;
}

const env = loadEnv(resolve(__dirname, '../.env.local'));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Make sure .env.local is configured.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('🌱 Seeding demo data...\n');

  // 1. Create demo organization
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({
      name: 'Sydney Driving Academy',
      slug: 'sydney-driving-academy',
      status: 'active',
    })
    .select()
    .single();

  if (orgErr) {
    console.error('Failed to create org:', orgErr.message);
    process.exit(1);
  }
  console.log(`  ✅ Organization: ${org.name} (${org.id})`);

  const orgId = org.id;

  // 2. Create platform subdomain
  await admin.from('organization_domains').insert({
    organization_id: orgId,
    hostname: 'sydney-driving-academy',
    domain_type: 'platform_subdomain',
    is_primary: true,
    status: 'active',
    ssl_status: 'active',
  });
  console.log('  ✅ Domain: sydney-driving-academy.driveflow.com.au');

  // 3. Create school settings
  await admin.from('school_settings').insert({
    organization_id: orgId,
    business_name: 'Sydney Driving Academy',
    tagline: 'Learn to drive with confidence',
    description:
      "Sydney's premier driving school offering comprehensive lessons for learners of all levels.",
    phone: '0412 345 678',
    email: 'hello@sydneydrivingacademy.com.au',
    address: '123 George Street, Sydney NSW 2000',
    primary_color: '#1e40af',
    secondary_color: '#3b82f6',
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    booking_lead_time_hours: 24,
    cancellation_policy_hours: 24,
    sections_enabled: {
      lessons: true,
      packages: true,
      instructors: true,
      areas: true,
      reviews: true,
      success_stories: true,
    },
  });
  console.log('  ✅ School settings');

  // 4. Create lesson types
  const lessonTypes = [
    {
      organization_id: orgId,
      name: '1-Hour Standard Lesson',
      description: 'Perfect for regular practice sessions.',
      duration_minutes: 60,
      price_cents: 7500,
      sort_order: 1,
    },
    {
      organization_id: orgId,
      name: '2-Hour Intensive Lesson',
      description: 'Double lesson for faster progress.',
      duration_minutes: 120,
      price_cents: 14000,
      sort_order: 2,
    },
    {
      organization_id: orgId,
      name: 'Driving Test Package',
      description: 'Use of car for the driving test plus a warm-up lesson.',
      duration_minutes: 90,
      price_cents: 18000,
      sort_order: 3,
    },
  ];

  const { data: ltData, error: ltErr } = await admin
    .from('lesson_types')
    .insert(lessonTypes)
    .select();
  if (ltErr) console.error('  ⚠️ Lesson types error:', ltErr.message);
  else console.log(`  ✅ ${ltData?.length ?? 0} lesson types`);

  // 5. Create a lesson package (needs a lesson_type_id FK)
  const firstLessonTypeId = ltData?.[0]?.id;
  if (firstLessonTypeId) {
    await admin.from('lesson_packages').insert({
      organization_id: orgId,
      name: '10-Lesson Saver Pack',
      description: 'Save $50 when you buy 10 standard lessons upfront.',
      lesson_type_id: firstLessonTypeId,
      lesson_count: 10,
      price_cents: 70000,
      savings_cents: 5000,
      validity_days: 180,
      sort_order: 1,
    });
    console.log('  ✅ 1 lesson package');
  } else {
    console.log('  ⏭️  Skipping lesson package (no lesson type)');
  }

  // 6. Create service areas
  const areas = [
    {
      organization_id: orgId,
      name: 'Sydney CBD',
      suburb: 'Sydney',
      postcode: '2000',
      state: 'NSW',
    },
    {
      organization_id: orgId,
      name: 'Inner West',
      suburb: 'Newtown',
      postcode: '2042',
      state: 'NSW',
    },
    {
      organization_id: orgId,
      name: 'Eastern Suburbs',
      suburb: 'Bondi',
      postcode: '2026',
      state: 'NSW',
    },
  ];

  const { data: areaData } = await admin.from('service_areas').insert(areas).select();
  console.log(`  ✅ ${areaData?.length ?? 0} service areas`);

  // 7. Create a subscription plan seed (if plans table is empty)
  const { data: existingPlans } = await admin
    .from('plans')
    .select('id')
    .limit(1);

  if (!existingPlans || existingPlans.length === 0) {
    console.log('  ℹ️  Plans already seeded by migration');
  }

  // 8. Create a subscription for the org (Growth plan)
  const { data: growthPlan } = await admin
    .from('plans')
    .select('id')
    .eq('slug', 'growth')
    .single();

  if (growthPlan) {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);
    const periodEnd = new Date(trialEnd);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await admin.from('subscriptions').insert({
      organization_id: orgId,
      plan_id: growthPlan.id,
      status: 'trialing',
      billing_interval: 'monthly',
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });
    console.log('  ✅ Growth plan subscription (14-day trial)');
  }

  console.log('\n🎉 Demo seed complete!');
  console.log(`\n   Organization ID: ${orgId}`);
  console.log(
    '   Subdomain:       sydney-driving-academy.driveflow.com.au'
  );
  console.log(
    '\n   Next: Create a user in Supabase Auth and add them as a member.'
  );
  console.log(
    '   Or run: npx tsx scripts/create-admin-user.ts <email> <password>'
  );
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
