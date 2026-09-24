'use client';

// ==================================================
// Today Mode — Client Actions
// ==================================================
// Quick action buttons for instructors: Start, Complete,
// No-Show, Call, Directions, Add Notes.

import { useState, useTransition, useActionState } from 'react';
import {
  startLessonAction,
  completeLessonAction,
  markNoShowAction,
  addLessonNotesAction,
  type TodayActionState,
} from './actions';

interface Props {
  bookingId: string;
  status: string;
  studentPhone: string | null;
  pickupAddress: string | null;
  primaryColor: string;
}

const initialState: TodayActionState = { success: false };

export function TodayLessonActions({ bookingId, status, studentPhone, pickupAddress, primaryColor }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notesState, notesAction, notesPending] = useActionState(addLessonNotesAction, initialState);

  function handleAction(action: (id: string) => Promise<TodayActionState>) {
    setError(null);
    startTransition(async () => {
      const result = await action(bookingId);
      if (!result.success) setError(result.error ?? 'Action failed');
    });
  }

  // Build Google Maps directions URL
  const directionsUrl = pickupAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupAddress)}`
    : null;

  return (
    <div className="space-y-3">
      {/* Primary actions */}
      <div className="flex flex-wrap gap-2">
        {/* Call */}
        {studentPhone && (
          <a
            href={`tel:${studentPhone}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            📞 Call
          </a>
        )}

        {/* Directions */}
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            🗺️ Directions
          </a>
        )}

        {/* Start Lesson */}
        {(status === 'new_request' || status === 'contacted') && (
          <button
            onClick={() => handleAction(startLessonAction)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            ▶️ Start Lesson
          </button>
        )}

        {/* Complete Lesson */}
        {status === 'confirmed' && (
          <button
            onClick={() => handleAction(completeLessonAction)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            ✅ Complete
          </button>
        )}

        {/* No-show */}
        {status === 'confirmed' && (
          <button
            onClick={() => handleAction(markNoShowAction)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            ❌ No-Show
          </button>
        )}

        {/* Add Notes */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          📝 Notes
        </button>
      </div>

      {/* Notes form */}
      {showNotes && (
        <form action={notesAction} className="space-y-2">
          <input type="hidden" name="booking_id" value={bookingId} />
          <textarea
            name="notes"
            rows={2}
            required
            placeholder="Add lesson notes…"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-xs text-gray-900 dark:text-white"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={notesPending}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {notesPending ? 'Saving…' : 'Save Notes'}
            </button>
            {notesState.success && (
              <span className="text-xs text-green-600 dark:text-green-400">✓ Saved</span>
            )}
            {notesState.error && (
              <span className="text-xs text-red-600 dark:text-red-400">{notesState.error}</span>
            )}
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
