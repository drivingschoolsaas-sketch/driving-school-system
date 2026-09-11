'use client';

// ==================================================
// Hero Slide Manager (Client Component)
// ==================================================
// Upload, edit, delete, toggle, and reorder hero slides.

import { useState, useActionState, useTransition } from 'react';
import {
  uploadHeroSlideAction,
  updateHeroSlideAction,
  deleteHeroSlideAction,
  reorderHeroSlidesAction,
  type SlideActionState,
} from './actions';

interface Slide {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  link_text: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  slides: Slide[];
  primaryColor: string;
}

const initialState: SlideActionState = { success: false };

export function SlideManager({ slides: initialSlides, primaryColor }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slides, setSlides] = useState(initialSlides);
  const [uploadState, uploadAction] = useActionState(uploadHeroSlideAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleDelete(slideId: string) {
    if (!confirm('Delete this slide? This cannot be undone.')) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteHeroSlideAction(slideId);
      if (result.success) {
        setSlides((prev) => prev.filter((s) => s.id !== slideId));
        setMessage({ type: 'success', text: 'Slide deleted.' });
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to delete.' });
      }
    });
  }

  function handleToggle(slideId: string, currentActive: boolean) {
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('is_active', (!currentActive).toString());
      const result = await updateHeroSlideAction(slideId, fd);
      if (result.success) {
        setSlides((prev) =>
          prev.map((s) => (s.id === slideId ? { ...s, is_active: !currentActive } : s))
        );
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to toggle.' });
      }
    });
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const newSlides = [...slides];
    [newSlides[index - 1], newSlides[index]] = [newSlides[index], newSlides[index - 1]];
    setSlides(newSlides);
    startTransition(async () => {
      await reorderHeroSlidesAction(newSlides.map((s) => s.id));
    });
  }

  function handleMoveDown(index: number) {
    if (index === slides.length - 1) return;
    const newSlides = [...slides];
    [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];
    setSlides(newSlides);
    startTransition(async () => {
      await reorderHeroSlidesAction(newSlides.map((s) => s.id));
    });
  }

  function handleSaveEdit(slideId: string, formData: FormData) {
    setMessage(null);
    formData.set('is_active', slides.find((s) => s.id === slideId)?.is_active?.toString() ?? 'true');
    startTransition(async () => {
      const result = await updateHeroSlideAction(slideId, formData);
      if (result.success) {
        setSlides((prev) =>
          prev.map((s) =>
            s.id === slideId
              ? {
                  ...s,
                  title: (formData.get('title') as string) || null,
                  subtitle: (formData.get('subtitle') as string) || null,
                  link_url: (formData.get('link_url') as string) || null,
                  link_text: (formData.get('link_text') as string) || null,
                }
              : s
          )
        );
        setEditingId(null);
        setMessage({ type: 'success', text: 'Slide updated.' });
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to update.' });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Upload button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {slides.length} slide{slides.length !== 1 ? 's' : ''} — drag to reorder, toggle to show/hide
        </p>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: primaryColor }}
        >
          {showUpload ? '✕ Close' : '+ Add Slide'}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Upload form */}
      {showUpload && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Upload New Slide
          </h3>
          <form action={uploadAction} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image * (JPEG, PNG, WebP — max 5MB)
              </label>
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                required
                className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title (overlay)
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Learn to Drive with Confidence"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  name="subtitle"
                  placeholder="e.g. Expert instructors, flexible scheduling"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Button Link
                </label>
                <input
                  type="text"
                  name="link_url"
                  placeholder="/book"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Button Text
                </label>
                <input
                  type="text"
                  name="link_text"
                  placeholder="Book Now"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {uploadState.success && (
              <p className="text-sm text-green-600 dark:text-green-400">✓ Slide uploaded!</p>
            )}
            {uploadState.error && (
              <p className="text-sm text-red-600 dark:text-red-400">✗ {uploadState.error}</p>
            )}

            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Upload Slide
            </button>
          </form>
        </div>
      )}

      {/* Slides list */}
      {slides.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="text-gray-500 dark:text-gray-400">
            No hero slides yet. Upload your first slide to create an image carousel on your landing page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`rounded-xl border bg-white dark:bg-gray-800 overflow-hidden transition-opacity ${
                slide.is_active
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-stretch">
                {/* Thumbnail */}
                <div className="w-40 sm:w-56 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.image_url}
                    alt={slide.title ?? 'Hero slide'}
                    className="h-full w-full object-cover"
                    style={{ minHeight: '100px' }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  {editingId === slide.id ? (
                    <EditSlideForm
                      slide={slide}
                      onSave={(fd) => handleSaveEdit(slide.id, fd)}
                      onCancel={() => setEditingId(null)}
                      isPending={isPending}
                    />
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {slide.title || 'Untitled slide'}
                          </span>
                          {!slide.is_active && (
                            <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Hidden
                            </span>
                          )}
                        </div>
                        {slide.subtitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{slide.subtitle}</p>
                        )}
                        {slide.link_url && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                            🔗 {slide.link_text ?? slide.link_url}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <button
                          onClick={() => setEditingId(slide.id)}
                          disabled={isPending}
                          className="rounded-md bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleToggle(slide.id, slide.is_active)}
                          disabled={isPending}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                            slide.is_active
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                          }`}
                        >
                          {slide.is_active ? '👁️ Hide' : '👁️ Show'}
                        </button>
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={isPending || index === 0}
                          className="rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={isPending || index === slides.length - 1}
                          className="rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleDelete(slide.id)}
                          disabled={isPending}
                          className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 disabled:opacity-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// Inline Edit Form
// --------------------------------------------------

function EditSlideForm({
  slide,
  onSave,
  onCancel,
  isPending,
}: {
  slide: Slide;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(new FormData(e.currentTarget));
      }}
      className="space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          name="title"
          defaultValue={slide.title ?? ''}
          placeholder="Title"
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
        />
        <input
          name="subtitle"
          defaultValue={slide.subtitle ?? ''}
          placeholder="Subtitle"
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          name="link_url"
          defaultValue={slide.link_url ?? ''}
          placeholder="Link URL (e.g. /book)"
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
        />
        <input
          name="link_text"
          defaultValue={slide.link_text ?? ''}
          placeholder="Button text"
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-900 dark:text-white"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-gray-200 dark:bg-gray-600 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
