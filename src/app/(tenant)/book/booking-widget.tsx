'use client';

import { useActionState, useState, useTransition, useEffect, useRef, useCallback } from 'react';
import {
  getAvailableSlotsAction,
  getMonthAvailabilityAction,
  getMultiInstructorSlotsAction,
  submitBookingRequestAction,
  type BookingRequestState,
} from './actions';
import type { AvailableSlot } from '@/services/availability-engine';
import { formatPrice } from '@/lib/format';

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

interface SlotWithInstructor extends AvailableSlot {
  instructor_id: string;
  instructor_name: string;
}

interface Props {
  lessonTypes: LessonTypeOption[];
  instructors: InstructorOption[];
  primaryColor: string;
  phone?: string | null;
  currency?: string | null;
}

const ANY_INSTRUCTOR = '__any__';
const initialState: BookingRequestState = { success: false };

function scrollToEl(id: string) {
  setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function groupSlotsByPeriod(slots: Array<SlotWithInstructor | AvailableSlot>) {
  const morning: typeof slots = [];
  const afternoon: typeof slots = [];
  const evening: typeof slots = [];
  for (const s of slots) {
    const h = new Date(s.start).getHours();
    if (h < 12) morning.push(s);
    else if (h < 17) afternoon.push(s);
    else evening.push(s);
  }
  return { morning, afternoon, evening };
}

export function BookingWidget({ lessonTypes, instructors, primaryColor, phone, currency }: Props) {
  const [selectedLessonType, setSelectedLessonType] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<SlotWithInstructor[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotWithInstructor | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthAvailability, setMonthAvailability] = useState<Record<string, boolean>>({});
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [state, formAction, isPending] = useActionState(submitBookingRequestAction, initialState);

  const selectedLT = lessonTypes.find((lt) => lt.id === selectedLessonType);

  const filteredInstructors = selectedLT
    ? instructors.filter(
        (i) =>
          i.transmission_type === 'both' ||
          selectedLT.transmission === 'both' ||
          i.transmission_type === selectedLT.transmission
      )
    : instructors;

  const isAnyInstructor = selectedInstructor === ANY_INSTRUCTOR;
  const resolvedInstructorIds = isAnyInstructor
    ? filteredInstructors.map((i) => i.id)
    : selectedInstructor
      ? [selectedInstructor]
      : [];

  // Load month availability when instructor or month changes
  const loadMonthAvail = useCallback(async () => {
    if (!resolvedInstructorIds.length || !selectedLT) return;
    setLoadingMonth(true);
    try {
      const avail = await getMonthAvailabilityAction(
        resolvedInstructorIds,
        calMonth,
        selectedLT.duration_minutes
      );
      setMonthAvailability(avail);
    } catch {
      setMonthAvailability({});
    } finally {
      setLoadingMonth(false);
    }
  }, [resolvedInstructorIds.join(','), calMonth, selectedLT?.duration_minutes]);

  useEffect(() => {
    if (resolvedInstructorIds.length && selectedLT) {
      loadMonthAvail();
    }
  }, [loadMonthAvail]);

  async function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError(null);

    if (!resolvedInstructorIds.length || !selectedLT) return;

    setLoadingSlots(true);
    try {
      if (isAnyInstructor) {
        const result = await getMultiInstructorSlotsAction(
          resolvedInstructorIds,
          date,
          selectedLT.duration_minutes
        );
        setSlots(result);
        if (result.length === 0) {
          setSlotsError('No available slots on this date. Try another day.');
        }
      } else {
        const result = await getAvailableSlotsAction(
          selectedInstructor!,
          date,
          selectedLT.duration_minutes
        );
        const withInstructor = result.map((s) => ({
          ...s,
          instructor_id: selectedInstructor!,
          instructor_name: filteredInstructors.find((i) => i.id === selectedInstructor)?.display_name ?? '',
        }));
        setSlots(withInstructor);
        if (withInstructor.length === 0) {
          setSlotsError('No available slots on this date. Try another day.');
        }
      }
    } catch {
      setSlotsError('Failed to load available times.');
    } finally {
      setLoadingSlots(false);
    }
  }

  const resolvedSlotInstructorName = selectedSlot
    ? (isAnyInstructor
        ? selectedSlot.instructor_name
        : filteredInstructors.find((i) => i.id === selectedInstructor)?.display_name)
    : undefined;

  // Success view
  if (state.success) {
    return (
      <div className="rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-8">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">
            Booking Confirmed!
          </h2>
          <p className="mt-2 text-green-700 dark:text-green-300">
            Your lesson has been booked. Check your email for confirmation details.
          </p>
        </div>

        <div className="mt-6 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Booking Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Lesson</span>
              <p className="font-medium text-gray-900 dark:text-white">{selectedLT?.name}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Instructor</span>
              <p className="font-medium text-gray-900 dark:text-white">{resolvedSlotInstructorName}</p>
            </div>
            {selectedSlot && (
              <>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedSlot.start).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Time</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    {' – '}
                    {new Date(selectedSlot.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </>
            )}
            {selectedLT && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Price</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatPrice(selectedLT.price_cents, currency)}
                </p>
              </div>
            )}
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <p className="font-medium text-green-700 dark:text-green-300">Confirmed</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center space-y-3">
          {phone && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Questions? Call us at{' '}
              <a href={`tel:${phone}`} className="font-semibold hover:underline" style={{ color: primaryColor }}>
                {phone}
              </a>
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg px-6 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Book Another Lesson
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-3 lg:gap-8">
      {/* Main flow — left 2 cols */}
      <div className="lg:col-span-2 space-y-8">
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: 'Lesson', done: !!selectedLessonType },
            { n: 2, label: 'Instructor', done: !!selectedInstructor },
            { n: 3, label: 'Date & Time', done: !!selectedSlot },
            { n: 4, label: 'Details', done: state.success },
          ].map((step, i) => (
            <div key={step.n} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                  step.done
                    ? 'text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
                style={step.done ? { backgroundColor: primaryColor } : undefined}
              >
                {step.done ? '✓' : step.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step.done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {step.label}
              </span>
              {i < 3 && <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />}
            </div>
          ))}
        </div>

        {/* Step 1: Lesson Type */}
        <section id="step-1">
          <StepHeader number={1} title="Choose a Lesson Type" done={!!selectedLessonType} primaryColor={primaryColor} />
          {lessonTypes.length === 0 ? (
            <p className="mt-4 text-gray-500 dark:text-gray-400">No lessons available at this time.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lessonTypes.map((lt) => (
                <button
                  key={lt.id}
                  type="button"
                  onClick={() => {
                    setSelectedLessonType(lt.id);
                    setSelectedSlot(null);
                    setSlots([]);
                    setSelectedInstructor(null);
                    scrollToEl('step-2');
                  }}
                  className={`rounded-xl border p-5 text-left transition-all ${
                    selectedLessonType === lt.id
                      ? 'ring-2 shadow-md border-transparent'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
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
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{lt.description}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold whitespace-nowrap ml-4" style={{ color: primaryColor }}>
                      {formatPrice(lt.price_cents, currency)}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5">
                      {lt.duration_minutes} min
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 capitalize">
                      {lt.transmission}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Step 2: Instructor */}
        {selectedLessonType && (
          <section id="step-2">
            <StepHeader number={2} title="Choose an Instructor" done={!!selectedInstructor} primaryColor={primaryColor} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
              {/* "Any Instructor" card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedInstructor(ANY_INSTRUCTOR);
                  setSelectedSlot(null);
                  setSlots([]);
                  setSelectedDate('');
                  scrollToEl('step-3');
                }}
                className={`rounded-xl border p-4 text-center transition-all ${
                  isAnyInstructor
                    ? 'ring-2 shadow-md border-transparent'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                }`}
                style={
                  isAnyInstructor
                    ? { borderColor: primaryColor, '--tw-ring-color': primaryColor } as React.CSSProperties
                    : undefined
                }
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  First Available
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Earliest slot
                </p>
              </button>

              {filteredInstructors.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => {
                    setSelectedInstructor(inst.id);
                    setSelectedSlot(null);
                    setSlots([]);
                    setSelectedDate('');
                    scrollToEl('step-3');
                  }}
                  className={`rounded-xl border p-4 text-center transition-all ${
                    selectedInstructor === inst.id
                      ? 'ring-2 shadow-md border-transparent'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                  }`}
                  style={
                    selectedInstructor === inst.id
                      ? { borderColor: primaryColor, '--tw-ring-color': primaryColor } as React.CSSProperties
                      : undefined
                  }
                >
                  {inst.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={inst.photo_url} alt={inst.display_name} className="mx-auto h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                      <span className="text-lg font-bold text-gray-500 dark:text-gray-400">
                        {inst.display_name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {inst.display_name}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {inst.transmission_type}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 3: Date & Time */}
        {selectedLessonType && selectedInstructor && (
          <section id="step-3">
            <StepHeader number={3} title="Choose Date & Time" done={!!selectedSlot} primaryColor={primaryColor} />
            <div className="mt-4 space-y-5">
              {/* Visual Calendar */}
              <AvailabilityCalendar
                calMonth={calMonth}
                setCalMonth={setCalMonth}
                monthAvailability={monthAvailability}
                loadingMonth={loadingMonth}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  handleDateSelect(d);
                }}
                primaryColor={primaryColor}
              />

              {/* Loading */}
              {loadingSlots && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-transparent" style={{ borderTopColor: primaryColor }} />
                  Loading available times…
                </div>
              )}

              {slotsError && !loadingSlots && (
                <p className="text-sm text-amber-600 dark:text-amber-400">{slotsError}</p>
              )}

              {/* Time Slots grouped by period */}
              {slots.length > 0 && !loadingSlots && (
                <TimeSlotPicker
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSelect={(s) => {
                    setSelectedSlot(s);
                    scrollToEl('step-4');
                  }}
                  primaryColor={primaryColor}
                  showInstructor={isAnyInstructor}
                />
              )}
            </div>
          </section>
        )}

        {/* Step 4: Details */}
        {selectedSlot && (
          <section id="step-4">
            <StepHeader number={4} title="Your Details" done={false} primaryColor={primaryColor} />
            <form action={formAction} className="mt-4 space-y-4 max-w-md">
              <input type="hidden" name="instructor_id" value={selectedSlot.instructor_id} />
              <input type="hidden" name="lesson_type_id" value={selectedLessonType!} />
              <input type="hidden" name="slot_start" value={selectedSlot.start} />
              <input type="hidden" name="slot_end" value={selectedSlot.end} />

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
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
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
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pickup Address
                </label>
                <input
                  type="text"
                  name="pickup_address"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                  placeholder="Where should the instructor pick you up?"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
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
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                  placeholder="Anything we should know?"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                />
              </div>

              {state.error && (
                <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 hover:shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {isPending ? 'Confirming…' : `Confirm Booking — ${formatPrice(selectedLT?.price_cents ?? 0, currency)}`}
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Instant confirmation · No payment required
              </p>
            </form>
          </section>
        )}
      </div>

      {/* Sticky summary sidebar — desktop */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <BookingSummary
            lessonType={selectedLT}
            instructorName={
              isAnyInstructor
                ? (selectedSlot?.instructor_name ?? 'First Available')
                : filteredInstructors.find((i) => i.id === selectedInstructor)?.display_name
            }
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            primaryColor={primaryColor}
            currency={currency}
          />
        </div>
      </div>

      {/* Mobile bottom bar — shows after lesson type selected */}
      {selectedLT && !selectedSlot && (
        <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedLT.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedLT.duration_minutes} min</p>
            </div>
            <span className="text-lg font-bold" style={{ color: primaryColor }}>
              {formatPrice(selectedLT.price_cents, currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub Components ─────────────────────────────────

function StepHeader({ number, title, done, primaryColor }: { number: number; title: string; done: boolean; primaryColor: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
          done ? 'text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}
        style={done ? { backgroundColor: primaryColor } : undefined}
      >
        {done ? '✓' : number}
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
    </div>
  );
}

function AvailabilityCalendar({
  calMonth,
  setCalMonth,
  monthAvailability,
  loadingMonth,
  selectedDate,
  onSelectDate,
  primaryColor,
}: {
  calMonth: string;
  setCalMonth: (m: string) => void;
  monthAvailability: Record<string, boolean>;
  loadingMonth: boolean;
  selectedDate: string;
  onSelectDate: (d: string) => void;
  primaryColor: string;
}) {
  const [year, month] = calMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const today = new Date().toISOString().split('T')[0];

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const todayMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const maxMonth = (() => {
    const d = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          disabled={calMonth <= todayMonth}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {monthName}
          {loadingMonth && (
            <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-transparent" style={{ borderTopColor: primaryColor }} />
          )}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          disabled={calMonth >= maxMonth}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty offset cells */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${calMonth}-${String(day).padStart(2, '0')}`;
          const isPast = dateStr < today;
          const isAvail = monthAvailability[dateStr] === true;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;

          return (
            <button
              key={day}
              type="button"
              disabled={isPast || !isAvail}
              onClick={() => onSelectDate(dateStr)}
              className={`relative aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                isSelected
                  ? 'text-white shadow-sm'
                  : isPast || !isAvail
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              style={isSelected ? { backgroundColor: primaryColor } : undefined}
            >
              {day}
              {isAvail && !isSelected && !isPast && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
              {isToday && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
          Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          Unavailable
        </span>
      </div>
    </div>
  );
}

function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelect,
  primaryColor,
  showInstructor,
}: {
  slots: SlotWithInstructor[];
  selectedSlot: SlotWithInstructor | null;
  onSelect: (s: SlotWithInstructor) => void;
  primaryColor: string;
  showInstructor: boolean;
}) {
  const { morning, afternoon, evening } = groupSlotsByPeriod(slots);

  const renderGroup = (label: string, icon: string, groupSlots: SlotWithInstructor[]) => {
    if (groupSlots.length === 0) return null;
    return (
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span>{icon}</span> {label}
        </p>
        <div className="flex flex-wrap gap-2">
          {groupSlots.map((slot) => {
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            const isSelected = selectedSlot?.start === slot.start && selectedSlot?.instructor_id === slot.instructor_id;
            return (
              <button
                key={`${slot.start}-${slot.instructor_id}`}
                type="button"
                onClick={() => onSelect(slot)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'text-white border-transparent shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm'
                }`}
                style={isSelected ? { backgroundColor: primaryColor } : undefined}
                title={`${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
              >
                <span>
                  {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
                {showInstructor && (
                  <span className={`block text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                    {slot.instructor_name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {slots.length} time slot{slots.length !== 1 ? 's' : ''} available
      </p>
      {renderGroup('Morning', '🌅', morning as SlotWithInstructor[])}
      {renderGroup('Afternoon', '☀️', afternoon as SlotWithInstructor[])}
      {renderGroup('Evening', '🌙', evening as SlotWithInstructor[])}
    </div>
  );
}

function BookingSummary({
  lessonType,
  instructorName,
  selectedDate,
  selectedSlot,
  primaryColor,
  currency,
}: {
  lessonType?: LessonTypeOption;
  instructorName?: string;
  selectedDate: string;
  selectedSlot: SlotWithInstructor | null;
  primaryColor: string;
  currency?: string | null;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Booking Summary</h3>
      </div>
      <div className="p-5 space-y-3 text-sm">
        <SummaryRow label="Lesson" value={lessonType?.name} />
        <SummaryRow label="Duration" value={lessonType ? `${lessonType.duration_minutes} min` : undefined} />
        <SummaryRow label="Instructor" value={instructorName} />
        <SummaryRow
          label="Date"
          value={
            selectedDate
              ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })
              : undefined
          }
        />
        <SummaryRow
          label="Time"
          value={
            selectedSlot
              ? `${new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${new Date(selectedSlot.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
              : undefined
          }
        />

        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 dark:text-white">Total</span>
            <span className="text-xl font-bold" style={{ color: primaryColor }}>
              {lessonType ? formatPrice(lessonType.price_cents, currency) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-medium ${value ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}
