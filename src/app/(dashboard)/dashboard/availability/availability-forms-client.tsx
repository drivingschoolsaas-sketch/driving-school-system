'use client';

import { useActionState, useState, useEffect, useTransition } from 'react';
import {
  createRuleAction,
  createExceptionAction,
  createBlockedTimeAction,
  deleteRuleAction,
  deleteExceptionAction,
  deleteBlockedTimeAction,
  type AvailabilityActionState,
} from './actions';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const BLOCKED_REASONS = [
  { value: 'lunch', label: 'Lunch' },
  { value: 'private_appointment', label: 'Private Appointment' },
  { value: 'vehicle_maintenance', label: 'Vehicle Maintenance' },
  { value: 'driving_test', label: 'Driving Test' },
  { value: 'annual_leave', label: 'Annual Leave' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'training', label: 'Training' },
  { value: 'admin_blocked', label: 'Admin Blocked' },
  { value: 'other', label: 'Other' },
];

const initialState: AvailabilityActionState = { success: false };

const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

// ── Add Rule Form ───────────────────────────────────

interface AddRuleProps {
  instructorId: string;
  primaryColor: string;
}

export function AddRuleForm({ instructorId, primaryColor }: AddRuleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createRuleAction, initialState);

  // Close modal on success (effect-based to avoid render-time side effects)
  useEffect(() => {
    if (state.success) {
      setIsOpen(false);
    }
  }, [state]);

  return (
    <>
      <button onClick={() => setIsOpen(true)}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: primaryColor }}>
        + Add Time Slot
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Time Slot</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
            </div>

            <form action={formAction} className="space-y-4 p-6">
              <input type="hidden" name="instructor_id" value={instructorId} />

              <div>
                <label className={labelClass}>Day *</label>
                <select name="day_of_week" required className={inputClass}>
                  {DAYS.map((d) => (
                    <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start *</label>
                  <input type="time" name="start_time" required defaultValue="08:00" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End *</label>
                  <input type="time" name="end_time" required defaultValue="17:00" className={inputClass} />
                </div>
              </div>

              {state.error && !state.success && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}>
                  {isPending ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Add Exception Form ──────────────────────────────

interface AddExceptionProps {
  instructorId: string;
  primaryColor: string;
}

export function AddExceptionForm({ instructorId, primaryColor }: AddExceptionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [state, formAction, isPending] = useActionState(createExceptionAction, initialState);

  // Close modal on success
  useEffect(() => {
    if (state.success) {
      setIsOpen(false);
    }
  }, [state]);

  return (
    <>
      <button onClick={() => setIsOpen(true)}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: primaryColor }}>
        + Add Exception
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Exception</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
            </div>

            <form action={formAction} className="space-y-4 p-6">
              <input type="hidden" name="instructor_id" value={instructorId} />

              <div>
                <label className={labelClass}>Date *</label>
                <input type="date" name="exception_date" required className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Type</label>
                <select name="is_available" value={isAvailable ? 'true' : 'false'}
                  onChange={(e) => setIsAvailable(e.target.value === 'true')} className={inputClass}>
                  <option value="false">Day Off (unavailable all day)</option>
                  <option value="true">Custom Hours (available with specific times)</option>
                </select>
              </div>

              {isAvailable && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Start *</label>
                    <input type="time" name="start_time" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>End *</label>
                    <input type="time" name="end_time" required className={inputClass} />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Reason</label>
                <input type="text" name="reason" maxLength={500} className={inputClass} placeholder="Optional" />
              </div>

              {state.error && !state.success && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}>
                  {isPending ? 'Adding…' : 'Add Exception'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Add Blocked Time Form ───────────────────────────

interface AddBlockedTimeProps {
  instructorId: string;
  primaryColor: string;
}

export function AddBlockedTimeForm({ instructorId, primaryColor }: AddBlockedTimeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [state, formAction, isPending] = useActionState(createBlockedTimeAction, initialState);

  // Close modal on success
  useEffect(() => {
    if (state.success) {
      setIsOpen(false);
    }
  }, [state]);

  return (
    <>
      <button onClick={() => setIsOpen(true)}
        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: primaryColor }}>
        + Block Time
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Block Time</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
            </div>

            <form action={formAction} className="space-y-4 p-6">
              <input type="hidden" name="instructor_id" value={instructorId} />
              <input type="hidden" name="is_all_day" value={isAllDay ? 'true' : 'false'} />

              <div>
                <label className={labelClass}>Date *</label>
                <input type="date" name="date" required className={inputClass} />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600" />
                  All day
                </label>
              </div>

              {!isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Start *</label>
                    <input type="time" name="start_time" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>End *</label>
                    <input type="time" name="end_time" required className={inputClass} />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>Reason *</label>
                <select name="reason" required className={inputClass}>
                  {BLOCKED_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <input type="text" name="notes" maxLength={1000} className={inputClass} placeholder="Optional" />
              </div>

              {state.error && !state.success && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}>
                  {isPending ? 'Blocking…' : 'Block Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Delete Buttons ──────────────────────────────────

export function DeleteRuleButton({ ruleId }: { ruleId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteRuleAction(ruleId);
      setShowConfirm(false);
    });
  }

  return (
    <>
      <button onClick={() => setShowConfirm(true)} disabled={isPending}
        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
        title="Remove">
        ✕
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">Remove this time slot?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteExceptionButton({ exceptionId }: { exceptionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteExceptionAction(exceptionId);
      setShowConfirm(false);
    });
  }

  return (
    <>
      <button onClick={() => setShowConfirm(true)} disabled={isPending}
        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
        title="Remove">
        ✕
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">Remove this exception?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteBlockedTimeButton({ blockedTimeId }: { blockedTimeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteBlockedTimeAction(blockedTimeId);
      setShowConfirm(false);
    });
  }

  return (
    <>
      <button onClick={() => setShowConfirm(true)} disabled={isPending}
        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
        title="Remove">
        ✕
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">Remove this blocked time?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
