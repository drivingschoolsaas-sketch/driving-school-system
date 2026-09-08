import { describe, it, expect } from 'vitest';
import { isValidTransition } from '../booking-service';
import type { BookingStatus } from '@/config/constants';

describe('isValidTransition', () => {
  // --------------------------------------------------
  // Valid transitions
  // --------------------------------------------------

  it('allows pending → awaiting_payment', () => {
    expect(isValidTransition('pending', 'awaiting_payment')).toBe(true);
  });

  it('allows pending → confirmed', () => {
    expect(isValidTransition('pending', 'confirmed')).toBe(true);
  });

  it('allows pending → cancelled', () => {
    expect(isValidTransition('pending', 'cancelled')).toBe(true);
  });

  it('allows awaiting_payment → confirmed', () => {
    expect(isValidTransition('awaiting_payment', 'confirmed')).toBe(true);
  });

  it('allows awaiting_payment → cancelled', () => {
    expect(isValidTransition('awaiting_payment', 'cancelled')).toBe(true);
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

  it('allows confirmed → rescheduled', () => {
    expect(isValidTransition('confirmed', 'rescheduled')).toBe(true);
  });

  // --------------------------------------------------
  // Invalid transitions (terminal states)
  // --------------------------------------------------

  it('disallows completed → anything', () => {
    const targets: BookingStatus[] = [
      'pending',
      'awaiting_payment',
      'confirmed',
      'cancelled',
      'no_show',
      'rescheduled',
    ];
    for (const to of targets) {
      expect(isValidTransition('completed', to)).toBe(false);
    }
  });

  it('disallows cancelled → anything', () => {
    const targets: BookingStatus[] = [
      'pending',
      'awaiting_payment',
      'confirmed',
      'completed',
      'no_show',
      'rescheduled',
    ];
    for (const to of targets) {
      expect(isValidTransition('cancelled', to)).toBe(false);
    }
  });

  it('disallows no_show → anything', () => {
    const targets: BookingStatus[] = [
      'pending',
      'awaiting_payment',
      'confirmed',
      'completed',
      'cancelled',
      'rescheduled',
    ];
    for (const to of targets) {
      expect(isValidTransition('no_show', to)).toBe(false);
    }
  });

  it('disallows rescheduled → anything', () => {
    const targets: BookingStatus[] = [
      'pending',
      'awaiting_payment',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
    ];
    for (const to of targets) {
      expect(isValidTransition('rescheduled', to)).toBe(false);
    }
  });

  // --------------------------------------------------
  // Invalid transitions (skip states)
  // --------------------------------------------------

  it('disallows pending → completed (must go through confirmed)', () => {
    expect(isValidTransition('pending', 'completed')).toBe(false);
  });

  it('disallows pending → no_show', () => {
    expect(isValidTransition('pending', 'no_show')).toBe(false);
  });

  it('disallows pending → rescheduled', () => {
    expect(isValidTransition('pending', 'rescheduled')).toBe(false);
  });

  it('disallows awaiting_payment → completed', () => {
    expect(isValidTransition('awaiting_payment', 'completed')).toBe(false);
  });

  it('disallows awaiting_payment → no_show', () => {
    expect(isValidTransition('awaiting_payment', 'no_show')).toBe(false);
  });

  it('disallows self-transitions', () => {
    const statuses: BookingStatus[] = [
      'pending',
      'awaiting_payment',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled',
    ];
    for (const s of statuses) {
      expect(isValidTransition(s, s)).toBe(false);
    }
  });
});
