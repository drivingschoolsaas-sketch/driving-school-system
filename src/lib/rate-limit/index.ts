// ==================================================
// In-Memory Rate Limiter (P2-2)
// ==================================================
// Simple sliding-window rate limiter for server actions
// and API routes. Uses an in-memory Map, so limits reset
// on server restart. For production at scale, swap the
// store for Redis.
//
// Usage:
//   const limiter = createRateLimiter({ windowMs: 60_000, max: 5 });
//   // In a server action or API route:
//   const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
//   limiter.check(ip); // throws if over limit

import { logger } from '@/lib/logging';

export interface RateLimiterOptions {
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum number of requests per window per key. */
  max: number;
  /** Optional name for logging. */
  name?: string;
}

interface WindowEntry {
  timestamps: number[];
}

export interface RateLimiter {
  /** Check if the key is within the rate limit. Throws if over limit. */
  check(key: string): void;
  /** Check without throwing — returns { allowed, remaining, retryAfterMs }. */
  tryCheck(key: string): { allowed: boolean; remaining: number; retryAfterMs: number };
  /** Reset a specific key. */
  reset(key: string): void;
}

/**
 * Create an in-memory sliding-window rate limiter.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, max, name = 'rate-limiter' } = options;
  const store = new Map<string, WindowEntry>();

  // Periodically clean stale entries (every 60s)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow GC if the module is unloaded
  if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }

  function getEntry(key: string): WindowEntry {
    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }
    // Prune expired timestamps
    const now = Date.now();
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    return entry;
  }

  function tryCheck(key: string) {
    const entry = getEntry(key);

    if (entry.timestamps.length >= max) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = windowMs - (Date.now() - oldestInWindow);
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    entry.timestamps.push(Date.now());
    return { allowed: true, remaining: max - entry.timestamps.length, retryAfterMs: 0 };
  }

  function check(key: string): void {
    const result = tryCheck(key);
    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        feature: 'rate-limit',
        limiter: name,
        key: key.slice(0, 32), // Truncate for privacy
        retryAfterMs: result.retryAfterMs,
      });
      throw new RateLimitError(
        'Too many requests. Please try again later.',
        result.retryAfterMs
      );
    }
  }

  function reset(key: string): void {
    store.delete(key);
  }

  return { check, tryCheck, reset };
}

/**
 * Rate limit error with retry-after information.
 */
export class RateLimitError extends Error {
  readonly retryAfterMs: number;
  readonly statusCode = 429;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// --------------------------------------------------
// Pre-configured limiters for common use cases
// --------------------------------------------------

/** Public form submissions: 5 per minute per IP. */
export const publicFormLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  name: 'public-form',
});

/** Auth actions (sign-in, sign-up, reset): 10 per 15 minutes per IP. */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  name: 'auth',
});

/** API routes: 60 per minute per IP. */
export const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 60,
  name: 'api',
});
