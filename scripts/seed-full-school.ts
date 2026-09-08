// ==================================================
// Full School Seed Script
// ==================================================
// Seeds realistic instructors, students, vehicles,
// availability, and bookings for a functional demo.
//
// Usage: npx tsx scripts/seed-full-school.ts

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

async function seedFullSchool() {
  console.log('\n🏫 Seeding full school data...\n');

  // 1. Get the organization
  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', 'sydney-driving-academy')
    .single();

  if (!org) {
    console.error('❌ Organization not found. Run seed-demo.ts first.');
    process.exit(1);
  }

  const orgId = org.id;
  console.log(`  Organization: ${orgId}`);

  // 2. Create instructor auth users
  const instructorUsers = [
    { email: 'james.wilson@example.com', name: 'James Wilson' },
    { email: 'sarah.chen@example.com', name: 'Sarah Chen' },
    { email: 'mike.thompson@example.com', name: 'Mike Thompson' },
  ];

  const createdInstructorUsers: { id: string; email: string; name: string }[] = [];

  for (const iu of instructorUsers) {
    const { data: existing } = await admin.auth.admin.listUsers();
    let user = existing?.users?.find((u) => u.email === iu.email);

    if (!user) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: iu.email,
        password: 'Instructor123!',
        email_confirm: true,
        user_metadata: { full_name: iu.name },
      });
      if (error) {
        console.error(`  ⚠️ Failed to create user ${iu.email}:`, error.message);
        continue;
      }
      user = created.user;
    }

    createdInstructorUsers.push({ id: user.id, email: iu.email, name: iu.name });

    // Add org membership as instructor role
    const { data: existingMem } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingMem) {
      await admin.from('organization_members').insert({
        organization_id: orgId,
        user_id: user.id,
        role: 'instructor',
        status: 'active',
      });
    }
  }

  console.log(`  ✅ ${createdInstructorUsers.length} instructor users created`);

  // 3. Create instructor profiles
  const instructors = createdInstructorUsers.map((u, i) => ({
    organization_id: orgId,
    user_id: u.id,
    display_name: u.name,
    phone: `041${i + 1} 000 ${100 + i}`,
    email: u.email,
    bio: [
      '10+ years of experience teaching learners of all ages. Patient and thorough approach to building confident drivers.',
      'Specialises in nervous drivers and test preparation. Bilingual English/Mandarin instructor.',
      'Former racing enthusiast turned driving instructor. Expert in defensive driving techniques.',
    ][i],
    license_number: `DI-${2024000 + i}`,
    license_expiry: '2027-12-31',
    transmission_type: i === 2 ? 'manual' : 'automatic' as const,
    is_active: true,
    max_daily_lessons: 8,
    default_lesson_duration: 60,
  }));

  const { data: instructorData, error: instrErr } = await admin
    .from('instructors')
    .upsert(instructors, { onConflict: 'organization_id,user_id' })
    .select();

  if (instrErr) {
    console.error('  ⚠️ Instructor profiles error:', instrErr.message);
  } else {
    console.log(`  ✅ ${instructorData?.length ?? 0} instructor profiles`);
  }

  // 4. Create student auth users
  const studentUsers = [
    { email: 'emma.jones@example.com', name: 'Emma Jones' },
    { email: 'liam.nguyen@example.com', name: 'Liam Nguyen' },
    { email: 'olivia.smith@example.com', name: 'Olivia Smith' },
    { email: 'noah.patel@example.com', name: 'Noah Patel' },
    { email: 'ava.garcia@example.com', name: 'Ava Garcia' },
  ];

  const createdStudentUsers: { id: string; email: string; name: string }[] = [];

  for (const su of studentUsers) {
    const { data: existing } = await admin.auth.admin.listUsers();
    let user = existing?.users?.find((u) => u.email === su.email);

    if (!user) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: su.email,
        password: 'Student123!',
        email_confirm: true,
        user_metadata: { full_name: su.name },
      });
      if (error) {
        console.error(`  ⚠️ Failed to create student ${su.email}:`, error.message);
        continue;
      }
      user = created.user;
    }

    createdStudentUsers.push({ id: user.id, email: su.email, name: su.name });

    // Add org membership as student role
    const { data: existingMem } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingMem) {
      await admin.from('organization_members').insert({
        organization_id: orgId,
        user_id: user.id,
        role: 'student',
        status: 'active',
      });
    }
  }

  console.log(`  ✅ ${createdStudentUsers.length} student users created`);

  // 5. Create student profiles
  const students = createdStudentUsers.map((u, i) => ({
    organization_id: orgId,
    user_id: u.id,
    display_name: u.name,
    phone: `042${i + 1} 000 ${200 + i}`,
    email: u.email,
    date_of_birth: `200${i + 1}-0${i + 3}-1${i + 5}`,
    pickup_address: [
      '45 Oxford Street, Surry Hills',
      '12 King Street, Newtown',
      '88 Bondi Road, Bondi',
      '33 Victoria Road, Parramatta',
      '7 Pacific Highway, Chatswood',
    ][i],
    pickup_suburb: ['Surry Hills', 'Newtown', 'Bondi', 'Parramatta', 'Chatswood'][i],
    pickup_postcode: ['2010', '2042', '2026', '2150', '2067'][i],
    learner_permit_number: `LP-${3000 + i}`,
    permit_expiry: '2027-06-30',
    preferred_transmission: 'automatic' as const,
    preferred_instructor_id: instructorData?.[i % (instructorData?.length ?? 1)]?.id ?? null,
    emergency_contact_name: ['David Jones', 'Hoa Nguyen', 'Mark Smith', 'Raj Patel', 'Maria Garcia'][i],
    emergency_contact_phone: `049${i + 1} 000 ${300 + i}`,
    is_active: true,
  }));

  const { data: studentData, error: studErr } = await admin
    .from('students')
    .upsert(students, { onConflict: 'organization_id,user_id' })
    .select();

  if (studErr) {
    console.error('  ⚠️ Student profiles error:', studErr.message);
  } else {
    console.log(`  ✅ ${studentData?.length ?? 0} student profiles`);
  }

  // 6. Create vehicles
  const vehicles = [
    {
      organization_id: orgId,
      name: 'White Corolla',
      make: 'Toyota',
      model: 'Corolla',
      year: 2023,
      registration: 'ABC-123',
      transmission: 'automatic' as const,
      status: 'active' as const,
      assigned_instructor_id: instructorData?.[0]?.id,
    },
    {
      organization_id: orgId,
      name: 'Silver Mazda3',
      make: 'Mazda',
      model: 'Mazda3',
      year: 2024,
      registration: 'XYZ-789',
      transmission: 'automatic' as const,
      status: 'active' as const,
      assigned_instructor_id: instructorData?.[1]?.id,
    },
    {
      organization_id: orgId,
      name: 'Blue i30 Manual',
      make: 'Hyundai',
      model: 'i30',
      year: 2022,
      registration: 'MAN-456',
      transmission: 'manual' as const,
      status: 'active' as const,
      assigned_instructor_id: instructorData?.[2]?.id,
    },
  ];

  const { data: vehicleData, error: vehErr } = await admin
    .from('vehicles')
    .insert(vehicles)
    .select();

  if (vehErr) {
    console.error('  ⚠️ Vehicles error:', vehErr.message);
  } else {
    console.log(`  ✅ ${vehicleData?.length ?? 0} vehicles`);
  }

  // 7. Create instructor availability (next 2 weeks)
  if (instructorData && instructorData.length > 0) {
    const availabilitySlots: any[] = [];
    const today = new Date();

    for (const instructor of instructorData) {
      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const date = new Date(today);
        date.setDate(date.getDate() + dayOffset);
        const dayOfWeek = date.getDay();

        // Skip weekends for some instructors
        if (dayOfWeek === 0) continue; // Sunday off for all
        if (dayOfWeek === 6 && instructor === instructorData[2]) continue; // Saturday off for Mike

        const dateStr = date.toISOString().split('T')[0];

        // Morning slot: 8am-12pm
        availabilitySlots.push({
          organization_id: orgId,
          instructor_id: instructor.id,
          date: dateStr,
          start_time: '08:00',
          end_time: '12:00',
          status: 'available',
        });

        // Afternoon slot: 1pm-5pm
        availabilitySlots.push({
          organization_id: orgId,
          instructor_id: instructor.id,
          date: dateStr,
          start_time: '13:00',
          end_time: '17:00',
          status: 'available',
        });
      }
    }

    const { data: availData, error: availErr } = await admin
      .from('instructor_availability')
      .insert(availabilitySlots)
      .select();

    if (availErr) {
      console.error('  ⚠️ Availability error:', availErr.message);
    } else {
      console.log(`  ✅ ${availData?.length ?? 0} availability slots (2 weeks)`);
    }
  }

  // 8. Get lesson types for bookings
  const { data: lessonTypes } = await admin
    .from('lesson_types')
    .select('id, name, duration_minutes, price_cents')
    .eq('organization_id', orgId)
    .eq('status', 'active');

  // 9. Create bookings (mix of past, today, and future)
  if (instructorData && studentData && lessonTypes && lessonTypes.length > 0) {
    const bookings: any[] = [];
    const now = new Date();

    // Past bookings (completed)
    for (let i = 0; i < 8; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i + 1));
      const dateStr = date.toISOString().split('T')[0];
      const student = studentData[i % studentData.length];
      const instructor = instructorData[i % instructorData.length];
      const lessonType = lessonTypes[i % lessonTypes.length];
      const hour = 9 + (i % 6);

      bookings.push({
        organization_id: orgId,
        student_id: student.id,
        instructor_id: instructor.id,
        lesson_type_id: lessonType.id,
        vehicle_id: vehicleData?.[i % (vehicleData?.length ?? 1)]?.id,
        date: dateStr,
        start_time: `${String(hour).padStart(2, '0')}:00`,
        end_time: `${String(hour + 1).padStart(2, '0')}:00`,
        duration_minutes: lessonType.duration_minutes,
        price_cents: lessonType.price_cents,
        status: 'completed',
        pickup_address: student.pickup_address,
        notes: i === 0 ? 'Great progress on parallel parking' : i === 3 ? 'Needs more practice on roundabouts' : null,
      });
    }

    // Today's bookings
    const todayStr = now.toISOString().split('T')[0];
    bookings.push({
      organization_id: orgId,
      student_id: studentData[0].id,
      instructor_id: instructorData[0].id,
      lesson_type_id: lessonTypes[0].id,
      vehicle_id: vehicleData?.[0]?.id,
      date: todayStr,
      start_time: '10:00',
      end_time: '11:00',
      duration_minutes: 60,
      price_cents: lessonTypes[0].price_cents,
      status: 'confirmed',
      pickup_address: studentData[0].pickup_address,
    });

    bookings.push({
      organization_id: orgId,
      student_id: studentData[1].id,
      instructor_id: instructorData[1].id,
      lesson_type_id: lessonTypes[0].id,
      vehicle_id: vehicleData?.[1]?.id,
      date: todayStr,
      start_time: '14:00',
      end_time: '15:00',
      duration_minutes: 60,
      price_cents: lessonTypes[0].price_cents,
      status: 'confirmed',
      pickup_address: studentData[1].pickup_address,
    });

    // Future bookings (next 5 days)
    for (let i = 1; i <= 5; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const student = studentData[i % studentData.length];
      const instructor = instructorData[i % instructorData.length];
      const lessonType = lessonTypes[0];
      const hour = 9 + i;

      bookings.push({
        organization_id: orgId,
        student_id: student.id,
        instructor_id: instructor.id,
        lesson_type_id: lessonType.id,
        vehicle_id: vehicleData?.[i % (vehicleData?.length ?? 1)]?.id,
        date: dateStr,
        start_time: `${String(hour).padStart(2, '0')}:00`,
        end_time: `${String(hour + 1).padStart(2, '0')}:00`,
        duration_minutes: lessonType.duration_minutes,
        price_cents: lessonType.price_cents,
        status: 'confirmed',
        pickup_address: student.pickup_address,
      });
    }

    const { data: bookingData, error: bookErr } = await admin
      .from('bookings')
      .insert(bookings)
      .select();

    if (bookErr) {
      console.error('  ⚠️ Bookings error:', bookErr.message);
    } else {
      console.log(`  ✅ ${bookingData?.length ?? 0} bookings (past + today + future)`);
    }
  }

  // 10. Link instructors to service areas
  if (instructorData) {
    const { data: areas } = await admin
      .from('service_areas')
      .select('id')
      .eq('organization_id', orgId);

    if (areas && areas.length > 0) {
      const links: any[] = [];
      for (const instructor of instructorData) {
        for (const area of areas) {
          links.push({
            instructor_id: instructor.id,
            service_area_id: area.id,
            travel_buffer_minutes: 15,
          });
        }
      }

      const { error: linkErr } = await admin
        .from('instructor_service_areas')
        .insert(links);

      if (linkErr) {
        console.error('  ⚠️ Instructor-area links error:', linkErr.message);
      } else {
        console.log(`  ✅ ${links.length} instructor-area links`);
      }
    }
  }

  console.log('\n🎉 Full school seed complete!');
  console.log('\n  📊 Dashboard: http://localhost:3000/dashboard');
  console.log('  📅 Calendar:  http://localhost:3000/dashboard/calendar');
  console.log('  📚 Bookings:  http://localhost:3000/dashboard/bookings');
  console.log('  👨‍🎓 Students:  http://localhost:3000/dashboard/students');
  console.log('\n  Instructor logins (password: Instructor123!):');
  console.log('    james.wilson@example.com');
  console.log('    sarah.chen@example.com');
  console.log('    mike.thompson@example.com');
  console.log('\n  Student logins (password: Student123!):');
  console.log('    emma.jones@example.com');
  console.log('    olivia.smith@example.com');
  console.log('    liam.nguyen@example.com');
}

seedFullSchool().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
