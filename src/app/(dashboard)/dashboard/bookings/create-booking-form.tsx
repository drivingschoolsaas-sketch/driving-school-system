'use client';

// ==================================================
// Create Booking Form (Client Component)
// ==================================================

import { useActionState, useState } from 'react';
import { createBookingAction, type BookingActionState } from './actions';

interface Props {
  instructors: { id: string; display_name: string }[];
  students: { id: string; display_name: string }[];
  lessonTypes: { id: string; name: string; price_cents: number; duration_minutes: number }[];
  vehicles: { id: string; name: string }[];
  primaryColor: string;
}

const initialState: BookingActionState = { success: false };

export function CreateBookingForm({ instructors, students, lessonTypes, vehicles, primaryColor }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createBookingAction, initialState);
  const [selectedLessonType, setSelectedLessonType] = useState('');

  // Auto-calculate end time based on lesson type duration
  const lessonType = lessonTypes.find((lt) => lt.id === selectedLessonType);

  if (state.success && isOpen) {
    setIsOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: primaryColor }}
      >
        + New Booking
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                New Booking
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
              >
                ✕
              </button>
            </div>

            <form action={formAction} className="space-y-4 p-6">
              {/* Student */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Student *
                </label>
                <select
                  name="student_id"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Select student…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.display_name}</option>
                  ))}
                </select>
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Instructor *
                </label>
                <select
                  name="instructor_id"
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Select instructor…</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>{i.display_name}</option>
                  ))}
                </select>
              </div>

              {/* Lesson Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lesson Type *
                </label>
                <select
                  name="lesson_type_id"
                  required
                  value={selectedLessonType}
                  onChange={(e) => setSelectedLessonType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Select lesson type…</option>
                  {lessonTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} — ${(lt.price_cents / 100).toFixed(0)} ({lt.duration_minutes}min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start *
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End *
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                  {lessonType && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Duration: {lessonType.duration_minutes}min
                    </p>
                  )}
                </div>
              </div>

              {/* Vehicle (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle
                </label>
                <select
                  name="vehicle_id"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">No vehicle assigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Pickup Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pickup Address
                </label>
                <input
                  type="text"
                  name="pickup_address"
                  maxLength={500}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Enter pickup location"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price (cents) *
                </label>
                <input
                  type="number"
                  name="price_cents"
                  required
                  min={0}
                  defaultValue={lessonType?.price_cents ?? 0}
                  key={selectedLessonType} // reset when lesson type changes
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
                {lessonType && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Suggested: ${(lessonType.price_cents / 100).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={2000}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Optional notes"
                />
              </div>

              {state.error && (
                <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isPending ? 'Creating…' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
