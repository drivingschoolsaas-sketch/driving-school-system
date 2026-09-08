// ==================================================
// Review Validator Tests
// ==================================================

import { describe, it, expect } from 'vitest';
import { createReviewSchema, moderateReviewSchema } from '../review';

describe('createReviewSchema', () => {
  const validReview = {
    reviewer_name: 'Jane Doe',
    rating: 5,
    body: 'Great experience learning to drive!',
    is_anonymous: false,
  };

  it('accepts a valid review', () => {
    const result = createReviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it('accepts a review with optional fields', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      title: 'Amazing instructor',
      instructor_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty reviewer_name', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      reviewer_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects rating below 1', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      rating: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      rating: 6,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      rating: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects body shorter than 10 characters', () => {
    const result = createReviewSchema.safeParse({
      ...validReview,
      body: 'Too short',
    });
    expect(result.success).toBe(false);
  });

  it('defaults is_anonymous to false', () => {
    const withoutAnon = {
      reviewer_name: validReview.reviewer_name,
      rating: validReview.rating,
      body: validReview.body,
    };
    const result = createReviewSchema.safeParse(withoutAnon);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_anonymous).toBe(false);
    }
  });
});

describe('moderateReviewSchema', () => {
  it('accepts approved status', () => {
    const result = moderateReviewSchema.safeParse({ status: 'approved' });
    expect(result.success).toBe(true);
  });

  it('accepts featured status', () => {
    const result = moderateReviewSchema.safeParse({ status: 'featured' });
    expect(result.success).toBe(true);
  });

  it('accepts rejected status with notes', () => {
    const result = moderateReviewSchema.safeParse({
      status: 'rejected',
      moderation_notes: 'Inappropriate content',
    });
    expect(result.success).toBe(true);
  });

  it('rejects pending status (cannot set back to pending)', () => {
    const result = moderateReviewSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = moderateReviewSchema.safeParse({ status: 'archived' });
    expect(result.success).toBe(false);
  });
});
