'use client';

import { useActionState, useState } from 'react';
import { updateLimitsAction } from '../../actions';

interface EditLimitsFormProps {
  organizationId: string;
  currentMaxInstructors: number | null;
  currentMaxStudents: number | null;
  currentInstructorCount: number;
  currentStudentCount: number;
}

export function EditLimitsForm({
  organizationId,
  currentMaxInstructors,
  currentMaxStudents,
  currentInstructorCount,
  currentStudentCount,
}: EditLimitsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateLimitsAction, {
    success: false,
  });

  // Close edit mode on success
  if (state.success && isEditing) {
    setIsEditing(false);
  }

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Usage Limits
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {state.error}
        </div>
      )}

      {isEditing ? (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="organizationId" value={organizationId} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Instructors
              </label>
              <input
                name="maxInstructors"
                type="number"
                min="1"
                defaultValue={currentMaxInstructors ?? ''}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Currently using: {currentInstructorCount}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Students
              </label>
              <input
                name="maxStudents"
                type="number"
                min="1"
                defaultValue={currentMaxStudents ?? ''}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Currently using: {currentStudentCount}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Leave empty for unlimited. These override plan-level limits.
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save Limits'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Max Instructors</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {currentMaxInstructors !== null ? (
                <span>
                  {currentMaxInstructors}
                  <span className="ml-2 text-xs text-gray-400">
                    ({currentInstructorCount} used)
                  </span>
                </span>
              ) : (
                'Unlimited'
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Max Students</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {currentMaxStudents !== null ? (
                <span>
                  {currentMaxStudents}
                  <span className="ml-2 text-xs text-gray-400">
                    ({currentStudentCount} used)
                  </span>
                </span>
              ) : (
                'Unlimited'
              )}
            </span>
          </div>

          {/* Usage bars */}
          {currentMaxInstructors !== null && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Instructors</span>
                <span>{currentInstructorCount} / {currentMaxInstructors}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    currentInstructorCount >= currentMaxInstructors
                      ? 'bg-red-500'
                      : currentInstructorCount >= currentMaxInstructors * 0.8
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min((currentInstructorCount / currentMaxInstructors) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {currentMaxStudents !== null && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Students</span>
                <span>{currentStudentCount} / {currentMaxStudents}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    currentStudentCount >= currentMaxStudents
                      ? 'bg-red-500'
                      : currentStudentCount >= currentMaxStudents * 0.8
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min((currentStudentCount / currentMaxStudents) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
