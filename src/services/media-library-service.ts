// ==================================================
// Media Library Service
// ==================================================
// Business logic for managing media assets (images,
// logos, etc.) using Supabase Storage with a metadata
// table for searchable organization.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { MediaAsset } from '@/types/database';
import { logger } from '@/lib/logging';

const BUCKET_NAME = 'school-assets';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

// --------------------------------------------------
// List & Query
// --------------------------------------------------

/**
 * List media assets for an organization.
 */
export async function getMediaAssets(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: {
    folder?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: MediaAsset[]; total: number }> {
  let query = client
    .from('media_assets')
    .select('*', { count: 'exact' })
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false });

  if (options?.folder) {
    query = query.eq('folder', options.folder);
  }

  if (options?.search) {
    query = query.or(
      `filename.ilike.%${options.search}%,alt_text.ilike.%${options.search}%`
    );
  }

  query = query.range(
    options?.offset ?? 0,
    (options?.offset ?? 0) + (options?.limit ?? 50) - 1
  );

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    data: (data ?? []) as MediaAsset[],
    total: count ?? 0,
  };
}

/**
 * Get a single media asset by ID.
 */
export async function getMediaAsset(
  client: SupabaseClient,
  context: AuthorizedContext,
  assetId: string
): Promise<MediaAsset | null> {
  const { data, error } = await client
    .from('media_assets')
    .select('*')
    .eq('id', assetId)
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as MediaAsset | null;
}

// --------------------------------------------------
// Upload
// --------------------------------------------------

export interface UploadAssetInput {
  file: File;
  folder?: string;
  altText?: string;
  tags?: string[];
}

/**
 * Upload a file to Supabase Storage and create a media_assets record.
 */
export async function uploadMediaAsset(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  context: AuthorizedContext,
  input: UploadAssetInput
): Promise<MediaAsset> {
  const { file, folder = 'general', altText, tags } = input;

  // Validate
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported file type "${file.type}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  // Ensure bucket exists (use admin client)
  await ensureBucket(adminClient);

  // Generate unique storage path
  const ext = file.name.split('.').pop() ?? 'jpg';
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${context.organizationId}/${folder}/${uniqueId}.${ext}`;

  // Upload to storage
  const arrayBuffer = await file.arrayBuffer();
  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = adminClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(uploadData.path);

  // Create metadata record
  const { data: asset, error: dbError } = await adminClient
    .from('media_assets')
    .insert({
      organization_id: context.organizationId,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      bucket_name: BUCKET_NAME,
      filename: file.name,
      alt_text: altText ?? null,
      mime_type: file.type,
      file_size_bytes: file.size,
      folder,
      tags: tags ?? [],
      uploaded_by: context.userId,
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: delete from storage
    await adminClient.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Failed to save asset metadata: ${dbError.message}`);
  }

  logger.info('Media asset uploaded', {
    feature: 'media-library',
    operation: 'upload',
    organizationId: context.organizationId,
    assetId: (asset as MediaAsset).id,
    filename: file.name,
    folder,
  });

  return asset as MediaAsset;
}

// --------------------------------------------------
// Update
// --------------------------------------------------

export interface UpdateMediaAssetInput {
  alt_text?: string | null;
  folder?: string;
  tags?: string[];
}

/**
 * Update media asset metadata (alt text, folder, tags).
 */
export async function updateMediaAsset(
  client: SupabaseClient,
  context: AuthorizedContext,
  assetId: string,
  input: UpdateMediaAssetInput
): Promise<MediaAsset> {
  const { data, error } = await client
    .from('media_assets')
    .update(input)
    .eq('id', assetId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) throw error;

  logger.info('Media asset updated', {
    feature: 'media-library',
    operation: 'update',
    organizationId: context.organizationId,
    assetId,
  });

  return data as MediaAsset;
}

// --------------------------------------------------
// Delete
// --------------------------------------------------

/**
 * Delete a media asset from both the database and storage.
 */
export async function deleteMediaAsset(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  context: AuthorizedContext,
  assetId: string
): Promise<void> {
  // Get asset first to find storage path
  const asset = await getMediaAsset(client, context, assetId);
  if (!asset) {
    throw new Error('Asset not found.');
  }

  // Delete from storage
  const { error: storageError } = await adminClient.storage
    .from(asset.bucket_name)
    .remove([asset.storage_path]);

  if (storageError) {
    logger.error('Failed to delete asset from storage', storageError, {
      feature: 'media-library',
      operation: 'delete_storage',
      assetId,
      storagePath: asset.storage_path,
    });
    // Continue with DB deletion even if storage fails
  }

  // Delete metadata record
  const { error: dbError } = await adminClient
    .from('media_assets')
    .delete()
    .eq('id', assetId)
    .eq('organization_id', context.organizationId);

  if (dbError) throw dbError;

  logger.info('Media asset deleted', {
    feature: 'media-library',
    operation: 'delete',
    organizationId: context.organizationId,
    assetId,
    filename: asset.filename,
  });
}

// --------------------------------------------------
// Folders
// --------------------------------------------------

/**
 * Get distinct folder names for an organization's media library.
 */
export async function getMediaFolders(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<string[]> {
  const { data, error } = await client
    .from('media_assets')
    .select('folder')
    .eq('organization_id', context.organizationId)
    .order('folder');

  if (error) throw error;

  // Deduplicate
  const folders = new Set((data ?? []).map((d) => (d as { folder: string }).folder));
  return Array.from(folders);
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

async function ensureBucket(adminClient: SupabaseClient): Promise<void> {
  const { data: buckets } = await adminClient.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    await adminClient.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
  }
}
