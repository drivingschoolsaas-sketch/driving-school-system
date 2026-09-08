// ==================================================
// Success Story Validator Tests
// ==================================================

import { describe, it, expect } from 'vitest';
import {
  createSuccessStorySchema,
  updateSuccessStorySchema,
} from '../success-story';

describe('createSuccessStorySchema', () => {
  const validStory = {
    student_name: 'John Smith',
    consent_given: false,
  };

  it('accepts a minimal valid story (no consent)', () => {
    const result = createSuccessStorySchema.safeParse(validStory);
    expect(result.success).toBe(true);
  });

  it('accepts a full story with consent', () => {
    const result = createSuccessStorySchema.safeParse({
      student_name: 'Jane Doe',
      student_id: '550e8400-e29b-41d4-a716-446655440000',
      instructor_id: '550e8400-e29b-41d4-a716-446655440001',
      photo_url: 'https://example.com/photo.jpg',
      test_location: 'Sydney CBD',
      pass_date: '2024-06-15',
      message: 'Could not have done it without my instructor!',
      consent_given: true,
      consent_method: 'written',
      consent_given_by: 'Jane Doe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty student_name', () => {
    const result = createSuccessStorySchema.safeParse({
      ...validStory,
      student_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects consent_given=true without consent_method', () => {
    const result = createSuccessStorySchema.safeParse({
      ...validStory,
      consent_given: true,
      // consent_method missing
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const methodError = result.error.issues.find(
        (i) => i.path.includes('consent_method')
      );
      expect(methodError).toBeDefined();
    }
  });

  it('accepts consent_given=true with consent_method', () => {
    const result = createSuccessStorySchema.safeParse({
      ...validStory,
      consent_given: true,
      consent_method: 'verbal',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all consent methods', () => {
    for (const method of ['verbal', 'written', 'digital', 'parent_guardian']) {
      const result = createSuccessStorySchema.safeParse({
        ...validStory,
        consent_given: true,
        consent_method: method,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid consent_method', () => {
    const result = createSuccessStorySchema.safeParse({
      ...validStory,
      consent_given: true,
      consent_method: 'email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid pass_date format', () => {
    const result = createSuccessStorySchema.safeParse({
      ...validStory,
      pass_date: '15/06/2024',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid photo_url', () => {
    const result = createSuccessStorySchema.safeParse({
      ...validStory,
      photo_url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateSuccessStorySchema', () => {
  it('accepts partial updates', () => {
    const result = updateSuccessStorySchema.safeParse({
      student_name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('accepts status change to published', () => {
    const result = updateSuccessStorySchema.safeParse({
      status: 'published',
    });
    expect(result.success).toBe(true);
  });

  it('accepts status change to archived', () => {
    const result = updateSuccessStorySchema.safeParse({
      status: 'archived',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateSuccessStorySchema.safeParse({
      status: 'deleted',
    });
    expect(result.success).toBe(false);
  });

  it('accepts nullable fields set to null', () => {
    const result = updateSuccessStorySchema.safeParse({
      photo_url: null,
      test_location: null,
      pass_date: null,
      message: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts sort_order update', () => {
    const result = updateSuccessStorySchema.safeParse({
      sort_order: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative sort_order', () => {
    const result = updateSuccessStorySchema.safeParse({
      sort_order: -1,
    });
    expect(result.success).toBe(false);
  });
});
