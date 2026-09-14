import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { classifyHostname } from '@/lib/tenant/domain-normalizer';

// ==================================================
// Next.js Middleware
// ==================================================
// Runs on every request. Responsibilities:
// 1. Classify the incoming hostname
// 2. Set tenant context headers for downstream use
// 3. Refresh Supabase auth tokens (cookie-based)
// 4. Protect /admin and /portal routes

const PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'driveflow.com.au';
const ADMIN_SUBDOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN ?? 'admin';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? 'localhost';
  const classification = classifyHostname(
    hostname,
    PLATFORM_DOMAIN,
    ADMIN_SUBDOMAIN
  );

  // Check for ?tenant= query parameter override (for testing on Vercel
  // where wildcard subdomains aren't available on .vercel.app domains).
  // If no ?tenant= param, fall back to a previously-set cookie so that
  // internal navigation (Link clicks) doesn't lose the tenant context.
  let tenantOverride = request.nextUrl.searchParams.get('tenant');

  if (!tenantOverride) {
    // Fall back to cookie set by a previous ?tenant= request
    tenantOverride = request.cookies.get('x-tenant-slug')?.value ?? null;
  }

  // Build request headers that Server Components will see via headers().
  // NextResponse.next({ request: { headers } }) forwards these as
  // request headers — response.headers.set() only sets response headers
  // sent to the browser, NOT available in Server Components.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-hostname-type', classification.type);
  requestHeaders.set('x-normalized-hostname', classification.normalized);

  if (classification.subdomain) {
    requestHeaders.set('x-tenant-subdomain', classification.subdomain);
  }

  if (tenantOverride) {
    requestHeaders.set('x-tenant-override', tenantOverride);
  }

  // Create response with modified request headers
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Also set on response for browser dev tools visibility
  response.headers.set('x-hostname-type', classification.type);
  response.headers.set('x-normalized-hostname', classification.normalized);

  // Persist the tenant slug in a cookie so internal navigation
  // (Link clicks without ?tenant=) keeps the tenant context.
  const tenantFromUrl = request.nextUrl.searchParams.get('tenant');
  if (tenantFromUrl) {
    // User navigated with ?tenant=slug — persist it
    response.cookies.set('x-tenant-slug', tenantFromUrl, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      // 30 days; refreshed on each ?tenant= visit
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  // Refresh Supabase auth session (extends cookie expiry)
  // This must run on every request to keep sessions alive.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update cookies on the request for downstream Server Components
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Create a fresh response with the updated request cookies
          // AND the custom headers for Server Components
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          // Set cookies on the response for the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          // Re-apply response headers for browser dev tools
          response.headers.set('x-hostname-type', classification.type);
          response.headers.set(
            'x-normalized-hostname',
            classification.normalized
          );
          // Re-apply tenant cookie (lost when response was recreated)
          if (tenantFromUrl) {
            response.cookies.set('x-tenant-slug', tenantFromUrl, {
              path: '/',
              httpOnly: false,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30,
            });
          }
        },
      },
    });

    // getUser() refreshes the session if needed
    await supabase.auth.getUser();
  }

  // Route protection: redirect unauthenticated users from /admin and /portal
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/dashboard');

  if (isProtectedRoute) {
    // Check for the Supabase auth cookie presence
    // (Full authorization happens in the page via protectRoute)
    // Note: Supabase SSR v2+ may chunk large tokens into cookies like
    // sb-xxx-auth-token.0, sb-xxx-auth-token.1, etc. — so we use
    // includes() instead of endsWith() to match both chunked and
    // non-chunked cookie names.
    const hasAuthCookie = request.cookies.getAll().some(
      (cookie) =>
        cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
    );

    if (!hasAuthCookie) {
      const signInUrl = new URL('/auth/sign-in', request.url);
      signInUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Admin PIN gate: redirect to /admin/verify if PIN is required but not verified.
  // The PIN cookie is HMAC-signed — full signature verification happens server-side
  // in the verify action. Middleware only checks cookie presence for the redirect.
  const adminPin = process.env.PLATFORM_ADMIN_PIN;
  if (
    adminPin &&
    pathname.startsWith('/admin') &&
    pathname !== '/admin/verify'
  ) {
    const pinCookie = request.cookies.get('x-admin-pin-verified')?.value;
    if (!pinCookie) {
      return NextResponse.redirect(new URL('/admin/verify', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
