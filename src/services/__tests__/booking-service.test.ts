import { describe, it, expect } from 'vitest';
import { isValidTransition } from '../booking-service';
import type { BookingStatus } from '@/config/constants';

describe('isValidTransition', () => {
  // --------------------------------------------------
  // Valid transitions (booking-as-request model)
  // --------------------------------------------------

  it('allows new_request → contacted', () => {
    expect(isValidTransition('new_request', 'contacted')).toBe(true);
  });

  it('allows new_request → confirmed', () => {
    expect(isValidTransition('new_request', 'confirmed')).toBe(true);
  });

  it('allows new_request → rejected', () => {
    expect(isValidTransition('new_request', 'rejected')).toBe(true);
  });

  it('allows new_request → cancelled', () => {
    expect(isValidTransition('new_request', 'cancelled')).toBe(true);
  });

  it('allows contacted → confirmed', () => {
    expect(isValidTransition('contacted', 'confirmed')).toBe(true);
  });

  it('allows contacted → rejected', () => {
    expect(isValidTransition('contacted', 'rejected')).toBe(true);
  });

  it('allows contacted → cancelled', () => {
    expect(isValidTransition('contacted', 'cancelled')).toBe(true);
  });

  it('allows confirmed → completed', () => {
    expect(isValidTransition('confirmed', 'completed')).toBe(true);
  });

  it('allows confirmed → cancelled', () => {
    expect(isValidTransition('confirmed', 'cancelled')).toBe(true);
  });

  it('allows confirmed → no_show', () => {
    expect(isValidTransition('confirmed', 'no_show')).toBe(true);
  });

  // --------------------------------------------------
  // Invalid transitions (terminal states)
  // --------------------------------------------------

  it('disallows completed → anything', () => {
    const targets: BookingStatus[] = [
      'new_request',
      'contacted',
      'confirmed',
      'cancelled',
      'rejected',
      'no_show',
    ];
    for (const to of targets) {
      expect(isValidTransition('completed', to)).toBe(false);
    }
  });

  it('disallows cancelled → anything', () => {
    const targets: BookingStatus[] = [
      'new_request',
      'contacted',
      'confirmed',
      'completed',
      'rejected',
      'no_show',
    ];
    for (const to of targets) {
      expect(isValidTransition('cancelled', to)).toBe(false);
    }
  });

  it('disallows rejected → anything', () => {
    const targets: BookingStatus[] = [
      'new_request',
      'contacted',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
    ];
    for (const to of targets) {
      expect(isValidTransition('rejected', to)).toBe(false);
    }
  });

  it('disallows no_show → anything', () => {
    const targets: BookingStatus[] = [
      'new_request',
      'contacted',
      'confirmed',
      'completed',
      'cancelled',
      'rejected',
    ];
    for (const to of targets) {
      expect(isValidTransition('no_show', to)).toBe(false);
    }
  });

  // --------------------------------------------------
  // Invalid transitions (skip states)
  // --------------------------------------------------

  it('disallows new_request → completed (must go through confirmed)', () => {
    expect(isValidTransition('new_request', 'completed')).toBe(false);
  });

  it('disallows new_request → no_show', () => {
    expect(isValidTransition('new_request', 'no_show')).toBe(false);
  });

  it('disallows contacted → completed', () => {
    expect(isValidTransition('contacted', 'completed')).toBe(false);
  });

  it('disallows contacted → no_show', () => {
    expect(isValidTransition('contacted', 'no_show')).toBe(false);
  });

  it('disallows self-transitions', () => {
    const statuses: BookingStatus[] = [
      'new_request',
      'contacted',
      'confirmed',
      'completed',
      'cancelled',
      'rejected',
      'no_show',
    ];
    for (const s of statuses) {
      expect(isValidTransition(s, s)).toBe(false);
    }
  });
});
