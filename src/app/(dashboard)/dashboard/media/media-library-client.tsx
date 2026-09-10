// ==================================================
// Media Library Client Component
// ==================================================
// Handles upload, folder filtering, search, and
// asset management interactions.

'use client';

import { useState, useTransition } from 'react';
import type { MediaAsset } from '@/types/database';
import {
  uploadMediaAction,
  deleteMediaAction,
  updateMediaAction,
} from './actions';

interface Props {
  initialAssets: MediaAsset[];
  totalAssets: number;
  folders: string[];
  currentFolder?: string;
  currentSearch?: string;
}

const FOLDER_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'logos', label: 'Logos' },
  { value: 'photos', label: 'Photos' },
  { value: 'instructors', label: 'Instructors' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'success-stories', label: 'Success Stories' },
];

export function MediaLibraryClient({
  initialAssets,
  totalAssets,
  folders,
  currentFolder,
  currentSearch,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadMediaAction(formData);
      if (result.success) {
        setMessage({ type: 'success', text: 'Image uploaded successfully!' });
        (e.target as HTMLFormElement).reset();
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Upload failed.' });
      }
    });
  };

  const handleDelete = (assetId: string) => {
    startTransition(async () => {
      const result = await deleteMediaAction(assetId);
      if (result.success) {
        setMessage({ type: 'success', text: 'Asset deleted.' });
        setSelectedAsset(null);
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Delete failed.' });
      }
    });
  };

  const handleUpdateAlt = (assetId: string, altText: string) => {
    startTransition(async () => {
      const result = await updateMediaAction(assetId, { alt_text: altText });
      if (result.success) {
        setMessage({ type: 'success', text: 'Alt text updated.' });
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Update failed.' });
      }
    });
  };

  const allFolders = Array.from(
    new Set([...FOLDER_OPTIONS.map((f) => f.value), ...folders])
  );

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Upload Form */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          📤 Upload Image
        </h2>
        <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="file"
              name="file"
              accept="image/*"
              required
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
            />
          </div>
          <div>
            <select
              name="folder"
              defaultValue={currentFolder ?? 'general'}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              {FOLDER_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <input
              type="text"
              name="alt_text"
              placeholder="Alt text (optional)"
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </div>

      {/* Folder Filters */}
      <div className="flex gap-2 flex-wrap">
        <a
          href="/dashboard/media"
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            !currentFolder
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          All ({totalAssets})
        </a>
        {allFolders.map((folder) => {
          const label = FOLDER_OPTIONS.find((f) => f.value === folder)?.label ?? folder;
          return (
            <a
              key={folder}
              href={`/dashboard/media?folder=${folder}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                currentFolder === folder
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </a>
          );
        })}
      </div>

      {/* Asset Grid */}
      {initialAssets.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {currentFolder || currentSearch
              ? 'No images found matching your filters.'
              : 'No images yet. Upload your first image above!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {initialAssets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelectedAsset(asset)}
              className={`group relative rounded-xl border overflow-hidden transition-all hover:shadow-md ${
                selectedAsset?.id === asset.id
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.public_url}
                alt={asset.alt_text ?? asset.filename}
                className="w-full aspect-square object-cover bg-gray-100 dark:bg-gray-800"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="px-2 py-1.5 bg-white dark:bg-gray-800">
                <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                  {asset.filename}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">{asset.folder}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Asset Detail Panel */}
      {selectedAsset && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {selectedAsset.filename}
              </h3>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{selectedAsset.mime_type}</span>
                <span>•</span>
                <span>{formatBytes(selectedAsset.file_size_bytes)}</span>
                {selectedAsset.width && selectedAsset.height && (
                  <>
                    <span>•</span>
                    <span>{selectedAsset.width}×{selectedAsset.height}</span>
                  </>
                )}
                <span>•</span>
                <span className="capitalize">{selectedAsset.folder}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAsset(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {/* Copy URL */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(selectedAsset.public_url);
                setMessage({ type: 'success', text: 'URL copied to clipboard!' });
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              📋 Copy URL
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete "${selectedAsset.filename}"? This cannot be undone.`)) {
                  handleDelete(selectedAsset.id);
                }
              }}
              disabled={isPending}
              className="rounded-lg border border-red-300 dark:border-red-700 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              🗑️ Delete
            </button>
          </div>

          {/* Alt text editor */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alt Text
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                defaultValue={selectedAsset.alt_text ?? ''}
                id={`alt-${selectedAsset.id}`}
                placeholder="Describe this image for accessibility"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById(`alt-${selectedAsset.id}`) as HTMLInputElement;
                  handleUpdateAlt(selectedAsset.id, input.value);
                }}
                disabled={isPending}
                className="rounded-lg bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
