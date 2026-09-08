import { describe, it, expect } from 'vitest';
import { createVehicleSchema, updateVehicleSchema } from '../vehicle';

describe('createVehicleSchema', () => {
  const validInput = {
    name: 'White Corolla',
    make: 'Toyota',
    model: 'Corolla',
  };

  it('accepts valid input with defaults', () => {
    const result = createVehicleSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transmission).toBe('automatic');
    }
  });

  it('accepts full input', () => {
    const result = createVehicleSchema.safeParse({
      ...validInput,
      year: 2023,
      registration: 'ABC123',
      transmission: 'manual',
      assigned_instructor_id: 'aaaaaaaa-aaaa-4aaa-baaa-aaaaaaaaaaaa',
      notes: 'Dual controls installed',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty make', () => {
    const result = createVehicleSchema.safeParse({
      ...validInput,
      make: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects year before 1990', () => {
    const result = createVehicleSchema.safeParse({
      ...validInput,
      year: 1980,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateVehicleSchema', () => {
  it('accepts status change', () => {
    const result = updateVehicleSchema.safeParse({
      status: 'maintenance',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateVehicleSchema.safeParse({
      status: 'destroyed',
    });
    expect(result.success).toBe(false);
  });
});
