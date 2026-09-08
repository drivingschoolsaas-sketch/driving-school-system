import { z } from 'zod';
import { USER_ROLES } from '@/config/constants';

// ==================================================
// Membership Validators
// ==================================================

/** Roles that can be assigned through the membership system */
const assignableRoles = z.enum([
  USER_ROLES.SCHOOL_OWNER,
  USER_ROLES.SCHOOL_ADMIN,
  USER_ROLES.INSTRUCTOR,
  USER_ROLES.STUDENT,
]);

export const addMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: assignableRoles,
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  role: assignableRoles,
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const removeMemberSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
