import { getTenantData } from '@/lib/tenant';
import { createServerSupabaseClient } from '@/lib/database';
import type { LessonType, Instructor } from '@/types/database';
import type { Metadata } from 'next';
import { BookingWidget } from './booking-widget';

export const metadata: Metadata = {
  title: 'Book a Lesson',
};

/**
 * Public booking page — allows visitors to see available
 * lesson types and instructors. The actual booking flow
 * (date/time selection, conflict checking, payment) will
 * be built in a later phase as an interactive client component.
 * This server page provides the data foundation.
 */
export default async function BookPage() {
  const data = await getTenantData();
  if (!data) return <PageNotConfigured />;

  const client = await createServerSupabaseClient();
  const orgId = data.organization.id;

  const [lessonTypesRes, instructorsRes] = await Promise.all([
    client
      .from('lesson_types')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .eq('is_public', true)
      .order('sort_order'),
    client
      .from('instructors')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('display_name'),
  ]);

  const lessonTypes = (lessonTypesRes.data ?? []) as LessonType[];
  const instructors = (instructorsRes.data ?? []) as Instructor[];
  const primaryColor = data.settings?.primary_color ?? '#2563eb';
  const phone = data.settings?.contact_phone ?? data.organization.phone;

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Book a Lesson
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Choose your lesson type and preferred instructor to get started.
          </p>
        </div>

        <div className="mt-12">
          <BookingWidget
            lessonTypes={lessonTypes.map((lt) => ({
              id: lt.id,
              name: lt.name,
              price_cents: lt.price_cents,
              duration_minutes: lt.duration_minutes,
              transmission: lt.transmission,
              description: lt.description,
            }))}
            instructors={instructors.map((inst) => ({
              id: inst.id,
              display_name: inst.display_name,
              photo_url: inst.photo_url,
              transmission_type: inst.transmission_type,
            }))}
            primaryColor={primaryColor}
            phone={phone}
          />
        </div>
      </div>
    </div>
  );
}

function PageNotConfigured() {
  return (
    <div className="py-24 text-center">
      <p className="text-gray-500 dark:text-gray-400">This page is not available.</p>
    </div>
  );
}
