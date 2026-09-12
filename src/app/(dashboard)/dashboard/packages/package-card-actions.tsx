'use client';

import { useState, useTransition } from 'react';
import { updatePackageAction, deletePackageAction, type PackageActionState } from './actions';
import type { LessonPackage } from '@/types/database';

interface Props {
  pkg: LessonPackage;
  lessonTypes: { id: string; name: string }[];
  primaryColor: string;
}

export function PackageCardActions({ pkg, lessonTypes, primaryColor }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setEditOpen(true)}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Edit package"
        >
          ✏️
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          title="Delete package"
        >
          🗑️
        </button>
      </div>

      {editOpen && (
        <EditPackageModal
          pkg={pkg}
          lessonTypes={lessonTypes}
          primaryColor={primaryColor}
          onClose={() => setEditOpen(false)}
        />
      )}

      {deleteOpen && (
        <DeletePackageModal
          pkg={pkg}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  );
}

// ── Edit Modal ──────────────────────────────────────

function EditPackageModal({
  pkg,
  lessonTypes,
  primaryColor,
  onClose,
}: {
  pkg: LessonPackage;
  lessonTypes: { id: string; name: string }[];
  primaryColor: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!formData.has('is_public')) {
      formData.set('is_public', 'false');
    }

    startTransition(async () => {
      const result: PackageActionState = await updatePackageAction(pkg.id, formData);
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? 'Failed to update package');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Package
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
              defaultValue={pkg.name}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lesson Type *
            </label>
            <select
              name="lesson_type_id"
              required
              defaultValue={pkg.lesson_type_id}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Select lesson type…</option>
              {lessonTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lessons *
              </label>
              <input
                type="number"
                name="lesson_count"
                required
                min={1}
                max={100}
                defaultValue={pkg.lesson_count}
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
                defaultValue={pkg.price_cents}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                {pkg.price_cents} = ${(pkg.price_cents / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Savings (cents)
              </label>
              <input
                type="number"
                name="savings_cents"
                min={0}
                defaultValue={pkg.savings_cents}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valid (days)
              </label>
              <input
                type="number"
                name="validity_days"
                min={1}
                max={365}
                defaultValue={pkg.validity_days ?? ''}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="No expiry"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={pkg.status}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              maxLength={2000}
              defaultValue={pkg.description ?? ''}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_public"
              value="true"
              defaultChecked={pkg.is_public}
              id={`edit-pkg-public-${pkg.id}`}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label
              htmlFor={`edit-pkg-public-${pkg.id}`}
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

function DeletePackageModal({
  pkg,
  onClose,
}: {
  pkg: LessonPackage;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePackageAction(pkg.id);
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? 'Failed to delete package');
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
              Delete Package
            </h2>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete{' '}
            <strong className="text-gray-900 dark:text-white">{pkg.name}</strong>?
            This action cannot be undone.
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
