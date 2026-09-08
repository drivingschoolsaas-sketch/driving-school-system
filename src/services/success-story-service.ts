// ==================================================
// Success Story Service
// ==================================================
// Business logic for success story management.
// Includes consent tracking — stories must not be
// published without recorded consent.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import type { SuccessStory } from '@/types/database';
import type { CreateSuccessStoryInput, UpdateSuccessStoryInput } from '@/validators/success-story';

/**
 * Get success stories for an organization.
 */
export async function getSuccessStories(
  client: SupabaseClient,
  context: AuthorizedContext,
  options?: { status?: string }
): Promise<SuccessStory[]> {
  let query = client
    .from('success_stories')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('sort_order')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SuccessStory[];
}

/**
 * Get published success stories for the tenant website.
 */
export async function getPublicSuccessStories(
  client: SupabaseClient,
  organizationId: string
): Promise<SuccessStory[]> {
  const { data, error } = await client
    .from('success_stories')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'published')
    .eq('consent_given', true) // Never show without consent
    .order('sort_order')
    .order('pass_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SuccessStory[];
}

/**
 * Create a success story (admin workflow).
 */
export async function createSuccessStory(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateSuccessStoryInput
): Promise<SuccessStory> {
  const { data, error } = await client
    .from('success_stories')
    .insert({
      organization_id: context.organizationId,
      student_name: input.student_name,
      student_id: input.student_id ?? null,
      instructor_id: input.instructor_id ?? null,
      photo_url: input.photo_url ?? null,
      test_location: input.test_location ?? null,
      pass_date: input.pass_date ?? null,
      message: input.message ?? null,
      consent_given: input.consent_given,
      consent_given_at: input.consent_given ? new Date().toISOString() : null,
      consent_given_by: input.consent_given_by ?? null,
      consent_method: input.consent_method ?? null,
      status: 'draft', // Always start as draft
    })
    .select()
    .single();

  if (error) throw error;
  return data as SuccessStory;
}

/**
 * Update a success story.
 * Publishing requires consent to be recorded.
 */
export async function updateSuccessStory(
  client: SupabaseClient,
  context: AuthorizedContext,
  storyId: string,
  input: UpdateSuccessStoryInput
): Promise<SuccessStory> {
  // If publishing, set published_at
  const extra: Record<string, unknown> = {};
  if (input.status === 'published') {
    extra.published_at = new Date().toISOString();
  }

  // If consent is being recorded now, set timestamp
  if (input.consent_given === true) {
    extra.consent_given_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('success_stories')
    .update({ ...input, ...extra })
    .eq('id', storyId)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error) throw error;
  return data as SuccessStory;
}

/**
 * Delete a success story.
 */
export async function deleteSuccessStory(
  client: SupabaseClient,
  context: AuthorizedContext,
  storyId: string
): Promise<void> {
  const { error } = await client
    .from('success_stories')
    .delete()
    .eq('id', storyId)
    .eq('organization_id', context.organizationId);

  if (error) throw error;
}
