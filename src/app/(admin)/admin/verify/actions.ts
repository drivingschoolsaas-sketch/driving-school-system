'use server';

// ==================================================
// Admin PIN Verification Action
// ==================================================
// Verifies the PIN and sets a signed cookie on success.
// Tracks failed attempts with rate limiting.

import { redirect } from 'next/navigation';
import { getPlatformAdminContext } from '@/lib/auth';
import { verifyPin, setAdminPinVerified } from '@/lib/auth/admin-pin';
import { logger } from '@/lib/logging';

interface PinFormState {
  success: boolean;
  error?: string;
  attempts?: number;
}

// In-memory rate limiter (per-process; resets on redeploy)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(userId: string): { allowed: boolean; attempts: number } {
  const record = failedAttempts.get(userId);
  if (!record) return { allowed: true, attempts: 0 };

  // Reset if lockout has expired
  if (Date.now() - record.lastAttempt > LOCKOUT_MS) {
    failedAttempts.delete(userId);
    return { allowed: true, attempts: 0 };
  }

  return { allowed: record.count < MAX_ATTEMPTS, attempts: record.count };
}

function recordFailedAttempt(userId: string): number {
  const record = failedAttempts.get(userId);
  const newCount = (record?.count ?? 0) + 1;
  failedAttempts.set(userId, { count: newCount, lastAttempt: Date.now() });
  return newCount;
}

export async function verifyAdminPinAction(
  _prevState: PinFormState,
  formData: FormData
): Promise<PinFormState> {
  try {
    const admin = await getPlatformAdminContext();
    const pin = formData.get('pin') as string;

    if (!pin?.trim()) {
      return { success: false, error: 'PIN is required', attempts: 0 };
    }

    // Check rate limit
    const { allowed, attempts } = checkRateLimit(admin.userId);
    if (!allowed) {
      logger.warn('Admin PIN rate limited', {
        feature: 'platform_admin',
        operation: 'pin_verify',
        userId: admin.userId,
      });
      return {
        success: false,
        error: 'Too many failed attempts. Please wait 15 minutes.',
        attempts,
      };
    }

    // Verify PIN
    if (!verifyPin(pin)) {
      const newAttempts = recordFailedAttempt(admin.userId);
      const remaining = MAX_ATTEMPTS - newAttempts;

      logger.warn('Admin PIN verification failed', {
        feature: 'platform_admin',
        operation: 'pin_verify',
        userId: admin.userId,
        attemptsUsed: newAttempts,
      });

      return {
        success: false,
        error:
          remaining > 0
            ? `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : 'Too many failed attempts. Please wait 15 minutes.',
        attempts: newAttempts,
      };
    }

    // Success — clear failed attempts and set cookie
    failedAttempts.delete(admin.userId);
    await setAdminPinVerified(admin.userId);

    logger.info('Admin PIN verified successfully', {
      feature: 'platform_admin',
      operation: 'pin_verify',
      userId: admin.userId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Verification failed';
    return { success: false, error: message };
  }

  // Redirect to admin dashboard (outside try-catch since redirect throws)
  redirect('/admin');
}
