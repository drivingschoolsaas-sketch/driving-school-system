import { describe, it, expect } from 'vitest';
import { addMemberSchema, updateMemberRoleSchema, removeMemberSchema } from '../membership';

describe('addMemberSchema', () => {
  it('validates correct input', () => {
    const result = addMemberSchema.safeParse({
      email: 'instructor@example.com',
      role: 'instructor',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = addMemberSchema.safeParse({
      email: 'not-an-email',
      role: 'instructor',
    });
    expect(result.success).toBe(false);
  });

  it('rejects platform_owner as assignable role', () => {
    const result = addMemberSchema.safeParse({
      email: 'admin@example.com',
      role: 'platform_owner',
    });
    expect(result.success).toBe(false);
  });

  it('rejects platform_support as assignable role', () => {
    const result = addMemberSchema.safeParse({
      email: 'support@example.com',
      role: 'platform_support',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all four org-level roles', () => {
    const roles = ['school_owner', 'school_admin', 'instructor', 'student'];
    roles.forEach((role) => {
      const result = addMemberSchema.safeParse({
        email: `${role}@example.com`,
        role,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('updateMemberRoleSchema', () => {
  it('validates correct input', () => {
    const result = updateMemberRoleSchema.safeParse({
      memberId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'school_admin',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for memberId', () => {
    const result = updateMemberRoleSchema.safeParse({
      memberId: 'not-a-uuid',
      role: 'school_admin',
    });
    expect(result.success).toBe(false);
  });
});

describe('removeMemberSchema', () => {
  it('validates correct input', () => {
    const result = removeMemberSchema.safeParse({
      memberId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = removeMemberSchema.safeParse({
      memberId: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
