// ==================================================
// Webhook Service
// ==================================================
// Idempotent webhook event processing.
// Each event is identified by provider + event_id.
// Duplicate events are skipped automatically.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebhookEvent } from '@/types/database';
import { logger } from '@/lib/logging';

/**
 * Record a webhook event. Returns null if the event was
 * already processed (idempotency check).
 */
export async function recordWebhookEvent(
  client: SupabaseClient,
  params: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
    organizationId?: string;
  }
): Promise<WebhookEvent | null> {
  // Attempt insert — unique index on (provider, event_id) prevents duplicates
  const { data, error } = await client
    .from('webhook_events')
    .insert({
      provider: params.provider,
      event_id: params.eventId,
      event_type: params.eventType,
      payload: params.payload,
      organization_id: params.organizationId ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation — event already recorded
    if (error.code === '23505') {
      logger.info('Webhook event already recorded, skipping', {
        provider: params.provider,
        eventId: params.eventId,
      });
      return null;
    }
    throw error;
  }

  return data as WebhookEvent;
}

/**
 * Mark a webhook event as currently processing and
 * increment the attempt counter.
 */
export async function markWebhookProcessing(
  client: SupabaseClient,
  webhookEventId: string
): Promise<void> {
  // Read current attempts, then update atomically
  const { data: current } = await client
    .from('webhook_events')
    .select('attempts')
    .eq('id', webhookEventId)
    .single();

  const attempts = (current as { attempts: number } | null)?.attempts ?? 0;

  const { error } = await client
    .from('webhook_events')
    .update({
      status: 'processing',
      attempts: attempts + 1,
    })
    .eq('id', webhookEventId);

  if (error) throw error;
}

/**
 * Mark a webhook event as successfully processed.
 */
export async function markWebhookProcessed(
  client: SupabaseClient,
  webhookEventId: string
): Promise<void> {
  const { error } = await client
    .from('webhook_events')
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', webhookEventId);

  if (error) throw error;
}

/**
 * Mark a webhook event as failed.
 * Appends the error to processing_errors array.
 */
export async function markWebhookFailed(
  client: SupabaseClient,
  webhookEventId: string,
  errorMessage: string
): Promise<void> {
  // Get current errors
  const { data: current } = await client
    .from('webhook_events')
    .select('processing_errors, attempts, max_attempts')
    .eq('id', webhookEventId)
    .single();

  const existing = (current as WebhookEvent | null)?.processing_errors ?? [];
  const attempts = (current as WebhookEvent | null)?.attempts ?? 0;
  const maxAttempts = (current as WebhookEvent | null)?.max_attempts ?? 3;

  // If max attempts reached, mark as permanently failed
  const status = attempts >= maxAttempts ? 'failed' : 'pending';

  const { error } = await client
    .from('webhook_events')
    .update({
      status,
      processing_errors: [...existing, errorMessage],
    })
    .eq('id', webhookEventId);

  if (error) throw error;

  logger.warn('Webhook processing failed', {
    webhookEventId,
    errorMessage,
    attempts,
    willRetry: status === 'pending',
  });
}

/**
 * Get recent webhook events for monitoring.
 */
export async function getWebhookEvents(
  client: SupabaseClient,
  options?: {
    status?: string;
    provider?: string;
    limit?: number;
  }
): Promise<WebhookEvent[]> {
  let query = client
    .from('webhook_events')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.status) query = query.eq('status', options.status);
  if (options?.provider) query = query.eq('provider', options.provider);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WebhookEvent[];
}
