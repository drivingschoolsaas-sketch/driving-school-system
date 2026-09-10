'use client';

import { useActionState, useState } from 'react';
import { createPackageAction, type PackageActionState } from './actions';

interface Props {
  lessonTypes: { id: string; name: string }[];
  primaryColor: string;
}

const initialState: PackageActionState = { success: false };

export function AddPackageForm({ lessonTypes, primaryColor }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createPackageAction, initialState);

  if (state.success && isOpen) setIsOpen(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: primaryColor }}>
        + Add Package
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Package</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
            </div>

            <form action={formAction} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" name="name" required minLength={2} maxLength={100}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="e.g. 5-Lesson Package" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lesson Type *</label>
                <select name="lesson_type_id" required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white">
                  <option value="">Select lesson type…</option>
                  {lessonTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>{lt.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lessons *</label>
                  <input type="number" name="lesson_count" required min={1} max={100} defaultValue={5}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (cents) *</label>
                  <input type="number" name="price_cents" required min={0} defaultValue={35000}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
                  <p className="text-xs text-gray-500 mt-1">35000 = $350.00</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Savings (cents)</label>
                  <input type="number" name="savings_cents" min={0} defaultValue={2500}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid (days)</label>
                  <input type="number" name="validity_days" min={1} max={365}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    placeholder="No expiry" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea name="description" rows={2} maxLength={2000}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>

              {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}>
                  {isPending ? 'Adding…' : 'Add Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
