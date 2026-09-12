// ==================================================
// Platform Admin PIN Gate
// ==================================================
// Secondary security layer for platform admin access.
// Requires a PIN to be entered before accessing /admin
// routes, even after Supabase authentication.
//
// The PIN is stored in PLATFORM_ADMIN_PIN env var.
// Verification is tracked via an HMAC-signed cookie
// with a configurable expiry (default 4 hours).

import 'server-only';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'x-admin-pin-verified';
const PIN_EXPIRY_HOURS = 4;

/**
 * Check if the admin PIN gate is enabled.
 * Returns false if PLATFORM_ADMIN_PIN is not set.
 */
export function isAdminPinEnabled(): boolean {
  return !!process.env.PLATFORM_ADMIN_PIN;
}

/**
 * Get the signing secret for HMAC.
 * Uses SUPABASE_SERVICE_ROLE_KEY as the HMAC key (always available, never client-exposed).
 */
function getSigningSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin PIN signing');
  }
  return secret;
}

/**
 * Verify a PIN attempt against the stored PIN.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPin(attempt: string): boolean {
  const storedPin = process.env.PLATFORM_ADMIN_PIN;
  if (!storedPin) return false;

  const attemptBuf = Buffer.from(attempt.trim());
  const storedBuf = Buffer.from(storedPin.trim());

  if (attemptBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(attemptBuf, storedBuf);
}

/**
 * Create a signed verification token.
 * Contains: userId + timestamp, signed with HMAC-SHA256.
 */
function createToken(userId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');
  return `${payload}:${hmac}`;
}

/**
 * Verify a signed token is valid and not expired.
 */
function verifyToken(token: string, expectedUserId: string): boolean {
  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [userId, timestamp, signature] = parts;

  // Verify user matches
  if (userId !== expectedUserId) return false;

  // Verify not expired
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime)) return false;
  const elapsed = Date.now() - tokenTime;
  const maxAge = PIN_EXPIRY_HOURS * 60 * 60 * 1000;
  if (elapsed > maxAge || elapsed < 0) return false;

  // Verify HMAC signature
  const payload = `${userId}:${timestamp}`;
  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (sigBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Check if the current request has a valid PIN verification cookie.
 */
export async function isAdminPinVerified(userId: string): Promise<boolean> {
  if (!isAdminPinEnabled()) return true; // No PIN configured = always verified

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  return verifyToken(token, userId);
}

/**
 * Set the PIN verification cookie after successful verification.
 */
export async function setAdminPinVerified(userId: string): Promise<void> {
  const token = createToken(userId);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    path: '/admin',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: PIN_EXPIRY_HOURS * 60 * 60,
  });
}

/**
 * Clear the PIN verification cookie (on sign-out or manual lock).
 */
export async function clearAdminPinVerification(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
