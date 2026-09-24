'use server';

// ==================================================
// Dashboard Server Actions
// ==================================================
// Centralized server actions for dashboard forms.
// All actions verify auth + authorization before mutating.

import { revalidatePath } from 'next/cache';
import { getDashboardContext, requirePermission, requireRole } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';
import { getAdminClient } from '@/lib/database/supabase-admin';
import { PERMISSIONS } from '@/permissions/roles';
import { USER_ROLES } from '@/config/constants';
import {
  createSuccessStory,
  updateSuccessStory,
  deleteSuccessStory,
} from '@/services/success-story-service';
import { createSuccessStorySchema, updateSuccessStorySchema } from '@/validators/success-story';

// --------------------------------------------------
// Success Story Actions
// --------------------------------------------------

export async function createSuccessStoryAction(formData: FormData) {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.SUCCESS_STORY_MANAGE);

    const client = await createServerSupabaseClient();

    // Handle photo upload first if present
    let photoUrl: string | undefined;
    const photoFile = formData.get('photo') as File | null;
    if (photoFile && photoFile.size > 0) {
      photoUrl = await uploadPhoto(photoFile, auth.organizationId);
    }

    const input = createSuccessStorySchema.parse({
      student_name: formData.get('student_name') as string,
      student_id: (formData.get('student_id') as string) || undefined,
      instructor_id: (formData.get('instructor_id') as string) || undefined,
      photo_url: photoUrl || (formData.get('photo_url') as string) || undefined,
      test_location: (formData.get('test_location') as string) || undefined,
      pass_date: (formData.get('pass_date') as string) || undefined,
      message: (formData.get('message') as string) || undefined,
      consent_given: formData.get('consent_given') === 'true',
      consent_method: (formData.get('consent_method') as string) || undefined,
      consent_given_by: (formData.get('consent_given_by') as string) || undefined,
    });

    await createSuccessStory(client, auth, input);
    revalidatePath('/dashboard/success-stories');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create success story' };
  }
}

export async function updateSuccessStoryAction(storyId: string, formData: FormData) {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.SUCCESS_STORY_MANAGE);

    const client = await createServerSupabaseClient();

    // Handle photo upload if present
    let photoUrl: string | null | undefined;
    const photoFile = formData.get('photo') as File | null;
    if (photoFile && photoFile.size > 0) {
      photoUrl = await uploadPhoto(photoFile, auth.organizationId);
    } else if (formData.get('remove_photo') === 'true') {
      photoUrl = null;
    }

    const rawInput: Record<string, unknown> = {};
    const fields = [
      'student_name', 'instructor_id', 'test_location',
      'pass_date', 'message', 'status', 'consent_method', 'consent_given_by',
    ];

    for (const field of fields) {
      const val = formData.get(field) as string | null;
      if (val !== null && val !== '') {
        rawInput[field] = val;
      }
    }

    if (formData.has('consent_given')) {
      rawInput.consent_given = formData.get('consent_given') === 'true';
    }

    if (photoUrl !== undefined) {
      rawInput.photo_url = photoUrl;
    }

    const input = updateSuccessStorySchema.parse(rawInput);
    await updateSuccessStory(client, auth, storyId, input);
    revalidatePath('/dashboard/success-stories');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update success story' };
  }
}

export async function deleteSuccessStoryAction(storyId: string) {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.SUCCESS_STORY_MANAGE);

    const client = await createServerSupabaseClient();
    await deleteSuccessStory(client, auth, storyId);
    revalidatePath('/dashboard/success-stories');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete success story' };
  }
}

export async function publishSuccessStoryAction(storyId: string) {
  try {
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.SUCCESS_STORY_MANAGE);

    const client = await createServerSupabaseClient();
    await updateSuccessStory(client, auth, storyId, { status: 'published' });
    revalidatePath('/dashboard/success-stories');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to publish success story' };
  }
}

// --------------------------------------------------
// School Settings Actions
// --------------------------------------------------

