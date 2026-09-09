'use client';

import { useState, useTransition, useRef } from 'react';
import type { SuccessStory } from '@/types/database';
import {
  createSuccessStoryAction,
  updateSuccessStoryAction,
  deleteSuccessStoryAction,
  publishSuccessStoryAction,
} from '../actions';

interface Props {
  stories: SuccessStory[];
  students: Array<{ id: string; display_name: string }>;
  instructors: Array<{ id: string; display_name: string }>;
  statusFilter?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  published: {
    label: 'Published',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  archived: {
    label: 'Archived',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
};

export function SuccessStoryManager({ stories, students, instructors, statusFilter }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState<SuccessStory | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreate = () => {
    setEditingStory(null);
    setShowForm(true);
    setMessage(null);
  };

  const handleEdit = (story: SuccessStory) => {
    setEditingStory(story);
    setShowForm(true);
    setMessage(null);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingStory(null);
  };

  const handleDelete = (storyId: string, name: string) => {
    if (!confirm(`Delete success story for "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteSuccessStoryAction(storyId);
        setMessage({ type: 'success', text: 'Story deleted successfully.' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to delete story.' });
      }
    });
  };

  const handlePublish = (storyId: string) => {
    startTransition(async () => {
      try {
        await publishSuccessStoryAction(storyId);
        setMessage({ type: 'success', text: 'Story published! It\'s now visible on your website.' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to publish story.' });
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Success Stories
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Celebrate students who have passed their driving test.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + Add Story
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: undefined, label: 'All' },
          { value: 'draft', label: 'Drafts' },
          { value: 'published', label: 'Published' },
          { value: 'archived', label: 'Archived' },
        ].map((filter) => {
          const isActive =
            filter.value === statusFilter ||
            (!filter.value && !statusFilter);
          return (
            <a
              key={filter.label}
              href={
                filter.value
                  ? `/dashboard/success-stories?status=${filter.value}`
                  : '/dashboard/success-stories'
              }
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </a>
          );
        })}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <SuccessStoryForm
          story={editingStory}
          students={students}
          instructors={instructors}
          onClose={handleClose}
          onSuccess={(msg) => {
            handleClose();
            setMessage({ type: 'success', text: msg });
          }}
          onError={(msg) => setMessage({ type: 'error', text: msg })}
        />
      )}

      {/* Stories Grid */}
      {stories.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-gray-500 dark:text-gray-400">
            {statusFilter
              ? `No ${statusFilter} success stories found.`
              : 'No success stories yet. Add one to celebrate a student!'}
          </p>
          {!statusFilter && (
            <button
              type="button"
              onClick={handleCreate}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Add Your First Story
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => {
            const statusInfo = STATUS_CONFIG[story.status] ?? {
              label: story.status,
              className: 'bg-gray-100 text-gray-800',
            };

            return (
              <div
                key={story.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden group"
              >
                {/* Photo or placeholder */}
                {story.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic tenant URL
                  <img
                    src={story.photo_url}
                    alt={story.student_name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center text-4xl">
                    🏆
                  </div>
                )}

                <div className="p-4">
                  {/* Name + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {story.student_name}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {story.pass_date && (
                      <p>📅 Passed {new Date(story.pass_date + 'T00:00:00').toLocaleDateString()}</p>
                    )}
                    {story.test_location && <p>📍 {story.test_location}</p>}
                  </div>

                  {/* Message preview */}
                  {story.message && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      &ldquo;{story.message}&rdquo;
                    </p>
                  )}

                  {/* Consent indicator */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {story.consent_given ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                        ✓ Consent recorded
                        {story.consent_method && (
                          <span className="text-gray-400 dark:text-gray-500">
                            ({story.consent_method})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                        ⚠ No consent recorded
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(story)}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                    {story.status === 'draft' && story.consent_given && (
                      <button
                        type="button"
                        onClick={() => handlePublish(story.id)}
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(story.id, story.student_name)}
                      disabled={isPending}
                      className="rounded-lg border border-red-300 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// Create/Edit Form
// --------------------------------------------------

function SuccessStoryForm({
  story,
  students,
  instructors,
  onClose,
  onSuccess,
  onError,
}: {
  story: SuccessStory | null;
  students: Array<{ id: string; display_name: string }>;
  instructors: Array<{ id: string; display_name: string }>;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(story?.photo_url ?? null);
  const [consentGiven, setConsentGiven] = useState(story?.consent_given ?? false);
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = !!story;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateSuccessStoryAction(story.id, formData);
          onSuccess('Story updated successfully!');
        } else {
          await createSuccessStoryAction(formData);
          onSuccess('Story created! You can now publish it.');
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Success Story' : 'Add Success Story'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Photo
            </label>
            <div className="flex items-start gap-4">
              {previewUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-24 w-24 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(null)}
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-2xl text-gray-400">
                  📷
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
                <p className="mt-1 text-xs text-gray-500">JPG, PNG, WebP. Max 5MB.</p>
              </div>
            </div>
            {!previewUrl && isEditing && story?.photo_url && (
              <input type="hidden" name="remove_photo" value="true" />
            )}
          </div>

          {/* Student Name */}
          <div>
            <label htmlFor="student_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student Name *
            </label>
            <input
              type="text"
              id="student_name"
              name="student_name"
              required
              defaultValue={story?.student_name ?? ''}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter student name"
            />
          </div>

          {/* Student (linked) */}
          <div>
            <label htmlFor="student_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link to Student (optional)
            </label>
            <select
              id="student_id"
              name="student_id"
              defaultValue={story?.student_id ?? ''}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Select student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </select>
          </div>

          {/* Instructor */}
          <div>
            <label htmlFor="instructor_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Instructor (optional)
            </label>
            <select
              id="instructor_id"
              name="instructor_id"
              defaultValue={story?.instructor_id ?? ''}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Select instructor —</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>{i.display_name}</option>
              ))}
            </select>
          </div>

          {/* Pass Date & Test Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pass_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pass Date
              </label>
              <input
                type="date"
                id="pass_date"
                name="pass_date"
                defaultValue={story?.pass_date ?? ''}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="test_location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Location
              </label>
              <input
                type="text"
                id="test_location"
                name="test_location"
                defaultValue={story?.test_location ?? ''}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Sydney RMS"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Student&apos;s Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              defaultValue={story?.message ?? ''}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="What the student said about their experience..."
              maxLength={1000}
            />
          </div>

          {/* Consent Section */}
          <fieldset className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <legend className="text-sm font-semibold text-gray-900 dark:text-white px-1">
              Consent
            </legend>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <input type="hidden" name="consent_given" value={consentGiven ? 'true' : 'false'} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Student has given consent to share their story
              </span>
            </label>

            {consentGiven && (
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div>
                  <label htmlFor="consent_method" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Method
                  </label>
                  <select
                    id="consent_method"
                    name="consent_method"
                    required={consentGiven}
                    defaultValue={story?.consent_method ?? ''}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="verbal">Verbal</option>
                    <option value="written">Written</option>
                    <option value="digital">Digital</option>
                    <option value="parent_guardian">Parent/Guardian</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="consent_given_by" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Given By
                  </label>
                  <input
                    type="text"
                    id="consent_given_by"
                    name="consent_given_by"
                    defaultValue={story?.consent_given_by ?? ''}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Name"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* Status (edit only) */}
          {isEditing && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={story.status}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending
                ? 'Saving...'
                : isEditing
                ? 'Save Changes'
                : 'Create Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
