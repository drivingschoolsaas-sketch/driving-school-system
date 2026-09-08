'use server';

// ==================================================
// Auth Server Actions
// ==================================================
// Server Actions for sign-in, sign-up, sign-out,
// password reset, and password update.
//
// These run on the server and handle Supabase Auth
// calls safely, never exposing secrets to the client.

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/database/supabase-server';
import { validateRedirectUrl } from './redirect-url';
import { signInSchema, signUpSchema, forgotPasswordSchema, resetPasswordSchema } from '@/validators/auth';
import { logger } from '@/lib/logging';

/**
 * Standard result type for auth actions.
 * Actions that succeed redirect — only errors return a result.
 */
export interface AuthActionResult {
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * Sign in with email and password.
 */
export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logger.warn('Sign-in failed', {
      feature: 'auth',
      operation: 'sign_in',
      email: parsed.data.email,
      errorMessage: error.message,
    });
    return { error: 'Invalid email or password.' };
  }

  // Redirect to the returnTo URL or default
  const returnTo = formData.get('returnTo') as string | null;
  const safeUrl = validateRedirectUrl(returnTo, '/dashboard');
  redirect(safeUrl);
}

/**
 * Sign up with email, password, and full name.
 */
export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    fullName: formData.get('fullName'),
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    logger.warn('Sign-up failed', {
      feature: 'auth',
      operation: 'sign_up',
      email: parsed.data.email,
      errorMessage: error.message,
    });

    // Don't reveal whether the email is already registered
    if (error.message.includes('already registered')) {
      return {
        success: true,
        message: 'Check your email for a confirmation link.',
      };
    }

    return { error: 'Unable to create account. Please try again.' };
  }

  return {
    success: true,
    message: 'Check your email for a confirmation link.',
  };
}

/**
 * Send a password reset email.
 */
export async function forgotPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const raw = { email: formData.get('email') };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      // Supabase will append the token to this URL
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`,
    }
  );

  if (error) {
    logger.warn('Password reset request failed', {
      feature: 'auth',
      operation: 'forgot_password',
      email: parsed.data.email,
      errorMessage: error.message,
    });
  }

  // Always return success to prevent email enumeration
  return {
    success: true,
    message: 'If an account exists with that email, you will receive a password reset link.',
  };
}

/**
 * Update password (after clicking reset link).
 */
export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logger.error('Password reset failed', error, {
      feature: 'auth',
      operation: 'reset_password',
    });
    return { error: 'Unable to update password. The reset link may have expired.' };
  }

  redirect('/auth/sign-in?message=password_updated');
}

/**
 * Sign out the current user.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/auth/sign-in');
}
