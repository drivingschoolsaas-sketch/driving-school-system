import { describe, it, expect } from 'vitest';
import {
  computeAvailableSlots,
  timeToMinutes,
  minutesToTime,
  dateToDayOfWeek,
  subtractIntervals,
} from '../availability-engine';
import type {
  RuleInput,
  ExceptionInput,
  BlockedTimeInput,
  BookingInput,
} from '../availability-engine';

// --------------------------------------------------
// Helper tests
// --------------------------------------------------

describe('timeToMinutes', () => {
  it('converts 00:00 to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts 08:30 to 510', () => {
    expect(timeToMinutes('08:30')).toBe(510);
  });

  it('converts 23:59 to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('handles HH:MM:SS format', () => {
    expect(timeToMinutes('12:30:00')).toBe(750);
  });
});

describe('minutesToTime', () => {
  it('converts 0 to 00:00', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('converts 510 to 08:30', () => {
    expect(minutesToTime(510)).toBe('08:30');
  });

  it('converts 1439 to 23:59', () => {
    expect(minutesToTime(1439)).toBe('23:59');
  });
});

describe('dateToDayOfWeek', () => {
  it('returns monday for 2026-09-07', () => {
    expect(dateToDayOfWeek('2026-09-07')).toBe('monday');
  });

  it('returns friday for 2026-09-11', () => {
    expect(dateToDayOfWeek('2026-09-11')).toBe('friday');
  });

  it('returns sunday for 2026-09-13', () => {
    expect(dateToDayOfWeek('2026-09-13')).toBe('sunday');
  });
});

describe('subtractIntervals', () => {
  it('returns original when no blocked intervals', () => {
    const result = subtractIntervals([[480, 1020]], []);
    expect(result).toEqual([[480, 1020]]);
  });

  it('removes a middle section', () => {
    // 08:00–17:00, block 12:00–13:00
    const result = subtractIntervals([[480, 1020]], [[720, 780]]);
    expect(result).toEqual([
      [480, 720],
      [780, 1020],
    ]);
  });

  it('removes the start', () => {
    const result = subtractIntervals([[480, 1020]], [[480, 540]]);
    expect(result).toEqual([[540, 1020]]);
  });

  it('removes the end', () => {
    const result = subtractIntervals([[480, 1020]], [[960, 1020]]);
    expect(result).toEqual([[480, 960]]);
  });

  it('removes entire interval', () => {
    const result = subtractIntervals([[480, 1020]], [[400, 1100]]);
    expect(result).toEqual([]);
  });

  it('handles multiple blocked intervals', () => {
    const result = subtractIntervals(
      [[480, 1020]],
      [
        [720, 780], // lunch
        [900, 960], // appointment
      ]
    );
    expect(result).toEqual([
      [480, 720],
      [780, 900],
      [960, 1020],
    ]);
  });
});

// --------------------------------------------------
// Engine tests
// --------------------------------------------------

describe('computeAvailableSlots', () => {
  const mondayRules: RuleInput[] = [
    { day_of_week: 'monday', start_time: '08:00', end_time: '17:00', is_active: true },
  ];

  // 2026-09-07 is a Monday
  const date = '2026-09-07';

  it('generates 60-minute slots for a full working day', () => {
    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [],
      blockedTimes: [],
      existingBookings: [],
      lessonDurationMinutes: 60,
    });

    // 08:00–17:00 = 9 hours. 60-min slots on 30-min steps: 08:00, 08:30, 09:00, ..., 16:00
    expect(slots.length).toBe(17);
    expect(slots[0]).toEqual({
      start: '2026-09-07T08:00:00',
      end: '2026-09-07T09:00:00',
    });
    expect(slots[slots.length - 1]).toEqual({
      start: '2026-09-07T16:00:00',
      end: '2026-09-07T17:00:00',
    });
  });

  it('returns empty when no rule matches the day', () => {
    const tuesdayRules: RuleInput[] = [
      { day_of_week: 'tuesday', start_time: '08:00', end_time: '17:00', is_active: true },
    ];

    const slots = computeAvailableSlots({
      date, // Monday
      rules: tuesdayRules,
      exceptions: [],
      blockedTimes: [],
      existingBookings: [],
      lessonDurationMinutes: 60,
    });

    expect(slots).toEqual([]);
  });

  it('returns empty when rule is inactive', () => {
    const inactiveRules: RuleInput[] = [
      { day_of_week: 'monday', start_time: '08:00', end_time: '17:00', is_active: false },
    ];

    const slots = computeAvailableSlots({
      date,
      rules: inactiveRules,
      exceptions: [],
      blockedTimes: [],
      existingBookings: [],
      lessonDurationMinutes: 60,
    });

    expect(slots).toEqual([]);
  });

  it('respects exception: day off', () => {
    const exception: ExceptionInput = {
      exception_date: date,
      is_available: false,
      start_time: null,
      end_time: null,
    };

    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [exception],
      blockedTimes: [],
      existingBookings: [],
      lessonDurationMinutes: 60,
    });

    expect(slots).toEqual([]);
  });

  it('respects exception: reduced hours', () => {
    const exception: ExceptionInput = {
      exception_date: date,
      is_available: true,
      start_time: '12:00',
      end_time: '17:00',
    };

    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [exception],
      blockedTimes: [],
      existingBookings: [],
      lessonDurationMinutes: 60,
    });

    // 12:00–17:00 = 5 hours. 60-min on 30-min steps: 12:00, 12:30, ..., 16:00 = 9 slots
    expect(slots.length).toBe(9);
    expect(slots[0].start).toBe('2026-09-07T12:00:00');
  });

  it('subtracts blocked times (lunch)', () => {
    const blocked: BlockedTimeInput[] = [
      {
        start_datetime: '2026-09-07T12:00:00',
        end_datetime: '2026-09-07T13:00:00',
      },
    ];

    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [],
      blockedTimes: blocked,
      existingBookings: [],
      lessonDurationMinutes: 60,
    });

    // No slot should overlap with 12:00–13:00
    const overlapping = slots.filter((s) => {
      const sStart = timeToMinutes(s.start.split('T')[1]);
      const sEnd = timeToMinutes(s.end.split('T')[1]);
      return sStart < 780 && sEnd > 720; // 12:00=720, 13:00=780
    });
    expect(overlapping).toEqual([]);
  });

  it('subtracts existing bookings', () => {
    const bookings: BookingInput[] = [
      {
        start_datetime: '2026-09-07T10:00:00',
        end_datetime: '2026-09-07T11:00:00',
      },
    ];

    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [],
      blockedTimes: [],
      existingBookings: bookings,
      lessonDurationMinutes: 60,
    });

    // No slot should overlap with 10:00–11:00
    const overlapping = slots.filter((s) => {
      const sStart = timeToMinutes(s.start.split('T')[1]);
      const sEnd = timeToMinutes(s.end.split('T')[1]);
      return sStart < 660 && sEnd > 600; // 10:00=600, 11:00=660
    });
    expect(overlapping).toEqual([]);
  });

  it('applies travel buffer around bookings', () => {
    const bookings: BookingInput[] = [
      {
        start_datetime: '2026-09-07T10:00:00',
        end_datetime: '2026-09-07T11:00:00',
      },
    ];

    const slotsNoBuffer = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [],
      blockedTimes: [],
      existingBookings: bookings,
      lessonDurationMinutes: 60,
      travelBufferMinutes: 0,
    });

    const slotsWithBuffer = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [],
      blockedTimes: [],
      existingBookings: bookings,
      lessonDurationMinutes: 60,
      travelBufferMinutes: 15,
    });

    // Buffer should remove more slots
    expect(slotsWithBuffer.length).toBeLessThan(slotsNoBuffer.length);

    // Slot at 09:00–10:00 should be gone with 15-min buffer
    // because booking at 10:00 with 15-min buffer blocks from 09:45
    const nineSlot = slotsWithBuffer.find((s) => s.start === '2026-09-07T09:00:00');
    expect(nineSlot).toBeUndefined();
  });

  it('generates 90-minute slots correctly', () => {
    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [],
      blockedTimes: [],
      existingBookings: [],
      lessonDurationMinutes: 90,
    });

    // 08:00–17:00 = 540 min. 90-min on 30-min steps: 08:00–09:30, 08:30–10:00, ..., 15:30–17:00
    // Last valid start = 17:00 - 90min = 15:30
    expect(slots[0]).toEqual({
      start: '2026-09-07T08:00:00',
      end: '2026-09-07T09:30:00',
    });
    expect(slots[slots.length - 1]).toEqual({
      start: '2026-09-07T15:30:00',
      end: '2026-09-07T17:00:00',
    });
  });

  it('returns empty for zero or negative duration', () => {
    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [],
      blockedTimes: [],
      existingBookings: [],
      lessonDurationMinutes: 0,
    });

    expect(slots).toEqual([]);
  });

  it('handles combined blocked times and bookings', () => {
    const blocked: BlockedTimeInput[] = [
      {
        start_datetime: '2026-09-07T12:00:00',
        end_datetime: '2026-09-07T13:00:00',
      },
    ];
    const bookings: BookingInput[] = [
      {
        start_datetime: '2026-09-07T14:00:00',
        end_datetime: '2026-09-07T15:00:00',
      },
    ];

    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [],
      blockedTimes: blocked,
      existingBookings: bookings,
      lessonDurationMinutes: 60,
    });

    // No slot should overlap with 12:00–13:00 or 14:00–15:00
    for (const s of slots) {
      const sStart = timeToMinutes(s.start.split('T')[1]);
      const sEnd = timeToMinutes(s.end.split('T')[1]);
      const overlapsLunch = sStart < 780 && sEnd > 720;
      const overlapsBooking = sStart < 900 && sEnd > 840;
      expect(overlapsLunch).toBe(false);
      expect(overlapsBooking).toBe(false);
    }
  });

  it('exception overrides rule even if rule exists', () => {
    // Rule says 08:00–17:00, exception says 09:00–12:00
    const exception: ExceptionInput = {
      exception_date: date,
      is_available: true,
      start_time: '09:00',
      end_time: '12:00',
    };

    const slots = computeAvailableSlots({
      date,
      rules: mondayRules,
      exceptions: [exception],
      blockedTimes: [],
      existingBookings: [],
      lessonDurationMinutes: 60,
    });

    // All slots should be within 09:00–12:00
    for (const s of slots) {
      expect(s.start >= '2026-09-07T09:00:00').toBe(true);
      expect(s.end <= '2026-09-07T12:00:00').toBe(true);
    }
  });
});
