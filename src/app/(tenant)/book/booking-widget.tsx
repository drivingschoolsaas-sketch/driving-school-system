'use client';

import { useActionState, useState, useTransition } from 'react';
import { getAvailableSlotsAction, submitBookingRequestAction, type BookingRequestState } from './actions';
import type { AvailableSlot } from '@/services/availability-engine';

interface LessonTypeOption {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  transmission: string;
  description: string | null;
}

interface InstructorOption {
  id: string;
  display_name: string;
  photo_url: string | null;
  transmission_type: string;
}

interface Props {
  lessonTypes: LessonTypeOption[];
  instructors: InstructorOption[];
  primaryColor: string;
  phone?: string | null;
}

const initialState: BookingRequestState = { success: false };

export function BookingWidget({ lessonTypes, instructors, primaryColor, phone }: Props) {
  const [selectedLessonType, setSelectedLessonType] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(submitBookingRequestAction, initialState);

  const selectedLT = lessonTypes.find((lt) => lt.id === selectedLessonType);

  // Filter instructors by transmission compatibility
  const filteredInstructors = selectedLT
    ? instructors.filter(
        (i) =>
          i.transmission_type === 'both' ||
          selectedLT.transmission === 'both' ||
          i.transmission_type === selectedLT.transmission
      )
    : instructors;

  async function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError(null);

    if (!selectedInstructor || !selectedLT || !date) return;

    setLoadingSlots(true);
    try {
      const result = await getAvailableSlotsAction(
        selectedInstructor,
        date,
        selectedLT.duration_minutes
      );
      setSlots(result);
      if (result.length === 0) {
        setSlotsError('No available slots on this date. Try another day.');
      }
    } catch {
      setSlotsError('Failed to load available times.');
    } finally {
      setLoadingSlots(false);
    }
  }

  // Get min date (today)
  const today = new Date().toISOString().split('T')[0];
  // Max date (60 days out)
  const maxDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (state.success) {
    return (
      <div className="rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">
          Booking Request Submitted!
        </h2>
        <p className="mt-2 text-green-700 dark:text-green-300">
          We&apos;ll get back to you shortly to confirm your lesson.
        </p>
        {phone && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Questions? Call us at{' '}
            <a href={`tel:${phone}`} className="font-semibold hover:underline" style={{ color: primaryColor }}>
              {phone}
            </a>
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg px-6 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: primaryColor }}
        >
          Book Another Lesson
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Step 1: Choose Lesson Type */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          1. Choose a Lesson Type
        </h2>
        {lessonTypes.length === 0 ? (
          <p className="mt-4 text-gray-500 dark:text-gray-400">No lessons available at this time.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {lessonTypes.map((lt) => (
              <button
                key={lt.id}
                type="button"
                onClick={() => {
                  setSelectedLessonType(lt.id);
                  setSelectedSlot(null);
                  setSlots([]);
                }}
                className={`rounded-lg border p-5 text-left transition-all ${
                  selectedLessonType === lt.id
                    ? 'ring-2 border-transparent'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                style={
                  selectedLessonType === lt.id
                    ? { borderColor: primaryColor, '--tw-ring-color': primaryColor } as React.CSSProperties
                    : undefined
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{lt.name}</h3>
                    {lt.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{lt.description}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold whitespace-nowrap ml-4" style={{ color: primaryColor }}>
                    ${(lt.price_cents / 100).toFixed(0)}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{lt.duration_minutes} min</span>
                  <span>·</span>
                  <span className="capitalize">{lt.transmission}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Step 2: Choose Instructor */}
      {selectedLessonType && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            2. Choose an Instructor
          </h2>
          {filteredInstructors.length === 0 ? (
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              No instructors available for this lesson type.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredInstructors.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => {
                    setSelectedInstructor(inst.id);
                    setSelectedSlot(null);
                    setSlots([]);
                    setSelectedDate('');
                  }}
                  className={`rounded-lg border p-5 text-center transition-all ${
                    selectedInstructor === inst.id
                      ? 'ring-2 border-transparent'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  style={
                    selectedInstructor === inst.id
                      ? { borderColor: primaryColor, '--tw-ring-color': primaryColor } as React.CSSProperties
                      : undefined
                  }
                >
                  {inst.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={inst.photo_url}
                      alt={inst.display_name}
                      className="mx-auto h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                      <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                        {inst.display_name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {inst.display_name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {inst.transmission_type}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Step 3: Choose Date & Time */}
      {selectedLessonType && selectedInstructor && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            3. Choose Date &amp; Time
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select a date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={today}
                max={maxDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>

            {loadingSlots && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-transparent" style={{ borderTopColor: primaryColor }} />
                Loading available times…
              </div>
            )}

            {slotsError && !loadingSlots && (
              <p className="text-sm text-amber-600 dark:text-amber-400">{slotsError}</p>
            )}

            {slots.length > 0 && !loadingSlots && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {slots.length} time slot{slots.length !== 1 ? 's' : ''} available
                </p>
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const start = new Date(slot.start);
                    const isSelected = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                          isSelected
                            ? 'text-white border-transparent'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                        style={isSelected ? { backgroundColor: primaryColor } : undefined}
                      >
                        {start.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 4: Contact Details & Submit */}
      {selectedSlot && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            4. Your Details
          </h2>
          <form action={formAction} className="mt-4 space-y-4 max-w-md">
            <input type="hidden" name="instructor_id" value={selectedInstructor!} />
            <input type="hidden" name="lesson_type_id" value={selectedLessonType!} />
            <input type="hidden" name="slot_start" value={selectedSlot.start} />
            <input type="hidden" name="slot_end" value={selectedSlot.end} />

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedLT?.name} — ${((selectedLT?.price_cents ?? 0) / 100).toFixed(0)}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {new Date(selectedSlot.start).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {new Date(selectedSlot.start).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {filteredInstructors.find((i) => i.id === selectedInstructor)?.display_name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="customer_name"
                required
                minLength={2}
                maxLength={100}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="customer_email"
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="customer_phone"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pickup Address
              </label>
              <input
                type="text"
                name="pickup_address"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Where should the instructor pick you up?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                maxLength={1000}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Anything we should know?"
              />
            </div>

            {state.error && (
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {isPending ? 'Submitting…' : 'Submit Booking Request'}
            </button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              This is a request — we&apos;ll contact you to confirm.
            </p>
          </form>
        </section>
      )}
    </div>
  );
}