export async function updateSchoolSettingsAction(formData: FormData) {
  try {
    const { auth } = await getDashboardContext();
    requireRole(auth, USER_ROLES.SCHOOL_OWNER);

    const client = await createServerSupabaseClient();

    // Build update object from form data
    const updates: Record<string, unknown> = {};
    const textFields = [
      'hero_title', 'hero_subtitle', 'about_text',
      'contact_phone', 'contact_email', 'contact_address',
      'meta_title', 'meta_description',
      'social_facebook', 'social_instagram', 'social_tiktok', 'social_google_review',
      'primary_color', 'secondary_color',
    ];

    for (const field of textFields) {
      if (formData.has(field)) {
        const val = (formData.get(field) as string).trim();
        updates[field] = val || null;
      }
    }

    // Handle logo upload
    const logoFile = formData.get('logo') as File | null;
    if (logoFile && logoFile.size > 0) {
      updates.logo_url = await uploadPhoto(logoFile, auth.organizationId, 'logos');
    } else if (formData.get('remove_logo') === 'true') {
      updates.logo_url = null;
    }

    // Number fields
    const numberFields = [
      'min_booking_notice_hours', 'max_advance_booking_days',
      'cancellation_notice_hours', 'default_lesson_duration',
      'default_travel_buffer_minutes',
    ];
    for (const field of numberFields) {
      if (formData.has(field)) {
        const val = formData.get(field) as string;
        if (val) updates[field] = parseInt(val, 10);
      }
    }

    // Boolean fields
    if (formData.has('allow_online_booking')) {
      updates.allow_online_booking = formData.get('allow_online_booking') === 'true';
    }

    // Transmission
    if (formData.has('default_transmission')) {
      updates.default_transmission = formData.get('default_transmission') as string;
    }

    // Sections enabled
    if (formData.has('sections_enabled')) {
      const sectionsRaw = formData.get('sections_enabled') as string;
      updates.sections_enabled = sectionsRaw.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      return { success: true };
    }

    // Upsert settings
    const { error } = await client
      .from('school_settings')
      .upsert(
        {
          organization_id: auth.organizationId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/'); // Revalidate public site
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update school settings' };
  }
}

export async function updateOrganizationAction(formData: FormData) {
  try {
    const { auth } = await getDashboardContext();
    requireRole(auth, USER_ROLES.SCHOOL_OWNER);

    const client = await createServerSupabaseClient();

    const updates: Record<string, unknown> = {};
    for (const field of ['name', 'phone', 'email']) {
      if (formData.has(field)) {
        const val = (formData.get(field) as string).trim();
        updates[field] = val || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return { success: true };
    }

    const { error } = await client
      .from('organizations')
      .update(updates)
      .eq('id', auth.organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update organization' };
  }
}

// --------------------------------------------------
// Photo Upload Helper
// --------------------------------------------------

const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function uploadPhoto(
  file: File,
  organizationId: string,
  folder: string = 'photos'
): Promise<string> {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
  }

  const serviceClient = getAdminClient();

  // Ensure bucket exists
  const bucketName = 'school-assets';
  const { data: buckets } = await serviceClient.storage.listBuckets();
  if (!buckets?.find((b) => b.name === bucketName)) {
    await serviceClient.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
  }

  const MIME_TO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const ext = MIME_TO_EXT[file.type] ?? 'jpg';
  const sanitizedFolder = folder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `${organizationId}/${sanitizedFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Upload
  const arrayBuffer = await file.arrayBuffer();
  const { data, error } = await serviceClient.storage
    .from(bucketName)
    .upload(fileName, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = serviceClient.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// --------------------------------------------------
// Content Workflow: Draft / Publish / Discard (P1-3)
// --------------------------------------------------

import {
  saveDraftContent,
  publishDraftContent,
  discardDraft,
} from '@/services/school-settings-service';

export async function saveDraftAction(formData: FormData) {
  try {
    const { auth } = await getDashboardContext();
    requireRole(auth, USER_ROLES.SCHOOL_OWNER);

    const client = await createServerSupabaseClient();

    const changes: Record<string, unknown> = {};
    const textFields = [
      'hero_title', 'hero_subtitle', 'about_text',
      'meta_title', 'meta_description',
      'social_facebook', 'social_instagram', 'social_tiktok', 'social_google_review',
      'primary_color', 'secondary_color',
    ];

    for (const field of textFields) {
      if (formData.has(field)) {
        const val = (formData.get(field) as string).trim();
        changes[field] = val || null;
      }
    }

    if (formData.has('sections_enabled')) {
      const sectionsRaw = formData.get('sections_enabled') as string;
      changes.sections_enabled = sectionsRaw.split(',').map(s => s.trim()).filter(Boolean);
    }

    const logoFile = formData.get('logo') as File | null;
    if (logoFile && logoFile.size > 0) {
      changes.logo_url = await uploadPhoto(logoFile, auth.organizationId, 'logos');
    } else if (formData.get('remove_logo') === 'true') {
      changes.logo_url = null;
    }

    await saveDraftContent(client, auth, changes);
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save draft' };
  }
}

export async function publishContentAction() {
  try {
    const { auth } = await getDashboardContext();
    requireRole(auth, USER_ROLES.SCHOOL_OWNER);

    const client = await createServerSupabaseClient();

    await publishDraftContent(client, auth);
    revalidatePath('/dashboard/settings');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to publish' };
  }
}

export async function discardDraftAction() {
  try {
    const { auth } = await getDashboardContext();
    requireRole(auth, USER_ROLES.SCHOOL_OWNER);

    const client = await createServerSupabaseClient();

    await discardDraft(client, auth);
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to discard draft' };
  }
}
