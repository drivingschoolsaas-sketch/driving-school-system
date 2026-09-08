import { describe, it, expect } from 'vitest';
import { createInstructorSchema, updateInstructorSchema } from '../instructor';

describe('createInstructorSchema', () => {
  const validInput = {
    user_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    display_name: 'John Smith',
  };

  it('accepts valid minimal input', () => {
    const result = createInstructorSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_name).toBe('John Smith');
      expect(result.data.transmission_type).toBe('automatic');
      expect(result.data.default_lesson_duration).toBe(60);
    }
  });

  it('accepts full input', () => {
    const result = createInstructorSchema.safeParse({
      ...validInput,
      phone: '0412345678',
      email: 'john@school.com.au',
      bio: 'Experienced instructor',
      transmission_type: 'both',
      max_daily_lessons: 6,
      default_lesson_duration: 90,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid user_id', () => {
    const result = createInstructorSchema.safeParse({
      ...validInput,
      user_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects display_name shorter than 2 characters', () => {
    const result = createInstructorSchema.safeParse({
      ...validInput,
      display_name: 'J',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid transmission type', () => {
    const result = createInstructorSchema.safeParse({
      ...validInput,
      transmission_type: 'electric',
    });
    expect(result.success).toBe(false);
  });

  it('rejects lesson duration below 30 minutes', () => {
    const result = createInstructorSchema.safeParse({
      ...validInput,
      default_lesson_duration: 15,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateInstructorSchema', () => {
  it('accepts partial updates', () => {
    const result = updateInstructorSchema.safeParse({
      bio: 'Updated bio',
      is_active: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty update (all optional)', () => {
    const result = updateInstructorSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('does not accept user_id in updates', () => {
    const result = updateInstructorSchema.safeParse({
      user_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    });
    // user_id is stripped by omit, so it won't be in parsed data
    expect(result.success).toBe(true);
    if (result.success) {
      expect('user_id' in result.data).toBe(false);
    }
  });
});
