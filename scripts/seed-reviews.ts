// ==================================================
// Seed Reviews for Public Website
// ==================================================
// Adds realistic driving school reviews for the tenant website.
//
// Usage: npx tsx scripts/seed-reviews.ts

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

async function seed() {
  console.log('\n⭐ Seeding reviews...\n');

  // Get org
  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', 'sydney-driving-academy')
    .single();

  if (!org) { console.error('❌ Org not found'); process.exit(1); }

  // Get students for linking
  const { data: students } = await admin
    .from('students')
    .select('id, display_name')
    .eq('organization_id', org.id);

  // Get instructors for linking
  const { data: instructors } = await admin
    .from('instructors')
    .select('id, display_name')
    .eq('organization_id', org.id);

  const now = new Date();
  function daysAgo(n: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  const reviews = [
    {
      reviewer_name: 'Sarah M.',
      rating: 5,
      title: 'Passed first time!',
      body: 'I was so nervous about learning to drive, but my instructor made me feel completely at ease. The lessons were well-structured and I passed my test on the first attempt! Highly recommend to anyone looking for a patient and professional instructor.',
      status: 'featured',
      is_anonymous: false,
      created_at: daysAgo(3),
      instructor_id: instructors?.[0]?.id ?? null,
      student_id: students?.[0]?.id ?? null,
    },
    {
      reviewer_name: 'James T.',
      rating: 5,
      title: 'Best driving school in the area',
      body: "Fantastic experience from start to finish. The booking system was easy to use, my instructor was always on time and the car was immaculate. They really know the local test routes which gave me a huge advantage on test day.",
      status: 'featured',
      is_anonymous: false,
      created_at: daysAgo(7),
      instructor_id: instructors?.[1]?.id ?? null,
      student_id: students?.[1]?.id ?? null,
    },
    {
      reviewer_name: 'Priya K.',
      rating: 5,
      title: 'Excellent value for money',
      body: 'I bought the 10-lesson package and it was great value. My instructor was patient, professional, and really helped me build confidence on the road. The dual control car made me feel safe as a complete beginner.',
      status: 'featured',
      is_anonymous: false,
      created_at: daysAgo(14),
      instructor_id: instructors?.[2]?.id ?? null,
      student_id: students?.[2]?.id ?? null,
    },
    {
      reviewer_name: 'Michael R.',
      rating: 4,
      title: 'Great instructors, flexible scheduling',
      body: "Really happy with the quality of instruction. I work shifts so flexible scheduling was a must — they were able to accommodate early morning and weekend lessons without any issues. Would recommend.",
      status: 'approved',
      is_anonymous: false,
      created_at: daysAgo(21),
      instructor_id: instructors?.[0]?.id ?? null,
      student_id: students?.[3]?.id ?? null,
    },
    {
      reviewer_name: 'Emily W.',
      rating: 5,
      title: null,
      body: 'Could not have asked for a better experience. My instructor was calm, encouraging and really focused on making sure I understood proper road safety. Passed my test with zero faults!',
      status: 'approved',
      is_anonymous: false,
      created_at: daysAgo(30),
      instructor_id: instructors?.[1]?.id ?? null,
      student_id: students?.[4]?.id ?? null,
    },
    {
      reviewer_name: 'Daniel C.',
      rating: 5,
      title: 'Helped me overcome my fear of driving',
      body: "I'd been putting off learning to drive for years because of anxiety. My instructor was incredibly understanding and we took things at my pace. I'm now a confident driver and I owe it all to this school.",
      status: 'approved',
      is_anonymous: false,
      created_at: daysAgo(45),
      instructor_id: instructors?.[2]?.id ?? null,
    },
    {
      reviewer_name: 'Anonymous',
      rating: 4,
      title: 'Solid driving lessons',
      body: "Good quality lessons with a modern, well-maintained car. The instructor was always punctual and provided useful feedback after each lesson. The only minor issue was availability during peak times, but overall a great experience.",
      status: 'approved',
      is_anonymous: true,
      created_at: daysAgo(60),
    },
  ];

  const { data: inserted, error } = await admin
    .from('reviews')
    .insert(
      reviews.map((r) => ({
        organization_id: org.id,
        reviewer_name: r.reviewer_name,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: r.status,
        is_anonymous: r.is_anonymous,
        created_at: r.created_at,
        instructor_id: r.instructor_id ?? null,
        student_id: r.student_id ?? null,
      }))
    )
    .select();

  if (error) {
    console.error('  ⚠️ Reviews error:', error.message);
  } else {
    console.log(`  ✅ ${inserted?.length ?? 0} reviews created`);
    const featured = reviews.filter((r) => r.status === 'featured').length;
    const approved = reviews.filter((r) => r.status === 'approved').length;
    console.log(`     ${featured} featured, ${approved} approved`);
  }

  console.log('\n🎉 Reviews seeded!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
