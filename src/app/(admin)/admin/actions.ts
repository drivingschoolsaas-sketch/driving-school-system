// ==================================================
// Platform Admin Server Actions
// ==================================================
// Server actions for platform admin operations:
// - Create new organizations (schools)
// - Add domains to organizations

'use server';

import { revalidatePath } from 'next/cache';
import { getPlatformAdminContext } from '@/lib/auth';
import { getAdminClient } from '@/lib/database';
import {
  createOrganization,
  addDomainToOrganization,
  updateOrganizationLimits,
} from '@/services/platform-admin-service';
import { logger } from '@/lib/logging';

// --------------------------------------------------
// Create Organization (Add New School)
// --------------------------------------------------

interface CreateOrgFormState {
  success: boolean;
  error?: string;
  organizationId?: string;
  inviteSent?: boolean;
}

export async function createOrganizationAction(
  _prevState: CreateOrgFormState,
  formData: FormData
): Promise<CreateOrgFormState> {
  try {
    const admin = await getPlatformAdminContext();
    const client = getAdminClient();

    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const ownerEmail = formData.get('ownerEmail') as string;
    const ownerName = formData.get('ownerName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const maxInstructorsRaw = formData.get('maxInstructors') as string;
    const maxStudentsRaw = formData.get('maxStudents') as string;

    // Validate required fields
    if (!name?.trim()) {
      return { success: false, error: 'School name is required' };
    }
    if (!slug?.trim()) {
      return { success: false, error: 'Slug is required' };
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        success: false,
        error: 'Slug can only contain lowercase letters, numbers, and hyphens',
      };
    }
    if (!ownerEmail?.trim()) {
      return { success: false, error: 'Owner email is required' };
    }
    if (!ownerName?.trim()) {
      return { success: false, error: 'Owner name is required' };
    }

    const maxInstructors = maxInstructorsRaw ? parseInt(maxInstructorsRaw, 10) : null;
    const maxStudents = maxStudentsRaw ? parseInt(maxStudentsRaw, 10) : null;

    if (maxInstructors !== null && (isNaN(maxInstructors) || maxInstructors < 1)) {
      return { success: false, error: 'Max instructors must be at least 1' };
    }
    if (maxStudents !== null && (isNaN(maxStudents) || maxStudents < 1)) {
      return { success: false, error: 'Max students must be at least 1' };
    }

    const result = await createOrganization(
      client,
      {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        ownerEmail: ownerEmail.trim(),
        ownerName: ownerName.trim(),
        email: email?.trim() || undefined,
        phone: phone?.trim() || undefined,
        maxInstructors,
        maxStudents,
      },
      admin.userId
    );

    revalidatePath('/admin/organizations');
    return {
      success: true,
      organizationId: result.organization.id,
      inviteSent: result.inviteSent,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create organization';

    logger.error('Create organization action failed', {
      feature: 'platform_admin',
      operation: 'create_organization',
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

// --------------------------------------------------
// Add Domain to Organization
// --------------------------------------------------

interface AddDomainFormState {
  success: boolean;
  error?: string;
  domainId?: string;
}

export async function addDomainAction(
  _prevState: AddDomainFormState,
  formData: FormData
): Promise<AddDomainFormState> {
  try {
    const admin = await getPlatformAdminContext();
    const client = getAdminClient();

    const organizationId = formData.get('organizationId') as string;
    const hostname = formData.get('hostname') as string;
    const domainType = formData.get('domainType') as string;
    const isPrimary = formData.get('isPrimary') === 'true';

    // Validate
    if (!organizationId) {
      return { success: false, error: 'Organization is required' };
    }
    if (!hostname?.trim()) {
      return { success: false, error: 'Hostname is required' };
    }
    if (
      !domainType ||
      !['platform_subdomain', 'custom_root', 'custom_subdomain'].includes(
        domainType
      )
    ) {
      return { success: false, error: 'Invalid domain type' };
    }

    // Basic hostname validation
    const cleanHostname = hostname.trim().toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(cleanHostname)) {
      return {
        success: false,
        error: 'Invalid hostname format. Use lowercase letters, numbers, hyphens, and dots.',
      };
    }

    const result = await addDomainToOrganization(
      client,
      {
        organizationId,
        hostname: cleanHostname,
        domainType: domainType as 'platform_subdomain' | 'custom_root' | 'custom_subdomain',
        isPrimary,
      },
      admin.userId
    );

    revalidatePath('/admin/domains');
    return {
      success: true,
      domainId: result.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to add domain';

    logger.error('Add domain action failed', {
      feature: 'platform_admin',
      operation: 'add_domain',
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}

// --------------------------------------------------
// Update Organization Limits
// --------------------------------------------------

interface UpdateLimitsFormState {
  success: boolean;
  error?: string;
}

export async function updateLimitsAction(
  _prevState: UpdateLimitsFormState,
  formData: FormData
): Promise<UpdateLimitsFormState> {
  try {
    const admin = await getPlatformAdminContext();
    const client = getAdminClient();

    const organizationId = formData.get('organizationId') as string;
    const maxInstructorsRaw = formData.get('maxInstructors') as string;
    const maxStudentsRaw = formData.get('maxStudents') as string;

    if (!organizationId) {
      return { success: false, error: 'Organization is required' };
    }

    const maxInstructors = maxInstructorsRaw ? parseInt(maxInstructorsRaw, 10) : null;
    const maxStudents = maxStudentsRaw ? parseInt(maxStudentsRaw, 10) : null;

    if (maxInstructors !== null && (isNaN(maxInstructors) || maxInstructors < 1)) {
      return { success: false, error: 'Max instructors must be at least 1' };
    }
    if (maxStudents !== null && (isNaN(maxStudents) || maxStudents < 1)) {
      return { success: false, error: 'Max students must be at least 1' };
    }

    await updateOrganizationLimits(
      client,
      organizationId,
      { maxInstructors, maxStudents },
      admin.userId
    );

    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update limits';

    logger.error('Update limits action failed', {
      feature: 'platform_admin',
      operation: 'update_limits',
      errorMessage: message,
    });

    return { success: false, error: message };
  }
}
