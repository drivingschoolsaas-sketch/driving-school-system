import { describe, it, expect } from 'vitest';
import {
  signInSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../auth';

// ==================================================
// Auth Validator Tests
// ==================================================

describe('signInSchema', () => {
  it('accepts valid credentials', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('lowercases email', () => {
    const result = signInSchema.safeParse({
      email: 'User@Example.COM',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects invalid email', () => {
    const result = signInSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password longer than 128 characters', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(129),
    });
    expect(result.success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const validInput = {
    email: 'user@example.com',
    password: 'Password1',
    confirmPassword: 'Password1',
    fullName: 'Jane Smith',
  };

  it('accepts valid input', () => {
    const result = signUpSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects password without uppercase', () => {
    const result = signUpSchema.safeParse({
      ...validInput,
      password: 'password1',
      confirmPassword: 'password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = signUpSchema.safeParse({
      ...validInput,
      password: 'PASSWORD1',
      confirmPassword: 'PASSWORD1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = signUpSchema.safeParse({
      ...validInput,
      password: 'Password',
      confirmPassword: 'Password',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = signUpSchema.safeParse({
      ...validInput,
      confirmPassword: 'DifferentPassword1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (i) => i.path.includes('confirmPassword')
      );
      expect(confirmError).toBeDefined();
    }
  });

  it('rejects name shorter than 2 characters', () => {
    const result = signUpSchema.safeParse({
      ...validInput,
      fullName: 'J',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const result = signUpSchema.safeParse({
      ...validInput,
      fullName: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('trims the full name', () => {
    const result = signUpSchema.safeParse({
      ...validInput,
      fullName: '  Jane Smith  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe('Jane Smith');
    }
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'user@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'not-valid',
    });
    expect(result.success).toBe(false);
  });

  it('lowercases email', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'USER@Example.COM',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid matching passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewPassword1',
      confirmPassword: 'NewPassword1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewPassword1',
      confirmPassword: 'DifferentPassword1',
    });
    expect(result.success).toBe(false);
  });

  it('enforces password complexity', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'simple',
      confirmPassword: 'simple',
    });
    expect(result.success).toBe(false);
  });
});
