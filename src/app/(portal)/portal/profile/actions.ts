'use server';

// ==================================================
// Portal Profile Server Actions
// ==================================================
// Student can update their own profile fields.

import { revalidatePath } from 'next/cache';
import { getPortalContext } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/database';

export interface ProfileActionState {
  success: boolean;
  error?: string;
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  try {
    const { auth, student } = await getPortalContext();
    const client = await createServerSupabaseClient();

    const updates: Record<string, string | null> = {};
    const fields = [
      'phone',
      'pickup_address',
      'pickup_suburb',
      'pickup_postcode',
      'preferred_transmission',
      'emergency_contact_name',
      'emergency_contact_phone',
    ];

    for (const field of fields) {
      if (formData.has(field)) {
        const val = (formData.get(field) as string)?.trim();
        updates[field] = val || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No changes to save.' };
    }

    const { error } = await client
      .from('students')
      .update(updates)
      .eq('id', student.id)
      .eq('organization_id', auth.organizationId);

    if (error) throw error;

    revalidatePath('/portal/profile');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    return { success: false, error: message };
  }
}
