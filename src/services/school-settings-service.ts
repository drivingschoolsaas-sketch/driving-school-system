// ==================================================
// School Settings Service
// ==================================================
// Per-organization settings and branding configuration.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SchoolSettings } from '@/types/database';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { UpdateSchoolSettingsInput } from '@/validators/school-settings';
import { logger } from '@/lib/logging';
import { audit } from '@/lib/audit';

/**
 * Get school settings for an organization.
 * Creates default settings if none exist.
 */
export async function getSchoolSettings(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<SchoolSettings> {
  const { data, error } = await client
    .from('school_settings')
    .select('*')
    .eq('organization_id', context.organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch school settings', error, {
      feature: 'school-settings',
      operation: 'get',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to fetch school settings.');
  }

  if (data) {
    return data as SchoolSettings;
  }

  // Auto-create default settings
  return createDefaultSettings(client, context.organizationId);
}

/**
 * Get school settings by organization ID (public access for website).
 */
export async function getPublicSchoolSettings(
  client: SupabaseClient,
  organizationId: string
): Promise<SchoolSettings | null> {
  const { data, error } = await client
    .from('school_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch public school settings', error, {
      feature: 'school-settings',
      operation: 'get_public',
      organizationId,
    });
    return null;
  }

  return data as SchoolSettings | null;
}

/**
 * Update school settings.
 */
export async function updateSchoolSettings(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: UpdateSchoolSettingsInput
): Promise<SchoolSettings> {
  // Ensure settings exist first
  await getSchoolSettings(client, context);

  const { data, error } = await client
    .from('school_settings')
    .update(input)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update school settings', error, {
      feature: 'school-settings',
      operation: 'update',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to update school settings.');
  }

  logger.info('School settings updated', {
    feature: 'school-settings',
    operation: 'update',
    organizationId: context.organizationId,
  });

  await audit(client, context, {
    action: 'school_settings.updated',
    resourceType: 'school_settings',
    details: { fields: Object.keys(input) },
  });

  return data as SchoolSettings;
}

// --------------------------------------------------
// Content Workflow: Draft / Preview / Publish
// --------------------------------------------------

/** Content fields that participate in the draft/publish workflow. */
const CONTENT_FIELDS = [
  'hero_title', 'hero_subtitle', 'about_text',
  'primary_color', 'secondary_color',
  'logo_url', 'favicon_url',
  'meta_title', 'meta_description',
  'sections_enabled',
  'social_facebook', 'social_instagram', 'social_tiktok', 'social_google_review',
] as const;

export type ContentFieldKey = typeof CONTENT_FIELDS[number];

/**
 * Save a draft of website content changes.
 * Merges into any existing draft (doesn't replace).
 */
export async function saveDraftContent(
  client: SupabaseClient,
  context: AuthorizedContext,
  changes: Record<string, unknown>
): Promise<SchoolSettings> {
  // Only keep content fields
  const filtered: Record<string, unknown> = {};
  for (const key of CONTENT_FIELDS) {
    if (key in changes) {
      filtered[key] = changes[key];
    }
  }

  if (Object.keys(filtered).length === 0) {
    throw new Error('No content fields to save as draft.');
  }

  // Fetch current settings to merge into existing draft
  const current = await getSchoolSettings(client, context);
  const existingDraft = (current.draft_content ?? {}) as Record<string, unknown>;
  const mergedDraft = { ...existingDraft, ...filtered };

  const { data, error } = await client
    .from('school_settings')
    .update({ draft_content: mergedDraft })
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to save draft content', error, {
      feature: 'school-settings',
      operation: 'save_draft',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to save draft.');
  }

  logger.info('Draft content saved', {
    feature: 'school-settings',
    operation: 'save_draft',
    organizationId: context.organizationId,
    fields: Object.keys(filtered),
  });

  return data as SchoolSettings;
}

/**
 * Publish draft content: copies draft fields over the live columns
 * and clears the draft.
 */
export async function publishDraftContent(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<SchoolSettings> {
  const current = await getSchoolSettings(client, context);

  if (!current.draft_content || Object.keys(current.draft_content).length === 0) {
    throw new Error('No draft content to publish.');
  }

  // Build update: copy each draft field into its live column
  const updates: Record<string, unknown> = {};
  for (const key of CONTENT_FIELDS) {
    if (key in current.draft_content) {
      updates[key] = current.draft_content[key];
    }
  }

  // Clear draft and set published timestamp
  updates.draft_content = null;
  updates.content_published_at = new Date().toISOString();

  const { data, error } = await client
    .from('school_settings')
    .update(updates)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to publish draft content', error, {
      feature: 'school-settings',
      operation: 'publish_draft',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to publish content.');
  }

  logger.info('Draft content published', {
    feature: 'school-settings',
    operation: 'publish_draft',
    organizationId: context.organizationId,
    fields: Object.keys(current.draft_content),
  });

  await audit(client, context, {
    action: 'school_settings.content_published',
    resourceType: 'school_settings',
    details: { fields: Object.keys(current.draft_content) },
  });

  return data as SchoolSettings;
}

/**
 * Discard the current draft, reverting to the published content.
 */
export async function discardDraft(
  client: SupabaseClient,
  context: AuthorizedContext
): Promise<SchoolSettings> {
  const { data, error } = await client
    .from('school_settings')
    .update({ draft_content: null })
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to discard draft', error, {
      feature: 'school-settings',
      operation: 'discard_draft',
      organizationId: context.organizationId,
    });
    throw new Error('Failed to discard draft.');
  }

  logger.info('Draft content discarded', {
    feature: 'school-settings',
    operation: 'discard_draft',
    organizationId: context.organizationId,
  });

  return data as SchoolSettings;
}

/**
 * Get a preview of what the settings would look like if the draft
 * were published. Merges draft over live settings.
 */
export function getPreviewSettings(settings: SchoolSettings): SchoolSettings {
  if (!settings.draft_content || Object.keys(settings.draft_content).length === 0) {
    return settings;
  }

  const preview = { ...settings };
  for (const key of CONTENT_FIELDS) {
    if (key in settings.draft_content) {
      (preview as Record<string, unknown>)[key] = settings.draft_content[key];
    }
  }
  return preview;
}

/**
 * Create default settings for a new organization.
 */
async function createDefaultSettings(
  client: SupabaseClient,
  organizationId: string
): Promise<SchoolSettings> {
  const { data, error } = await client
    .from('school_settings')
    .insert({
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create default school settings', error, {
      feature: 'school-settings',
      operation: 'create_defaults',
      organizationId,
    });
    throw new Error('Failed to create school settings.');
  }

  logger.info('Default school settings created', {
    feature: 'school-settings',
    operation: 'create_defaults',
    organizationId,
  });

  return data as SchoolSettings;
}
