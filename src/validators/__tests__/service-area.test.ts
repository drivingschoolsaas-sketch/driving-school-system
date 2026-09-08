import { describe, it, expect } from 'vitest';
import {
  createServiceAreaSchema,
  updateServiceAreaSchema,
  assignInstructorAreaSchema,
} from '../service-area';

describe('createServiceAreaSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createServiceAreaSchema.safeParse({ name: 'Inner West' });
    expect(result.success).toBe(true);
  });

  it('accepts full input', () => {
    const result = createServiceAreaSchema.safeParse({
      name: 'Parramatta',
      suburb: 'Parramatta',
      postcode: '2150',
      state: 'NSW',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = createServiceAreaSchema.safeParse({ name: 'X' });
    expect(result.success).toBe(false);
  });

  it('trims name whitespace', () => {
    const result = createServiceAreaSchema.safeParse({ name: '  Inner West  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Inner West');
    }
  });
});

describe('updateServiceAreaSchema', () => {
  it('accepts partial updates with is_active', () => {
    const result = updateServiceAreaSchema.safeParse({
      name: 'Updated Area',
      is_active: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty update', () => {
    const result = updateServiceAreaSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('assignInstructorAreaSchema', () => {
  const validInput = {
    instructor_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
    service_area_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  };

  it('accepts valid input with default buffer', () => {
    const result = assignInstructorAreaSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.travel_buffer_minutes).toBe(15);
    }
  });

  it('accepts custom travel buffer', () => {
    const result = assignInstructorAreaSchema.safeParse({
      ...validInput,
      travel_buffer_minutes: 30,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid instructor_id', () => {
    const result = assignInstructorAreaSchema.safeParse({
      ...validInput,
      instructor_id: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects travel buffer over 120 minutes', () => {
    const result = assignInstructorAreaSchema.safeParse({
      ...validInput,
      travel_buffer_minutes: 150,
    });
    expect(result.success).toBe(false);
  });
});
