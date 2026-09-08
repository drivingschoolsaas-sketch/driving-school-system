import { describe, it, expect } from 'vitest';
import {
  createAvailabilityExceptionSchema,
  updateAvailabilityExceptionSchema,
} from '../availability-exception';

describe('createAvailabilityExceptionSchema', () => {
  const instructorId = 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa';

  it('accepts unavailable day (no times)', () => {
    const result = createAvailabilityExceptionSchema.safeParse({
      instructor_id: instructorId,
      exception_date: '2026-09-15',
      is_available: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts available day with custom hours', () => {
    const result = createAvailabilityExceptionSchema.safeParse({
      instructor_id: instructorId,
      exception_date: '2026-09-18',
      is_available: true,
      start_time: '12:00',
      end_time: '17:00',
      reason: 'Morning appointment',
    });
    expect(result.success).toBe(true);
  });

  it('rejects available day without times', () => {
    const result = createAvailabilityExceptionSchema.safeParse({
      instructor_id: instructorId,
      exception_date: '2026-09-18',
      is_available: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unavailable day with times', () => {
    const result = createAvailabilityExceptionSchema.safeParse({
      instructor_id: instructorId,
      exception_date: '2026-09-15',
      is_available: false,
      start_time: '08:00',
      end_time: '12:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects end_time before start_time', () => {
    const result = createAvailabilityExceptionSchema.safeParse({
      instructor_id: instructorId,
      exception_date: '2026-09-18',
      is_available: true,
      start_time: '17:00',
      end_time: '12:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createAvailabilityExceptionSchema.safeParse({
      instructor_id: instructorId,
      exception_date: '15/09/2026',
      is_available: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid instructor_id', () => {
    const result = createAvailabilityExceptionSchema.safeParse({
      instructor_id: 'bad',
      exception_date: '2026-09-15',
      is_available: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateAvailabilityExceptionSchema', () => {
  it('accepts partial update', () => {
    const result = updateAvailabilityExceptionSchema.safeParse({
      reason: 'Updated reason',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty update', () => {
    const result = updateAvailabilityExceptionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects end before start when both provided', () => {
    const result = updateAvailabilityExceptionSchema.safeParse({
      start_time: '17:00',
      end_time: '08:00',
    });
    expect(result.success).toBe(false);
  });
});
