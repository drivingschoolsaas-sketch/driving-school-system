// ==================================================
// Membership Service
// ==================================================
// Business logic for organization membership.
// Handles adding, removing, and updating member roles.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationMember } from '@/types/database';
import type { UserRole } from '@/config/constants';
import { TenantErrors, ValidationErrors } from '@/lib/errors';
import { logger } from '@/lib/logging';

/**
 * Get all memberships for a user.
 * Used during authorization to find which organizations
 * the user belongs to.
 */
export async function getUserMemberships(
  client: SupabaseClient,
  userId: string
): Promise<OrganizationMember[]> {
  const { data, error } = await client
    .from('organization_members')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to fetch user memberships', error, {
      feature: 'membership',
      operation: 'get_user_memberships',
      userId,
    });
    return [];
  }

  return (data ?? []) as OrganizationMember[];
}

/**
 * Get all members of an organization.
 * Scoped by organization_id — RLS also enforces this.
 */
export async function getOrganizationMembers(
  client: SupabaseClient,
  organizationId: string
): Promise<OrganizationMember[]> {
  const { data, error } = await client
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch organization members', error, {
      feature: 'membership',
      operation: 'get_organization_members',
      organizationId,
    });
    return [];
  }

  return (data ?? []) as OrganizationMember[];
}

/**
 * Get a user's membership for a specific organization.
 */
export async function getMembership(
  client: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<OrganizationMember | null> {
  const { data, error } = await client
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch membership', error, {
      feature: 'membership',
      operation: 'get_membership',
      organizationId,
      userId,
    });
    return null;
  }

  return data as OrganizationMember | null;
}

/**
 * Add a member to an organization.
 * The caller must have ORG_MANAGE_MEMBERS permission (checked before calling).
 *
 * @param client - Supabase client (service role for creating memberships)
 * @param organizationId - Target organization
 * @param userId - User to add
 * @param role - Role to assign
 */
export async function addMember(
  client: SupabaseClient,
  organizationId: string,
  userId: string,
  role: UserRole
): Promise<OrganizationMember> {
  // Check if membership already exists
  const existing = await getMembership(client, organizationId, userId);

  if (existing && existing.status === 'active') {
    throw ValidationErrors.invalidInput(
      'This user is already a member of this organization.',
      { organizationId, userId }
    );
  }

  if (existing) {
    // Reactivate existing membership (handles 'invited', 'suspended', and 'removed')
    const { data, error } = await client
      .from('organization_members')
      .update({ role, status: 'active' })
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !data) {
      throw ValidationErrors.invalidInput('Failed to reactivate membership.');
    }

    logger.info('Membership reactivated', {
      feature: 'membership',
      operation: 'reactivate',
      entityType: 'organization_member',
      entityId: data.id,
      organizationId,
      userId,
      role,
    });

    return data as OrganizationMember;
  }

  // Create new membership
  const { data, error } = await client
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role,
      status: 'active',
    })
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to add member', error, {
      feature: 'membership',
      operation: 'add',
      organizationId,
      userId,
    });
    throw ValidationErrors.invalidInput('Failed to add member.');
  }

  logger.info('Member added', {
    feature: 'membership',
    operation: 'add',
    entityType: 'organization_member',
    entityId: data.id,
    organizationId,
    userId,
    role,
  });

  return data as OrganizationMember;
}

/**
 * Update a member's role.
 */
export async function updateMemberRole(
  client: SupabaseClient,
  organizationId: string,
  memberId: string,
  newRole: UserRole
): Promise<OrganizationMember> {
  const { data, error } = await client
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('organization_id', organizationId) // Always scope by org
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to update member role', error, {
      feature: 'membership',
      operation: 'update_role',
      organizationId,
      memberId,
    });
    throw ValidationErrors.invalidInput('Failed to update member role.');
  }

  logger.info('Member role updated', {
    feature: 'membership',
    operation: 'update_role',
    entityType: 'organization_member',
    entityId: memberId,
    organizationId,
    newRole,
  });

  return data as OrganizationMember;
}

/**
 * Remove a member from an organization (soft delete).
 * Cannot remove the last school_owner.
 */
export async function removeMember(
  client: SupabaseClient,
  organizationId: string,
  memberId: string
): Promise<void> {
  // Get the member to check role
  const { data: member } = await client
    .from('organization_members')
    .select('*')
    .eq('id', memberId)
    .eq('organization_id', organizationId)
    .single();

  if (!member) {
    throw TenantErrors.accessDenied({ organizationId, memberId });
  }

  // Prevent removing the last school owner
  if (member.role === 'school_owner') {
    const { count } = await client
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('role', 'school_owner')
      .eq('status', 'active');

    if ((count ?? 0) <= 1) {
      throw ValidationErrors.invalidInput(
        'Cannot remove the last school owner. Transfer ownership first.',
        { organizationId, memberId }
      );
    }
  }

  // Soft delete — set status to 'removed'
  const { error } = await client
    .from('organization_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
    .eq('organization_id', organizationId);

  if (error) {
    logger.error('Failed to remove member', error, {
      feature: 'membership',
      operation: 'remove',
      organizationId,
      memberId,
    });
    throw ValidationErrors.invalidInput('Failed to remove member.');
  }

  logger.info('Member removed', {
    feature: 'membership',
    operation: 'remove',
    entityType: 'organization_member',
    entityId: memberId,
    organizationId,
  });
}
