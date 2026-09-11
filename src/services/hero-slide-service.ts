// ==================================================
// Hero Slide Service
// ==================================================
// CRUD operations for hero slider images on the
// tenant landing page.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { HeroSlide } from '@/types/database';
import { logger } from '@/lib/logging';

const BUCKET_NAME = 'school-assets';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// --------------------------------------------------
// Query
// --------------------------------------------------

/**
 * Get all hero slides for an organization (admin view — includes inactive).
 */
export async function getHeroSlides(
  client: SupabaseClient,
  organizationId: string,
  activeOnly = false
): Promise<HeroSlide[]> {
  let query = client
    .from('hero_slides')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order')
    .order('created_at');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as HeroSlide[];
}

/**
 * Get active hero slides for the public landing page.
 */
export async function getActiveHeroSlides(
  client: SupabaseClient,
  organizationId: string
): Promise<HeroSlide[]> {
  return getHeroSlides(client, organizationId, true);
}

// --------------------------------------------------
// Create (Upload)
// --------------------------------------------------

export interface CreateHeroSlideInput {
  file: File;
  title?: string;
  subtitle?: string;
  link_url?: string;
  link_text?: string;
}

/**
 * Upload a hero slide image and create a record.
 */
export async function createHeroSlide(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  auth: AuthorizedContext,
  input: CreateHeroSlideInput
): Promise<HeroSlide> {
  const { file, title, subtitle, link_url, link_text } = input;

  // Validate file
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type. Allowed: JPEG, PNG, WebP.`);
  }

  // Ensure bucket exists
  const { data: buckets } = await adminClient.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    await adminClient.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
  }

  // Generate storage path
  const ext = file.name.split('.').pop() ?? 'jpg';
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${auth.organizationId}/hero/${uniqueId}.${ext}`;

  // Upload
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

  // Get next sort_order
  const { count } = await (adminClient as any)
    .from('hero_slides')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', auth.organizationId);

  const sortOrder = (count ?? 0);

  // Insert record
  const { data: slide, error: dbError } = await (adminClient as any)
    .from('hero_slides')
    .insert({
      organization_id: auth.organizationId,
      image_url: urlData.publicUrl,
      storage_path: storagePath,
      title: title || null,
      subtitle: subtitle || null,
      link_url: link_url || null,
      link_text: link_text || null,
      sort_order: sortOrder,
      is_active: true,
    })
    .select()
    .single();

  if (dbError) {
    // Rollback storage
    await adminClient.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Failed to save slide: ${dbError.message}`);
  }

  logger.info('Hero slide created', {
    feature: 'hero-slides',
    operation: 'create',
    organizationId: auth.organizationId,
    slideId: (slide as HeroSlide).id,
  });

  return slide as HeroSlide;
}

// --------------------------------------------------
// Update
// --------------------------------------------------

export interface UpdateHeroSlideInput {
  title?: string | null;
  subtitle?: string | null;
  link_url?: string | null;
  link_text?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Update a hero slide's metadata.
 */
export async function updateHeroSlide(
  client: SupabaseClient,
  auth: AuthorizedContext,
  slideId: string,
  input: UpdateHeroSlideInput
): Promise<HeroSlide> {
  const { data, error } = await (client as any)
    .from('hero_slides')
    .update(input)
    .eq('id', slideId)
    .eq('organization_id', auth.organizationId)
    .select()
    .single();

  if (error) throw error;
  return data as HeroSlide;
}

// --------------------------------------------------
// Delete
// --------------------------------------------------

/**
 * Delete a hero slide and its storage file.
 */
export async function deleteHeroSlide(
  client: SupabaseClient,
  adminClient: SupabaseClient,
  auth: AuthorizedContext,
  slideId: string
): Promise<void> {
  // Get slide to find storage path
  const { data: slide, error: findError } = await client
    .from('hero_slides')
    .select('*')
    .eq('id', slideId)
    .eq('organization_id', auth.organizationId)
    .single();

  if (findError || !slide) {
    throw new Error('Slide not found.');
  }

  const s = slide as HeroSlide;

  // Delete from storage if we have a path
  if (s.storage_path) {
    await adminClient.storage.from(BUCKET_NAME).remove([s.storage_path]);
  }

  // Delete record
  const { error: dbError } = await (adminClient as any)
    .from('hero_slides')
    .delete()
    .eq('id', slideId)
    .eq('organization_id', auth.organizationId);

  if (dbError) throw dbError;

  logger.info('Hero slide deleted', {
    feature: 'hero-slides',
    operation: 'delete',
    organizationId: auth.organizationId,
    slideId,
  });
}

// --------------------------------------------------
// Reorder
// --------------------------------------------------

/**
 * Reorder all hero slides for an organization.
 */
export async function reorderHeroSlides(
  adminClient: SupabaseClient,
  auth: AuthorizedContext,
  slideIds: string[]
): Promise<void> {
  for (let i = 0; i < slideIds.length; i++) {
    await (adminClient as any)
      .from('hero_slides')
      .update({ sort_order: i })
      .eq('id', slideIds[i])
      .eq('organization_id', auth.organizationId);
  }
}
