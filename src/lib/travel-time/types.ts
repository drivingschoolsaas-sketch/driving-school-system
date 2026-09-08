// ==================================================
// Travel Time Provider Interface
// ==================================================
// Abstraction for travel time calculations between
// lesson locations. V1 uses a simple buffer-based
// estimate; later implementations can integrate
// mapping APIs (Google Maps, Mapbox, etc.).
//
// Do not make V1 depend on Google Maps.

/**
 * A geographic point for travel time calculation.
 */
export interface TravelPoint {
  address?: string;
  suburb?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
}

/**
 * Result of a travel time calculation.
 */
export interface TravelTimeResult {
  /** Estimated travel time in minutes */
  durationMinutes: number;
  /** Estimated distance in kilometers (if available) */
  distanceKm: number | null;
  /** Source of the estimate */
  source: 'buffer' | 'api';
}

/**
 * Travel time provider interface.
 * Implementations calculate travel time between two points.
 */
export interface TravelTimeProvider {
  /**
   * Calculate travel time between two points.
   */
  getTravelTime(
    from: TravelPoint,
    to: TravelPoint
  ): Promise<TravelTimeResult>;

  /**
   * Provider name for logging/debugging.
   */
  readonly name: string;
}
