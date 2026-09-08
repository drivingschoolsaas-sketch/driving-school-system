import { getTenantData } from '@/lib/tenant';
import { createServerSupabaseClient } from '@/lib/database';
import type { ServiceArea } from '@/types/database';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service Areas',
};

export default async function AreasPage() {
  const data = await getTenantData();
  if (!data) return <PageNotConfigured />;

  const client = await createServerSupabaseClient();
  const { data: areasData } = await client
    .from('service_areas')
    .select('*')
    .eq('organization_id', data.organization.id)
    .eq('is_active', true)
    .order('name');

  const areas = (areasData ?? []) as ServiceArea[];

  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Service Areas
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            We provide driving lessons across the following areas.
          </p>
        </div>

        {areas.length === 0 ? (
          <p className="mt-12 text-center text-gray-500 dark:text-gray-400">
            Service area information coming soon.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <div
                key={area.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {area.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                  {area.suburb && <span>{area.suburb}</span>}
                  {area.postcode && (
                    <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                      {area.postcode}
                    </span>
                  )}
                  {area.state && (
                    <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                      {area.state}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
