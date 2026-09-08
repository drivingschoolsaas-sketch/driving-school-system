import { describe, it, expect } from 'vitest';
import { createLessonPackageSchema, updateLessonPackageSchema } from '../lesson-package';

describe('createLessonPackageSchema', () => {
  const validInput = {
    name: '5-Lesson Package',
    lesson_type_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    lesson_count: 5,
    price_cents: 35000,
  };

  it('accepts valid input with defaults', () => {
    const result = createLessonPackageSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.savings_cents).toBe(0);
      expect(result.data.sort_order).toBe(0);
      expect(result.data.is_public).toBe(true);
    }
  });

  it('accepts full input with savings', () => {
    const result = createLessonPackageSchema.safeParse({
      ...validInput,
      description: 'Save $25 with 5 lessons',
      savings_cents: 2500,
      validity_days: 90,
      sort_order: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects lesson_count of 0', () => {
    const result = createLessonPackageSchema.safeParse({
      ...validInput,
      lesson_count: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = createLessonPackageSchema.safeParse({
      ...validInput,
      price_cents: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid lesson_type_id', () => {
    const result = createLessonPackageSchema.safeParse({
      ...validInput,
      lesson_type_id: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects validity_days over 365', () => {
    const result = createLessonPackageSchema.safeParse({
      ...validInput,
      validity_days: 400,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateLessonPackageSchema', () => {
  it('accepts status change', () => {
    const result = updateLessonPackageSchema.safeParse({
      status: 'archived',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateLessonPackageSchema.safeParse({
      status: 'deleted',
    });
    expect(result.success).toBe(false);
  });

  it('accepts partial price update', () => {
    const result = updateLessonPackageSchema.safeParse({
      price_cents: 32000,
      savings_cents: 5000,
    });
    expect(result.success).toBe(true);
  });
});
