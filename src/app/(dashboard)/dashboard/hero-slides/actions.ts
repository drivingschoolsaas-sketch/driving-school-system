'use server';

// ==================================================
// Hero Slide Server Actions
// ==================================================
// Upload, update, delete, and reorder hero slides.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { PERMISSIONS } from '@/permissions/roles';
import {
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
} from '@/services/hero-slide-service';
import { audit } from '@/lib/audit';

export interface SlideActionState {
  success: boolean;
  error?: string;
}

/**
 * Upload a new hero slide.
 */
export async function uploadHeroSlideAction(
  _prev: SlideActionState,
  formData: FormData
): Promise<SlideActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_BRANDING);
    const client = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    const file = formData.get('image') as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: 'Please select an image file.' };
    }

    const slide = await createHeroSlide(client, adminClient, auth, {
      file,
      title: (formData.get('title') as string) || undefined,
      subtitle: (formData.get('subtitle') as string) || undefined,
      link_url: (formData.get('link_url') as string) || undefined,
      link_text: (formData.get('link_text') as string) || undefined,
    });

    audit(client, auth, {
      action: 'hero_slide.created',
      resourceType: 'hero_slide',
      resourceId: slide.id,
    });

    revalidatePath('/dashboard/hero-slides');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload slide.',
    };
  }
}

/**
 * Update a hero slide's metadata.
 */
export async function updateHeroSlideAction(
  slideId: string,
  formData: FormData
): Promise<SlideActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_BRANDING);
    const client = await createServerSupabaseClient();

    await updateHeroSlide(client, auth, slideId, {
      title: (formData.get('title') as string) || null,
      subtitle: (formData.get('subtitle') as string) || null,
      link_url: (formData.get('link_url') as string) || null,
      link_text: (formData.get('link_text') as string) || null,
      is_active: formData.get('is_active') === 'true',
    });

    audit(client, auth, {
      action: 'hero_slide.updated',
      resourceType: 'hero_slide',
      resourceId: slideId,
    });

    revalidatePath('/dashboard/hero-slides');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update slide.',
    };
  }
}

/**
 * Delete a hero slide.
 */
export async function deleteHeroSlideAction(
  slideId: string
): Promise<SlideActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_BRANDING);
    const client = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    await deleteHeroSlide(client, adminClient, auth, slideId);

    audit(client, auth, {
      action: 'hero_slide.deleted',
      resourceType: 'hero_slide',
      resourceId: slideId,
    });

    revalidatePath('/dashboard/hero-slides');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete slide.',
    };
  }
}

/**
 * Reorder hero slides.
 */
export async function reorderHeroSlidesAction(
  slideIds: string[]
): Promise<SlideActionState> {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.ORG_MANAGE_BRANDING);
    const client = await createServerSupabaseClient();
    const adminClient = getAdminClient();

    await reorderHeroSlides(adminClient, auth, slideIds);

    audit(client, auth, {
      action: 'hero_slide.reordered',
      resourceType: 'hero_slide',
      resourceId: 'batch',
    });

    revalidatePath('/dashboard/hero-slides');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reorder slides.',
    };
  }
}
