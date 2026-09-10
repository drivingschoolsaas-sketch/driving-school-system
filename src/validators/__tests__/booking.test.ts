import { describe, it, expect } from 'vitest';
import {
  createBookingSchema,
  updateBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  transitionBookingStatusSchema,
} from '../booking';

const uuid = 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa';
const uuid2 = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

describe('createBookingSchema', () => {
  const validInput = {
    instructor_id: uuid,
    student_id: uuid2,
    lesson_type_id: uuid,
    start_datetime: '2026-09-15T10:00:00Z',
    end_datetime: '2026-09-15T11:00:00Z',
    price_cents: 7500,
  };

  it('accepts valid minimal input', () => {
    const result = createBookingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts full input with optional fields', () => {
    const result = createBookingSchema.safeParse({
      ...validInput,
      vehicle_id: uuid,
      pickup_address: '123 Main St',
      pickup_suburb: 'Sydney',
      pickup_postcode: '2000',
      service_area_id: uuid,
      notes: 'First lesson',
    });
    expect(result.success).toBe(true);
  });

  it('rejects end before start', () => {
    const result = createBookingSchema.safeParse({
      ...validInput,
      start_datetime: '2026-09-15T11:00:00Z',
      end_datetime: '2026-09-15T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = createBookingSchema.safeParse({
      ...validInput,
      price_cents: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid instructor_id', () => {
    const result = createBookingSchema.safeParse({
      ...validInput,
      instructor_id: 'bad',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime format', () => {
    const result = createBookingSchema.safeParse({
      ...validInput,
      start_datetime: '2026-09-15 10:00',
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero price (free lesson)', () => {
    const result = createBookingSchema.safeParse({
      ...validInput,
      price_cents: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe('updateBookingSchema', () => {
  it('accepts partial update', () => {
    const result = updateBookingSchema.safeParse({
      admin_notes: 'Student needs extra practice',
      price_cents: 8000,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty update', () => {
    const result = updateBookingSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects negative price', () => {
    const result = updateBookingSchema.safeParse({
      price_cents: -50,
    });
    expect(result.success).toBe(false);
  });
});

describe('rescheduleBookingSchema', () => {
  it('accepts valid reschedule', () => {
    const result = rescheduleBookingSchema.safeParse({
      new_start_datetime: '2026-09-16T10:00:00Z',
      new_end_datetime: '2026-09-16T11:00:00Z',
      reason: 'Student requested change',
    });
    expect(result.success).toBe(true);
  });

  it('accepts reschedule with new instructor', () => {
    const result = rescheduleBookingSchema.safeParse({
      new_start_datetime: '2026-09-16T10:00:00Z',
      new_end_datetime: '2026-09-16T11:00:00Z',
      new_instructor_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it('rejects end before start', () => {
    const result = rescheduleBookingSchema.safeParse({
      new_start_datetime: '2026-09-16T11:00:00Z',
      new_end_datetime: '2026-09-16T10:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('cancelBookingSchema', () => {
  it('accepts with reason', () => {
    const result = cancelBookingSchema.safeParse({
      reason: 'Student cancelled',
    });
    expect(result.success).toBe(true);
  });

  it('accepts without reason', () => {
    const result = cancelBookingSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('transitionBookingStatusSchema', () => {
  it('accepts valid status', () => {
    const statuses = [
      'new_request',
      'contacted',
      'confirmed',
      'completed',
      'cancelled',
      'rejected',
      'no_show',
    ];
    for (const status of statuses) {
      const result = transitionBookingStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = transitionBookingStatusSchema.safeParse({
      status: 'deleted',
    });
    expect(result.success).toBe(false);
  });

  it('rejects old non-MVP statuses', () => {
    for (const status of ['pending', 'awaiting_payment', 'rescheduled']) {
      const result = transitionBookingStatusSchema.safeParse({ status });
      expect(result.success).toBe(false);
    }
  });

  it('accepts status with reason', () => {
    const result = transitionBookingStatusSchema.safeParse({
      status: 'cancelled',
      reason: 'No show after 15 minutes',
    });
    expect(result.success).toBe(true);
  });
});
