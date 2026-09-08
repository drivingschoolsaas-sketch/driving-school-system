import { expect } from 'vitest';
import { AppError } from '@/lib/errors/app-error';

/**
 * Assert that a function throws an AppError with a specific error code.
 */
export function expectAppError(fn: () => unknown, expectedCode: string): void {
  try {
    fn();
    expect.fail(`Expected AppError with code ${expectedCode} but no error was thrown`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(expectedCode);
  }
}

/**
 * Assert that an async function throws an AppError with a specific error code.
 */
export async function expectAppErrorAsync(
  fn: () => Promise<unknown>,
  expectedCode: string
): Promise<void> {
  try {
    await fn();
    expect.fail(`Expected AppError with code ${expectedCode} but no error was thrown`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(expectedCode);
  }
}
