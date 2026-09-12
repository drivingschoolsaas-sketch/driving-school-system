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
  // where wildcard subdomains aren't available on .vercel.app domains)
  const tenantOverride = request.nextUrl.searchParams.get('tenant');

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
    const hasAuthCookie = request.cookies.getAll().some(
      (cookie) =>
        cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
    );

    if (!hasAuthCookie) {
      const signInUrl = new URL('/auth/sign-in', request.url);
      signInUrl.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(signInUrl);
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
