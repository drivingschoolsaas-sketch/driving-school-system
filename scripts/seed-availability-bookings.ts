// ==================================================
// Seed Availability Rules & Bookings
// ==================================================
// Adds weekly availability rules for instructors
// and creates past/current/future bookings.
//
// Usage: npx tsx scripts/seed-availability-bookings.ts

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

const DAYS: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

async function seed() {
  console.log('\n📅 Seeding availability rules & bookings...\n');

  // Get org
  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', 'sydney-driving-academy')
    .single();

  if (!org) { console.error('❌ Org not found'); process.exit(1); }
  const orgId = org.id;

  // Get instructors
  const { data: instructors } = await admin
    .from('instructors')
    .select('id, display_name, user_id')
    .eq('organization_id', orgId);

  if (!instructors || instructors.length === 0) {
    console.error('❌ No instructors found. Run seed-full-school.ts first.');
    process.exit(1);
  }

  // Get students
  const { data: students } = await admin
    .from('students')
    .select('id, display_name, pickup_address')
    .eq('organization_id', orgId);

  // Get lesson types
  const { data: lessonTypes } = await admin
    .from('lesson_types')
    .select('id, duration_minutes, price_cents')
    .eq('organization_id', orgId)
    .eq('status', 'active');

  // Get vehicles
  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'active');

  // 1. Create availability rules (Mon-Fri 8am-5pm, Sat 9am-1pm)
  const rules: any[] = [];
  for (const instructor of instructors) {
    // Monday to Friday: 8am-5pm
    for (let d = 0; d < 5; d++) {
      rules.push({
        organization_id: orgId,
        instructor_id: instructor.id,
        day_of_week: DAYS[d],
        start_time: '08:00',
        end_time: '17:00',
        is_active: true,
      });
    }
    // Saturday: 9am-1pm
    rules.push({
      organization_id: orgId,
      instructor_id: instructor.id,
      day_of_week: 'saturday',
      start_time: '09:00',
      end_time: '13:00',
      is_active: true,
    });
  }

  const { data: ruleData, error: ruleErr } = await admin
    .from('availability_rules')
    .upsert(rules, { onConflict: 'organization_id,instructor_id,day_of_week' })
    .select();

  if (ruleErr) {
    console.error('  ⚠️ Availability rules error:', ruleErr.message);
  } else {
    console.log(`  ✅ ${ruleData?.length ?? 0} availability rules`);
  }

  // 2. Create bookings
  if (!students || !lessonTypes || lessonTypes.length === 0) {
    console.log('  ⏭️ Skipping bookings (no students or lesson types)');
    return;
  }

  // Get the admin user for created_by
  const { data: adminUser } = await admin.auth.admin.listUsers();
  const ownerUser = adminUser?.users?.find(u => u.email === 'tonmoy0024@gmail.com');
  if (!ownerUser) {
    console.error('  ⚠️ Admin user not found, skipping bookings');
    return;
  }

  const bookings: any[] = [];
  const now = new Date();

  // Helper to create a datetime string
  function makeDateTime(daysOffset: number, hour: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  // Past bookings (completed) — last 7 days
  for (let i = 0; i < 8; i++) {
    const daysAgo = -(i + 1);
    const student = students[i % students.length];
    const instructor = instructors[i % instructors.length];
    const lt = lessonTypes[0];
    const hour = 9 + (i % 6);
    const durationHours = lt.duration_minutes / 60;

    bookings.push({
      organization_id: orgId,
      student_id: student.id,
      instructor_id: instructor.id,
      lesson_type_id: lt.id,
      vehicle_id: vehicles?.[i % (vehicles?.length ?? 1)]?.id ?? null,
      start_datetime: makeDateTime(daysAgo, hour),
      end_datetime: makeDateTime(daysAgo, hour + durationHours),
      status: 'completed',
      pickup_address: student.pickup_address,
      price_cents: lt.price_cents,
      notes: i === 0 ? 'Great progress on parallel parking' : i === 3 ? 'Needs more roundabout practice' : null,
      created_by: ownerUser.id,
    });
  }

  // Today's bookings (confirmed)
  bookings.push({
    organization_id: orgId,
    student_id: students[0].id,
    instructor_id: instructors[0].id,
    lesson_type_id: lessonTypes[0].id,
    vehicle_id: vehicles?.[0]?.id ?? null,
    start_datetime: makeDateTime(0, 10),
    end_datetime: makeDateTime(0, 11),
    status: 'confirmed',
    pickup_address: students[0].pickup_address,
    price_cents: lessonTypes[0].price_cents,
    created_by: ownerUser.id,
  });

  bookings.push({
    organization_id: orgId,
    student_id: students[1].id,
    instructor_id: instructors[1].id,
    lesson_type_id: lessonTypes[0].id,
    vehicle_id: vehicles?.[1]?.id ?? null,
    start_datetime: makeDateTime(0, 14),
    end_datetime: makeDateTime(0, 15),
    status: 'confirmed',
    pickup_address: students[1].pickup_address,
    price_cents: lessonTypes[0].price_cents,
    created_by: ownerUser.id,
  });

  bookings.push({
    organization_id: orgId,
    student_id: students[2].id,
    instructor_id: instructors[2].id,
    lesson_type_id: lessonTypes[0].id,
    vehicle_id: vehicles?.[2]?.id ?? null,
    start_datetime: makeDateTime(0, 16),
    end_datetime: makeDateTime(0, 17),
    status: 'pending',
    pickup_address: students[2].pickup_address,
    price_cents: lessonTypes[0].price_cents,
    created_by: ownerUser.id,
  });

  // Future bookings (next 7 days)
  for (let i = 1; i <= 7; i++) {
    const student = students[i % students.length];
    const instructor = instructors[i % instructors.length];
    const lt = lessonTypes[i % lessonTypes.length];
    const hour = 9 + (i % 7);
    const durationHours = lt.duration_minutes / 60;

    bookings.push({
      organization_id: orgId,
      student_id: student.id,
      instructor_id: instructor.id,
      lesson_type_id: lt.id,
      vehicle_id: vehicles?.[i % (vehicles?.length ?? 1)]?.id ?? null,
      start_datetime: makeDateTime(i, hour),
      end_datetime: makeDateTime(i, hour + durationHours),
      status: 'confirmed',
      pickup_address: student.pickup_address,
      price_cents: lt.price_cents,
      created_by: ownerUser.id,
    });

    // Add a second booking on some days
    if (i <= 3) {
      const student2 = students[(i + 2) % students.length];
      const instructor2 = instructors[(i + 1) % instructors.length];
      bookings.push({
        organization_id: orgId,
        student_id: student2.id,
        instructor_id: instructor2.id,
        lesson_type_id: lessonTypes[0].id,
        vehicle_id: vehicles?.[(i + 1) % (vehicles?.length ?? 1)]?.id ?? null,
        start_datetime: makeDateTime(i, 14),
        end_datetime: makeDateTime(i, 15),
        status: 'confirmed',
        pickup_address: student2.pickup_address,
        price_cents: lessonTypes[0].price_cents,
        created_by: ownerUser.id,
      });
    }
  }

  const { data: bookingData, error: bookErr } = await admin
    .from('bookings')
    .insert(bookings)
    .select();

  if (bookErr) {
    console.error('  ⚠️ Bookings error:', bookErr.message);
  } else {
    console.log(`  ✅ ${bookingData?.length ?? 0} bookings created`);
    const completed = bookings.filter(b => b.status === 'completed').length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    console.log(`     ${completed} completed, ${confirmed} confirmed, ${pending} pending`);
  }

  console.log('\n🎉 Availability & bookings seeded!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
