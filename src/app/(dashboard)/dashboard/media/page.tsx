// ==================================================
// Dashboard: Media Library Page
// ==================================================
// Upload, browse, and manage images for the school
// website. Organized by folders (logos, photos, etc.).

import { getDashboardContext, requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/permissions/roles';
import { createServerSupabaseClient } from '@/lib/database';
import { getMediaAssets, getMediaFolders } from '@/services/media-library-service';
import { MediaLibraryClient } from './media-library-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Media Library',
};

export default async function MediaLibraryPage(props: {
  searchParams: Promise<{ folder?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { auth } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.ORG_MANAGE_SETTINGS);

  const client = await createServerSupabaseClient();

  const [assetsResult, folders] = await Promise.all([
    getMediaAssets(client, auth, {
      folder: searchParams.folder,
      search: searchParams.search,
      limit: 50,
    }),
    getMediaFolders(client, auth),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Media Library
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload and manage images for your website.
        </p>
      </div>

      <MediaLibraryClient
        initialAssets={assetsResult.data}
        totalAssets={assetsResult.total}
        folders={folders}
        currentFolder={searchParams.folder}
        currentSearch={searchParams.search}
      />
    </div>
  );
}
