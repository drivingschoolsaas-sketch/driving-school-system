import { describe, it, expect } from 'vitest';
import { createBlockedTimeSchema, updateBlockedTimeSchema } from '../blocked-time';

describe('createBlockedTimeSchema', () => {
  const validInput = {
    instructor_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    start_datetime: '2026-09-15T12:00:00Z',
    end_datetime: '2026-09-15T13:00:00Z',
  };

  it('accepts valid input with defaults', () => {
    const result = createBlockedTimeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe('other');
      expect(result.data.is_all_day).toBe(false);
    }
  });

  it('accepts full input with reason', () => {
    const result = createBlockedTimeSchema.safeParse({
      ...validInput,
      reason: 'lunch',
      notes: 'Regular lunch break',
      is_all_day: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid reason codes', () => {
    const reasons = [
      'lunch',
      'private_appointment',
      'vehicle_maintenance',
      'driving_test',
      'annual_leave',
      'sick_leave',
      'training',
      'admin_blocked',
      'other',
    ];
    for (const reason of reasons) {
      const result = createBlockedTimeSchema.safeParse({ ...validInput, reason });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid reason', () => {
    const result = createBlockedTimeSchema.safeParse({
      ...validInput,
      reason: 'vacation',
    });
    expect(result.success).toBe(false);
  });

  it('rejects end before start', () => {
    const result = createBlockedTimeSchema.safeParse({
      ...validInput,
      start_datetime: '2026-09-15T13:00:00Z',
      end_datetime: '2026-09-15T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects equal start and end', () => {
    const result = createBlockedTimeSchema.safeParse({
      ...validInput,
      start_datetime: '2026-09-15T12:00:00Z',
      end_datetime: '2026-09-15T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime format', () => {
    const result = createBlockedTimeSchema.safeParse({
      ...validInput,
      start_datetime: '2026-09-15 12:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid instructor_id', () => {
    const result = createBlockedTimeSchema.safeParse({
      ...validInput,
      instructor_id: 'bad-id',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all-day blocked time', () => {
    const result = createBlockedTimeSchema.safeParse({
      ...validInput,
      is_all_day: true,
      reason: 'annual_leave',
      start_datetime: '2026-09-15T00:00:00Z',
      end_datetime: '2026-09-16T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateBlockedTimeSchema', () => {
  it('accepts partial update', () => {
    const result = updateBlockedTimeSchema.safeParse({
      reason: 'sick_leave',
      notes: 'Feeling unwell',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty update', () => {
    const result = updateBlockedTimeSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects end before start when both provided', () => {
    const result = updateBlockedTimeSchema.safeParse({
      start_datetime: '2026-09-15T17:00:00Z',
      end_datetime: '2026-09-15T08:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});
