import { describe, it, expect } from 'vitest';
import { createLessonTypeSchema, updateLessonTypeSchema } from '../lesson-type';

describe('createLessonTypeSchema', () => {
  const validInput = {
    name: 'Standard Lesson',
    price_cents: 7500,
  };

  it('accepts valid input with defaults', () => {
    const result = createLessonTypeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.duration_minutes).toBe(60);
      expect(result.data.transmission).toBe('automatic');
      expect(result.data.sort_order).toBe(0);
      expect(result.data.is_public).toBe(true);
    }
  });

  it('accepts full input', () => {
    const result = createLessonTypeSchema.safeParse({
      name: 'Test Preparation',
      description: 'Focused test prep lesson',
      duration_minutes: 90,
      price_cents: 10000,
      transmission: 'manual',
      sort_order: 1,
      is_public: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative price', () => {
    const result = createLessonTypeSchema.safeParse({
      ...validInput,
      price_cents: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration below 15 minutes', () => {
    const result = createLessonTypeSchema.safeParse({
      ...validInput,
      duration_minutes: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration above 240 minutes', () => {
    const result = createLessonTypeSchema.safeParse({
      ...validInput,
      duration_minutes: 300,
    });
    expect(result.success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const result = createLessonTypeSchema.safeParse({
      ...validInput,
      name: 'X',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateLessonTypeSchema', () => {
  it('accepts partial update with status', () => {
    const result = updateLessonTypeSchema.safeParse({
      status: 'inactive',
      price_cents: 8000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateLessonTypeSchema.safeParse({
      status: 'deleted',
    });
    expect(result.success).toBe(false);
  });
});
