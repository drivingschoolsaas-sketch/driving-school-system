'use client';

// ==================================================
// Booking Action Buttons (Client Component)
// ==================================================
// Status transition buttons + cancel with reason dialog.

import { useState, useTransition } from 'react';
import { transitionStatusAction, cancelBookingAction, rescheduleBookingAction, resendConfirmationAction } from './actions';

// Valid transitions — mirrors booking-service VALID_TRANSITIONS
const VALID_TRANSITIONS: Record<string, string[]> = {
  new_request: ['contacted', 'confirmed', 'rejected', 'cancelled'],
  contacted: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

const STATUS_LABELS: Record<string, string> = {
  contacted: '📞 Mark Contacted',
  confirmed: '✅ Confirm',
  completed: '🏁 Complete',
  rejected: '❌ Reject',
  cancelled: '🚫 Cancel',
  no_show: '⚠️ No Show',
};

const STATUS_BUTTON_STYLES: Record<string, string> = {
  contacted: 'bg-orange-600 hover:bg-orange-700 text-white',
  confirmed: 'bg-green-600 hover:bg-green-700 text-white',
  completed: 'bg-blue-600 hover:bg-blue-700 text-white',
  rejected: 'bg-red-600 hover:bg-red-700 text-white',
  cancelled: 'bg-gray-600 hover:bg-gray-700 text-white',
  no_show: 'bg-red-500 hover:bg-red-600 text-white',
};

interface BookingActionsProps {
  bookingId: string;
  currentStatus: string;
  confirmationSentAt?: string | null;
  bookingReference?: string | null;
  studentName?: string;
  lessonType?: string;
  date?: string;
  time?: string;
}

const TERMINAL_STATUSES = ['completed', 'cancelled', 'rejected', 'no_show'];

export function BookingActions({ bookingId, currentStatus, confirmationSentAt, bookingReference, studentName, lessonType, date, time }: BookingActionsProps) {
  const transitions = VALID_TRANSITIONS[currentStatus] ?? [];
  const [isPending, startTransition] = useTransition();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDestructive, setPendingDestructive] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleData, setRescheduleData] = useState({ date: '', start: '', end: '', reason: '' });
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const canReschedule = !TERMINAL_STATUSES.includes(currentStatus);
  const isConfirmed = currentStatus === 'confirmed';

  if (transitions.length === 0 && !canReschedule) return null;

  const DESTRUCTIVE_STATUSES = ['no_show', 'rejected', 'completed'];

  function handleTransition(newStatus: string) {
    if (newStatus === 'cancelled') {
      setShowCancelDialog(true);
      return;
    }
    if (newStatus === 'confirmed') {
      setShowConfirmModal(true);
      return;
    }
    if (DESTRUCTIVE_STATUSES.includes(newStatus)) {
      setPendingDestructive(newStatus);
      return;
    }

    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await transitionStatusAction(bookingId, newStatus);
      if (!result.success) {
        setError(result.error ?? 'Failed');
      }
    });
  }

  function confirmDestructive() {
    if (!pendingDestructive) return;
    const status = pendingDestructive;
    setPendingDestructive(null);
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await transitionStatusAction(bookingId, status);
      if (!result.success) {
        setError(result.error ?? 'Failed');
      }
    });
  }

  function handleConfirmAndNotify() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await transitionStatusAction(bookingId, 'confirmed');
      if (!result.success) {
        setError(result.error ?? 'Failed to confirm');
      } else {
        setSuccessMsg('Booking confirmed and notification sent!');
      }
      setShowConfirmModal(false);
    });
  }

  function handleResendConfirmation() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await resendConfirmationAction(bookingId);
      if (!result.success) {
        setError(result.error ?? 'Failed to resend');
      } else {
        setSuccessMsg('Confirmation email resent!');
      }
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId, cancelReason);
      if (!result.success) {
        setError(result.error ?? 'Failed');
      }
      setShowCancelDialog(false);
      setCancelReason('');
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((status) => (
          <button
            key={status}
            onClick={() => handleTransition(status)}
            disabled={isPending}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${STATUS_BUTTON_STYLES[status] ?? 'bg-gray-200 text-gray-800'}`}
          >
            {STATUS_LABELS[status] ?? status}
          </button>
        ))}
        {canReschedule && (
          <button
            onClick={() => setShowReschedule(!showReschedule)}
            disabled={isPending}
            className="rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
          >
            🔄 Reschedule
          </button>
        )}
        {isConfirmed && (
          <button
            onClick={handleResendConfirmation}
            disabled={isPending}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
          >
            📧 Resend Confirmation
          </button>
        )}
      </div>

      {isConfirmed && confirmationSentAt && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ Confirmation sent {new Date(confirmationSentAt).toLocaleString()}
          {bookingReference && <span className="ml-1 font-mono">({bookingReference})</span>}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {successMsg && (
        <p className="text-xs text-green-600 dark:text-green-400">{successMsg}</p>
      )}

      {showConfirmModal && (
        <div className="mt-2 rounded-lg border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">
            Confirm & Notify
          </h3>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            This will confirm the booking and send a confirmation email with calendar links to the student.
          </p>
          {(studentName || lessonType || date) && (
            <div className="rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 p-3 text-xs space-y-1">
              {studentName && <div><span className="text-gray-500">Student:</span> <span className="font-medium text-gray-900 dark:text-white">{studentName}</span></div>}
              {lessonType && <div><span className="text-gray-500">Lesson:</span> <span className="font-medium text-gray-900 dark:text-white">{lessonType}</span></div>}
              {date && <div><span className="text-gray-500">Date:</span> <span className="font-medium text-gray-900 dark:text-white">{date}</span></div>}
              {time && <div><span className="text-gray-500">Time:</span> <span className="font-medium text-gray-900 dark:text-white">{time}</span></div>}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConfirmAndNotify}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? 'Confirming…' : '✅ Confirm & Send Email'}
            </button>
            <button
              onClick={() => setShowConfirmModal(false)}
              className="rounded-lg bg-gray-200 dark:bg-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="mt-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 p-3 space-y-2">
          <p className="text-xs font-medium text-purple-800 dark:text-purple-200">
            Reschedule to a new date/time
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Date</label>
              <input
                type="date"
                value={rescheduleData.date}
                onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">Start</label>
              <input
                type="time"
                value={rescheduleData.start}
                onChange={(e) => setRescheduleData({ ...rescheduleData, start: e.target.value })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">End</label>
              <input
                type="time"
                value={rescheduleData.end}
                onChange={(e) => setRescheduleData({ ...rescheduleData, end: e.target.value })}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="Reason (optional)"
            value={rescheduleData.reason}
            onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!rescheduleData.date || !rescheduleData.start || !rescheduleData.end) {
                  setError('Date, start time, and end time are required.');
                  return;
                }
                setError(null);
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set('new_date', rescheduleData.date);
                  fd.set('new_start_time', rescheduleData.start);
                  fd.set('new_end_time', rescheduleData.end);
                  if (rescheduleData.reason) fd.set('reason', rescheduleData.reason);
                  const result = await rescheduleBookingAction(bookingId, fd);
                  if (!result.success) {
                    setError(result.error ?? 'Failed to reschedule');
                  } else {
                    setShowReschedule(false);
                    setRescheduleData({ date: '', start: '', end: '', reason: '' });
                  }
                });
              }}
              disabled={isPending}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {isPending ? 'Rescheduling…' : 'Confirm Reschedule'}
            </button>
            <button
              onClick={() => { setShowReschedule(false); setRescheduleData({ date: '', start: '', end: '', reason: '' }); }}
              className="rounded-lg bg-gray-200 dark:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {showCancelDialog && (
        <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Cancellation reason (optional)
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            placeholder="Enter reason..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Cancelling…' : 'Confirm Cancel'}
            </button>
            <button
              onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}
              className="rounded-lg bg-gray-200 dark:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {pendingDestructive && (
        <div className="mt-2 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
          <p className="text-xs font-medium text-red-800 dark:text-red-200">
            {pendingDestructive === 'no_show' && 'Mark this booking as No Show? This cannot be undone.'}
            {pendingDestructive === 'rejected' && 'Reject this booking? This cannot be undone.'}
            {pendingDestructive === 'completed' && 'Mark this booking as completed?'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmDestructive}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Processing…' : `Yes, ${STATUS_LABELS[pendingDestructive]?.replace(/^[^\s]+\s/, '') ?? pendingDestructive}`}
            </button>
            <button
              onClick={() => setPendingDestructive(null)}
              className="rounded-lg bg-gray-200 dark:bg-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
