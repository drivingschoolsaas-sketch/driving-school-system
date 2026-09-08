// ==================================================
// Buffer Travel Time Provider Tests
// ==================================================

import { describe, it, expect } from 'vitest';
import { BufferTravelTimeProvider } from '../buffer-provider';

describe('BufferTravelTimeProvider', () => {
  const provider = new BufferTravelTimeProvider();

  it('returns default buffer for same suburb', async () => {
    const result = await provider.getTravelTime(
      { suburb: 'Bondi' },
      { suburb: 'Bondi' }
    );
    expect(result.durationMinutes).toBe(15);
    expect(result.source).toBe('buffer');
    expect(result.distanceKm).toBeNull();
  });

  it('returns longer buffer for different suburbs', async () => {
    const result = await provider.getTravelTime(
      { suburb: 'Bondi' },
      { suburb: 'Parramatta' }
    );
    expect(result.durationMinutes).toBe(30);
    expect(result.source).toBe('buffer');
  });

  it('is case-insensitive for suburb comparison', async () => {
    const result = await provider.getTravelTime(
      { suburb: 'BONDI' },
      { suburb: 'bondi' }
    );
    expect(result.durationMinutes).toBe(15);
  });

  it('returns default buffer when suburbs are unknown', async () => {
    const result = await provider.getTravelTime(
      { address: '123 Main St' },
      { address: '456 Elm St' }
    );
    expect(result.durationMinutes).toBe(15);
  });

  it('returns default buffer when one suburb is missing', async () => {
    const result = await provider.getTravelTime(
      { suburb: 'Bondi' },
      { address: '456 Elm St' }
    );
    expect(result.durationMinutes).toBe(15);
  });

  it('accepts custom options', async () => {
    const custom = new BufferTravelTimeProvider({
      defaultBufferMinutes: 10,
      differentSuburbBufferMinutes: 45,
    });

    const same = await custom.getTravelTime(
      { suburb: 'Bondi' },
      { suburb: 'Bondi' }
    );
    expect(same.durationMinutes).toBe(10);

    const different = await custom.getTravelTime(
      { suburb: 'Bondi' },
      { suburb: 'Parramatta' }
    );
    expect(different.durationMinutes).toBe(45);
  });

  it('has correct provider name', () => {
    expect(provider.name).toBe('buffer');
  });
});
