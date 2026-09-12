'use client';

import { useState, useTransition } from 'react';
import { updateLessonTypeAction, deleteLessonTypeAction, type LessonTypeActionState } from './actions';
import type { LessonType } from '@/types/database';

interface Props {
  lessonType: LessonType;
  primaryColor: string;
}

export function LessonTypeRowActions({ lessonType, primaryColor }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => setEditOpen(true)}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Edit lesson type"
        >
          ✏️
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          title="Delete lesson type"
        >
          🗑️
        </button>
      </div>

      {editOpen && (
        <EditLessonTypeModal
          lessonType={lessonType}
          primaryColor={primaryColor}
          onClose={() => setEditOpen(false)}
        />
      )}

      {deleteOpen && (
        <DeleteLessonTypeModal
          lessonType={lessonType}
          primaryColor={primaryColor}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  );
}

// ── Edit Modal ──────────────────────────────────────

function EditLessonTypeModal({
  lessonType,
  primaryColor,
  onClose,
}: {
  lessonType: LessonType;
  primaryColor: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Handle checkbox — unchecked checkboxes are not included in FormData
    if (!formData.has('is_public')) {
      formData.set('is_public', 'false');
    }

    startTransition(async () => {
      const result: LessonTypeActionState = await updateLessonTypeAction(
        lessonType.id,
        formData
      );
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? 'Failed to update lesson type');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Lesson Type
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={lessonType.name}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              maxLength={2000}
              defaultValue={lessonType.description ?? ''}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (min) *
              </label>
              <input
                type="number"
                name="duration_minutes"
                required
                min={15}
                max={240}
                defaultValue={lessonType.duration_minutes}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price (cents) *
              </label>
              <input
                type="number"
                name="price_cents"
                required
                min={0}
                defaultValue={lessonType.price_cents}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                {lessonType.price_cents} = ${(lessonType.price_cents / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transmission
            </label>
            <select
              name="transmission"
              defaultValue={lessonType.transmission}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={lessonType.status}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_public"
              value="true"
              defaultChecked={lessonType.is_public}
              id={`edit-lt-public-${lessonType.id}`}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label
              htmlFor={`edit-lt-public-${lessonType.id}`}
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Show on public website
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ───────────────────────

function DeleteLessonTypeModal({
  lessonType,
  primaryColor,
  onClose,
}: {
  lessonType: LessonType;
  primaryColor: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLessonTypeAction(lessonType.id);
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? 'Failed to delete lesson type');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-lg">
              ⚠️
            </span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Lesson Type
            </h2>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{lessonType.name}</strong>?
            This action cannot be undone. Any bookings referencing this lesson type may be affected.
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
