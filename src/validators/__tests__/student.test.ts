import { describe, it, expect } from 'vitest';
import { createStudentSchema, updateStudentSchema } from '../student';

describe('createStudentSchema', () => {
  const validInput = {
    user_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    display_name: 'Jane Doe',
  };

  it('accepts valid minimal input', () => {
    const result = createStudentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts full input', () => {
    const result = createStudentSchema.safeParse({
      ...validInput,
      phone: '0412345678',
      email: 'jane@example.com',
      date_of_birth: '2000-01-15',
      pickup_address: '123 Main St',
      pickup_suburb: 'Sydney',
      pickup_postcode: '2000',
      learner_permit_number: 'LP12345',
      permit_expiry: '2027-06-30',
      preferred_transmission: 'automatic',
      preferred_instructor_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
      emergency_contact_name: 'John Doe',
      emergency_contact_phone: '0498765432',
      notes: 'Prefers morning lessons',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid user_id', () => {
    const result = createStudentSchema.safeParse({
      ...validInput,
      user_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short display_name', () => {
    const result = createStudentSchema.safeParse({
      ...validInput,
      display_name: 'J',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = createStudentSchema.safeParse({
      ...validInput,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid preferred_transmission', () => {
    const result = createStudentSchema.safeParse({
      ...validInput,
      preferred_transmission: 'electric',
    });
    expect(result.success).toBe(false);
  });

  it('accepts nullable optional fields', () => {
    const result = createStudentSchema.safeParse({
      ...validInput,
      phone: null,
      email: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('updateStudentSchema', () => {
  it('accepts partial updates', () => {
    const result = updateStudentSchema.safeParse({
      display_name: 'Jane Smith',
      is_active: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty update', () => {
    const result = updateStudentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('strips user_id from updates', () => {
    const result = updateStudentSchema.safeParse({
      user_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('user_id' in result.data).toBe(false);
    }
  });
});
