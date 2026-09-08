// ==================================================
// Buffer-Based Travel Time Provider
// ==================================================
// Simple implementation using configurable defaults.
// Same suburb = default buffer, different suburb =
// extended buffer. No external API dependency.

import type {
  TravelTimeProvider,
  TravelPoint,
  TravelTimeResult,
} from './types';

export interface BufferProviderOptions {
  /** Default buffer in minutes (same suburb or unknown) */
  defaultBufferMinutes: number;
  /** Buffer in minutes for different suburbs */
  differentSuburbBufferMinutes: number;
}

const DEFAULT_OPTIONS: BufferProviderOptions = {
  defaultBufferMinutes: 15,
  differentSuburbBufferMinutes: 30,
};

export class BufferTravelTimeProvider implements TravelTimeProvider {
  readonly name = 'buffer';
  private options: BufferProviderOptions;

  constructor(options?: Partial<BufferProviderOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async getTravelTime(
    from: TravelPoint,
    to: TravelPoint
  ): Promise<TravelTimeResult> {
    // If both have suburbs and they differ, use the longer buffer
    const sameSuburb =
      from.suburb &&
      to.suburb &&
      from.suburb.toLowerCase() === to.suburb.toLowerCase();

    const durationMinutes =
      sameSuburb || !from.suburb || !to.suburb
        ? this.options.defaultBufferMinutes
        : this.options.differentSuburbBufferMinutes;

    return {
      durationMinutes,
      distanceKm: null, // Buffer provider doesn't know distance
      source: 'buffer',
    };
  }
}
