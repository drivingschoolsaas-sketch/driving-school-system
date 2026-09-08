import { describe, it, expect } from 'vitest';
import {
  createAvailabilityRuleSchema,
  updateAvailabilityRuleSchema,
  setWeeklyScheduleSchema,
} from '../availability-rule';

describe('createAvailabilityRuleSchema', () => {
  const validInput = {
    instructor_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    day_of_week: 'monday' as const,
    start_time: '08:00',
    end_time: '17:00',
  };

  it('accepts valid input with defaults', () => {
    const result = createAvailabilityRuleSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
    }
  });

  it('accepts all days of week', () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      const result = createAvailabilityRuleSchema.safeParse({ ...validInput, day_of_week: day });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid day_of_week', () => {
    const result = createAvailabilityRuleSchema.safeParse({
      ...validInput,
      day_of_week: 'holiday',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time format', () => {
    const result = createAvailabilityRuleSchema.safeParse({
      ...validInput,
      start_time: '8am',
    });
    expect(result.success).toBe(false);
  });

  it('rejects end_time before start_time', () => {
    const result = createAvailabilityRuleSchema.safeParse({
      ...validInput,
      start_time: '17:00',
      end_time: '08:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects equal start and end time', () => {
    const result = createAvailabilityRuleSchema.safeParse({
      ...validInput,
      start_time: '09:00',
      end_time: '09:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid instructor_id', () => {
    const result = createAvailabilityRuleSchema.safeParse({
      ...validInput,
      instructor_id: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts edge time values', () => {
    const result = createAvailabilityRuleSchema.safeParse({
      ...validInput,
      start_time: '00:00',
      end_time: '23:59',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateAvailabilityRuleSchema', () => {
  it('accepts partial update', () => {
    const result = updateAvailabilityRuleSchema.safeParse({
      start_time: '09:00',
    });
    expect(result.success).toBe(true);
  });

  it('accepts is_active toggle', () => {
    const result = updateAvailabilityRuleSchema.safeParse({
      is_active: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects when both times given and end before start', () => {
    const result = updateAvailabilityRuleSchema.safeParse({
      start_time: '17:00',
      end_time: '08:00',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty update', () => {
    const result = updateAvailabilityRuleSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('setWeeklyScheduleSchema', () => {
  it('accepts valid weekly schedule', () => {
    const result = setWeeklyScheduleSchema.safeParse([
      { day_of_week: 'monday', start_time: '08:00', end_time: '17:00' },
      { day_of_week: 'tuesday', start_time: '08:00', end_time: '17:00' },
      { day_of_week: 'friday', start_time: '10:00', end_time: '19:00' },
    ]);
    expect(result.success).toBe(true);
  });

  it('accepts empty array (no working days)', () => {
    const result = setWeeklyScheduleSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('rejects entry with end before start', () => {
    const result = setWeeklyScheduleSchema.safeParse([
      { day_of_week: 'monday', start_time: '17:00', end_time: '08:00' },
    ]);
    expect(result.success).toBe(false);
  });
});
