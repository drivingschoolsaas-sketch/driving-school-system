import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/supabase-server';
import { validateRedirectUrl } from '@/lib/auth/redirect-url';
import { logger } from '@/lib/logging';

// ==================================================
// Auth Callback Route Handler
// ==================================================
// Handles the callback from Supabase Auth:
// - Email confirmation (sign-up)
// - Password recovery (forgot password)
// - Magic link sign-in
//
// Supabase redirects here with ?code=... which we
// exchange for a session.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next');

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        logger.warn('Auth callback: code exchange failed', {
          feature: 'auth',
          operation: 'callback',
          type: type ?? 'unknown',
          errorMessage: error.message,
        });
        return NextResponse.redirect(
          `${origin}/auth/error?code=EXCHANGE_FAILED`
        );
      }

      // Determine where to redirect after successful auth
      if (type === 'recovery') {
        // Password recovery — redirect to reset password page
        return NextResponse.redirect(
          `${origin}/auth/reset-password`
        );
      }

      // Default: redirect to the "next" URL or home
      const safeNext = validateRedirectUrl(next, '/');
      return NextResponse.redirect(`${origin}${safeNext}`);
    } catch (error) {
      logger.error('Auth callback: unexpected error', error, {
        feature: 'auth',
        operation: 'callback',
      });
      return NextResponse.redirect(
        `${origin}/auth/error?code=UNEXPECTED_ERROR`
      );
    }
  }

  // No code provided — redirect to sign-in
  return NextResponse.redirect(`${origin}/auth/sign-in`);
}
