export type {
  TravelTimeProvider,
  TravelPoint,
  TravelTimeResult,
} from './types';
export { BufferTravelTimeProvider } from './buffer-provider';
export type { BufferProviderOptions } from './buffer-provider';

import type { TravelTimeProvider } from './types';
import { BufferTravelTimeProvider } from './buffer-provider';

let _provider: TravelTimeProvider | null = null;

/**
 * Get the travel time provider (singleton).
 * Currently returns the buffer-based provider.
 * Swap for a mapping API provider when ready.
 */
export function getTravelTimeProvider(): TravelTimeProvider {
  if (_provider) return _provider;
  // TODO: Check env for mapping API key and use API provider
  _provider = new BufferTravelTimeProvider();
  return _provider;
}
