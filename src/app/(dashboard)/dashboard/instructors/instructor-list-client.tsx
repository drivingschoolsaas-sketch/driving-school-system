'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Instructor } from '@/types/database';

interface Props {
  instructors: Instructor[];
  primaryColor: string;
}

export function InstructorList({ instructors, primaryColor }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? instructors.filter((inst) => {
        const q = search.toLowerCase();
        return (
          inst.display_name.toLowerCase().includes(q) ||
          inst.email?.toLowerCase().includes(q) ||
          inst.phone?.toLowerCase().includes(q)
        );
      })
    : instructors;

  if (instructors.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
        <p className="text-3xl mb-3">🚗</p>
        <p className="font-medium text-gray-900 dark:text-white">No instructors yet</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add your first instructor to start scheduling lessons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {instructors.length > 3 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search instructors…"
          className="w-full sm:w-72 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          No instructors matching &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inst) => (
            <Link
              key={inst.id}
              href={`/dashboard/instructors/${inst.id}`}
              className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                {inst.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inst.photo_url}
                    alt={inst.display_name}
                    className="h-12 w-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 shrink-0">
                    <span className="text-lg font-bold text-gray-500 dark:text-gray-300">
                      {inst.display_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {inst.display_name}
                  </h3>
                  {inst.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {inst.email}
                    </p>
                  )}
                  {inst.phone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{inst.phone}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    inst.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {inst.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span
                  className="rounded-full px-2 py-0.5 capitalize"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  {inst.transmission_type}
                </span>
                <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                  {inst.default_lesson_duration} min default
                </span>
                {inst.max_daily_lessons && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                    Max {inst.max_daily_lessons}/day
                  </span>
                )}
                {inst.license_number && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                    Licensed
                  </span>
                )}
              </div>

              {inst.bio && (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {inst.bio}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
