// ==================================================
// Audit Logger Helper (P2-5)
// ==================================================
// Lightweight wrapper around createAuditLog for use
// in service layer mutations. Logs async (fire-and-forget)
// so audit failures don't break business operations.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthorizedContext } from '@/lib/auth/authorization';
import { logger } from '@/lib/logging';

export interface AuditEntry {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an audit event. Fire-and-forget — errors are logged
 * but never thrown to the caller.
 */
export async function audit(
  client: SupabaseClient,
  context: AuthorizedContext,
  entry: AuditEntry
): Promise<void> {
  try {
    await client.from('audit_logs').insert({
      organization_id: context.organizationId,
      user_id: context.userId,
      user_role: context.role,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      details: entry.details ?? {},
    });
  } catch (err) {
    // Never let audit failures break business logic
    logger.error('Audit log write failed', err instanceof Error ? err : new Error(String(err)), {
      feature: 'audit',
      action: entry.action,
      resourceType: entry.resourceType,
      organizationId: context.organizationId,
    });
  }
}
