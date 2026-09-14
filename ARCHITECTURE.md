# DriveFlow — Complete Architecture Reference

> **Last updated:** September 2026  
> **Version:** Phase 16 Complete (All 16 Phases Done)  
> **Stack:** Next.js 16 · React 19 · Supabase · Tailwind CSS 4 · TypeScript (strict) · Zod 4 · Stripe · Vitest

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Environment & Configuration](#4-environment--configuration)
5. [Multi-Tenant Architecture](#5-multi-tenant-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Database Schema](#7-database-schema)
8. [Service Layer](#8-service-layer)
9. [Validators](#9-validators)
10. [Public Tenant Website](#10-public-tenant-website-tenant-routes)
11. [School Dashboard](#11-school-dashboard-dashboard-routes)
12. [Student Portal](#12-student-portal-portal-routes)
13. [Platform Admin Panel](#13-platform-admin-panel-admin-routes)
14. [Auth Pages](#14-auth-pages-auth-routes)
15. [Booking Flow](#15-booking-flow-end-to-end)
16. [Review & Moderation Flow](#16-review--moderation-flow)
17. [Notification System](#17-notification-system)
18. [Payment System](#18-payment-system)
19. [Subscription & Billing](#19-subscription--billing)
20. [Availability Engine](#20-availability-engine)
21. [Media Library](#21-media-library)
22. [Deployment](#22-deployment)

---

## 1. Platform Overview

DriveFlow is a **multi-tenant SaaS platform** for driving schools. Each driving school is an **organization** (tenant) that gets its own:

- **Public website** — landing page, lesson types, instructors, booking, reviews, success stories
- **School dashboard** — manage instructors, students, bookings, vehicles, payments, settings
- **Student portal** — students view their bookings, progress, packages, payments, and leave reviews

A **platform admin panel** lets the platform owner manage all organizations, subscriptions, feature flags, domains, and audit logs across every tenant.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Organization** | A single driving school (tenant). Has its own data, domain, settings. |
| **Tenant** | Synonym for organization. Resolved from hostname or `?tenant=slug`. |
| **Membership** | Connects a Supabase Auth user to an organization with a specific role. |
| **RLS** | Row-Level Security. Every tenant table has `organization_id` and RLS policies. |
| **Admin Client** | Server-side Supabase client using the service role key. Bypasses RLS. Used for cross-tenant queries and public pages. |

---

## 2. Tech Stack & Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.3.4 | App Router framework |
| `react` / `react-dom` | 19.2.8 | UI rendering |
| `@supabase/supabase-js` | ^2.115.0 | Supabase client (database, auth, storage) |
| `@supabase/ssr` | ^0.12.6 | Server-side Supabase auth (cookie-based sessions) |
| `stripe` | ^22.6.1 | Payment processing |
| `zod` | ^4.5.4 | Input validation schemas |
| `server-only` | ^0.0.1 | Prevents server modules from being imported on the client |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` ^5 | Strict TypeScript compilation |
| `tailwindcss` ^4 | Utility-first CSS framework |
| `@tailwindcss/postcss` ^4 | PostCSS integration for Tailwind |
| `eslint` ^9 + `eslint-config-next` | Linting |
| `vitest` ^3.2.7 | Unit/integration test runner |
| `@testing-library/react` + `jest-dom` | Component testing |
| `jsdom` ^30 | Browser environment for tests |

### NPM Scripts

```bash
npm run dev          # Start Next.js dev server (HMR)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript strict check (tsc --noEmit)
npm test             # Run tests once (vitest run)
npm run test:watch   # Tests in watch mode
npm run test:coverage # Tests with coverage
npm run verify       # Full CI: typecheck + lint + test + build
npm run db:migrate   # Run Supabase migrations
npm run db:seed      # Seed demo data
npm run db:create-admin # Create platform admin user
```

### Next.js Configuration (`next.config.ts`)

- **CSP headers**: `default-src 'self'`, script-src with `unsafe-inline`/`unsafe-eval` for dev
- **Security headers**: `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera/microphone/geolocation
- **Server actions body size limit**: 6MB (for hero slide uploads)
- **Images**: `remotePatterns` allows HTTPS from any hostname (tenant custom domains)
- **Standalone output** when `DOCKER_BUILD=1`
- **React strict mode** enabled

### Vercel Configuration (`vercel.json`)

- **Region**: `syd1` (Sydney)
- **Headers**: Same security headers as next.config.ts
- **Rewrites**: `/api/webhooks/:path*` passthrough

---

## 3. Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (tenant)/                 # Public school website (no auth required)
│   │   ├── layout.tsx            # Resolves tenant, provides header/footer/nav
│   │   ├── page.tsx              # Home page (hero, lessons, instructors, reviews)
│   │   ├── lessons/page.tsx      # Lesson types listing
│   │   ├── packages/page.tsx     # Lesson packages listing
│   │   ├── instructors/page.tsx  # Instructor profiles
│   │   ├── areas/page.tsx        # Service areas
│   │   ├── book/page.tsx         # Online booking wizard
│   │   ├── reviews/page.tsx      # Public reviews + submit form
│   │   ├── success-stories/page.tsx # Student success stories
│   │   ├── contact/page.tsx      # Contact page
│   │   └── components/           # MobileMenu, HeroSlider, TestimonialCarousel, FAQAccordion
│   │
│   ├── (dashboard)/              # School owner/admin dashboard (auth required)
│   │   ├── layout.tsx            # getDashboardContext() → sidebar + nav
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard home (stats, setup checklist, quick actions)
│   │       ├── today/page.tsx    # Today's schedule with action buttons
│   │       ├── calendar/page.tsx # Day/week calendar view
│   │       ├── bookings/page.tsx # Booking management (filters, status transitions)
│   │       ├── students/
│   │       │   ├── page.tsx      # Student list
│   │       │   └── [id]/page.tsx # Student detail (profile, bookings, progress, payments)
│   │       ├── instructors/
│   │       │   ├── page.tsx      # Instructor list
│   │       │   └── [id]/page.tsx # Instructor detail (schedule, students, performance)
│   │       ├── vehicles/page.tsx # Vehicle fleet management
│   │       ├── lesson-types/     # Lesson type CRUD
│   │       ├── packages/         # Lesson package CRUD
│   │       ├── availability/     # Weekly rules, exceptions, blocked times
│   │       ├── reviews/page.tsx  # Review moderation (approve/reject/feature)
│   │       ├── success-stories/  # Success story management
│   │       ├── payments/page.tsx # Payment tracking
│   │       ├── notifications/
│   │       │   ├── page.tsx      # Notification log
│   │       │   └── templates/    # Notification templates
│   │       ├── reports/page.tsx  # Business reports & analytics
│   │       ├── waitlist/page.tsx # Waitlist management
│   │       ├── media/page.tsx    # Media library (image uploads)
│   │       ├── hero-slides/      # Hero slider management
│   │       ├── settings/page.tsx # School settings & branding
│   │       └── billing/page.tsx  # Subscription & usage
│   │
│   ├── (portal)/                 # Student portal (auth required, feature-flag gated)
│   │   ├── layout.tsx            # getPortalContext() → student nav
│   │   └── portal/
│   │       ├── page.tsx          # Portal home (upcoming bookings, quick actions)
│   │       ├── bookings/page.tsx # Student's bookings
│   │       ├── progress/page.tsx # Skill progress tracking
│   │       ├── packages/page.tsx # Purchased packages
│   │       ├── payments/page.tsx # Payment history
│   │       ├── reviews/page.tsx  # Student's reviews
│   │       └── profile/page.tsx  # Edit profile
│   │
│   ├── (admin)/                  # Platform admin panel (platform role + PIN)
│   │   ├── layout.tsx            # getPlatformAdminContext() → admin nav
│   │   └── admin/
│   │       ├── page.tsx          # Admin dashboard (org stats, system health)
│   │       ├── verify/page.tsx   # Admin PIN verification
│   │       ├── organizations/
│   │       │   ├── page.tsx      # All organizations list
│   │       │   └── [id]/page.tsx # Organization detail
│   │       ├── subscriptions/    # Subscription management
│   │       ├── domains/page.tsx  # Domain management
│   │       ├── feature-flags/    # Feature flag toggles
│   │       ├── audit-logs/       # System-wide audit logs
│   │       └── health/page.tsx   # System health check
│   │
│   └── auth/                     # Authentication pages
│       ├── sign-in/page.tsx      # Email + password sign-in
│       ├── sign-up/page.tsx      # Registration
│       ├── forgot-password/      # Password reset request
│       ├── reset-password/       # Password reset form
│       └── error/page.tsx        # Auth error page
│
├── config/
│   ├── constants.ts              # All enums, status values, role definitions
│   └── env.ts                    # Zod-validated environment variables
│
├── lib/
│   ├── tenant/
│   │   ├── domain-normalizer.ts  # classifyHostname(), normalizeHostname()
│   │   ├── resolve-hostname.ts   # resolveHostname(), resolveTenantBySlug()
│   │   ├── get-tenant-data.ts    # getTenantData(), getTenantPageData()
│   │   ├── tenant-context.ts     # TenantContext, PlatformContext types
│   │   └── index.ts
│   ├── auth/
│   │   ├── authorization.ts      # authorizeForOrganization(), requirePermission(), requireRole()
│   │   ├── auth-actions.ts       # signInAction, signUpAction, forgotPasswordAction, resetPasswordAction
│   │   ├── session.ts            # getSession(), requireSession()
│   │   ├── protect-route.ts      # protectRoute()
│   │   ├── redirect-url.ts       # validateRedirectUrl()
│   │   ├── admin-pin.ts          # PIN gate (HMAC-signed cookie, 4-hour expiry)
│   │   ├── get-dashboard-context.ts
│   │   ├── get-portal-context.ts
│   │   ├── get-platform-admin-context.ts
│   │   └── index.ts
│   ├── database/
│   │   ├── supabase-client.ts    # Browser client (createClient)
│   │   ├── supabase-server.ts    # Server client with cookie auth (createServerSupabaseClient)
│   │   ├── supabase-admin.ts     # Admin/service-role client (getAdminClient) — bypasses RLS
│   │   └── index.ts
│   ├── errors/
│   │   ├── error-codes.ts        # Structured error codes
│   │   ├── app-error.ts          # AppError class with code, statusCode, severity, context
│   │   └── index.ts              # AuthErrors, TenantErrors, BookingErrors, etc. factories
│   ├── logging/
│   │   └── logger.ts             # Structured JSON logger (debug/info/warn/error)
│   ├── audit/
│   │   └── index.ts              # audit() — fire-and-forget audit log insertion
│   ├── rate-limit/
│   │   └── index.ts              # In-memory sliding-window: publicFormLimiter, authLimiter, apiLimiter
│   ├── payment-provider/         # Stripe PaymentProvider abstraction
│   ├── domain-provider/          # Vercel domain verification (VercelDomainProvider, MockDomainProvider)
│   └── notification-provider/    # Email/SMS provider abstraction (LogEmailProvider for dev)
│
├── permissions/
│   └── roles.ts                  # PERMISSIONS object, ROLE_PERMISSIONS matrix, role helpers
│
├── types/
│   └── database.ts               # TypeScript interfaces for all 30+ tables
│
├── validators/                   # Zod schemas for every entity (see Section 9)
│
├── services/                     # Business logic services (see Section 8)
│
├── middleware.ts                  # Hostname classification, auth refresh, route protection, PIN gate
└── scripts/
    ├── all-migrations.sql        # Combined database migration file (2490 lines, 12 migrations)
    ├── setup-supabase.sh         # Migration runner
    ├── seed-demo.ts              # Demo data seeder
    └── create-admin-user.ts      # Platform admin creation script
```

---

## 4. Environment & Configuration

### Environment Variables

All variables are validated at startup via Zod (`src/config/env.ts`). Missing or invalid values cause a clear error with guidance.

#### Server-Side Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key (used by browser + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server only, bypasses RLS) |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | ✅ | Platform domain (e.g., `driveflow.com.au`) |
| `NEXT_PUBLIC_PLATFORM_NAME` | ✅ | Platform display name |
| `NEXT_PUBLIC_APP_URL` | ✅ | Application URL |
| `NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN` | No | Admin subdomain (default: `admin`) |
| `PLATFORM_ADMIN_PIN` | No | Secondary PIN for admin panel access (min 4 chars) |
| `DEV_TENANT_SLUG` | No | Force tenant slug on localhost for development |
| `NODE_ENV` | No | `development` / `production` / `test` |
| `STRIPE_SECRET_KEY` | No | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `RESEND_API_KEY` | No | Email provider (falls back to log provider) |

### Three Supabase Clients

| Client | Created By | Purpose | RLS |
|--------|-----------|---------|-----|
| **Browser Client** | `createClient()` | Client components, browser auth | ✅ Enforced |
| **Server Client** | `createServerSupabaseClient()` | Server Components / Actions, cookie-based auth | ✅ Enforced |
| **Admin Client** | `getAdminClient()` | Service-role operations, public pages, notifications | ❌ Bypassed |

> **CRITICAL:** The admin client uses `SUPABASE_SERVICE_ROLE_KEY`. Never expose it to the client. It is a singleton (created once, reused). All admin client inserts require `as any` cast because the untyped client causes TypeScript to infer `never[]`.

---

## 5. Multi-Tenant Architecture

### How Tenants Are Resolved

Every request goes through `middleware.ts`, which classifies the hostname:

```
Request → middleware.ts → classifyHostname() → Set x-hostname-type header
```

#### Hostname Types

| Type | Example | Description |
|------|---------|-------------|
| `platform_admin` | `admin.driveflow.com.au` | Platform admin panel |
| `platform_website` | `driveflow.com.au` | Platform marketing site |
| `tenant` | `sydney-driving.driveflow.com.au` | Tenant subdomain |
| `custom_domain` | `www.sydneydriving.com` | Custom domain (looked up in `organization_domains`) |
| `localhost` | `localhost:3000` | Development |
| `preview` | `*.vercel.app` | Vercel preview deployments |

#### Vercel Deployment Override

On Vercel (`.vercel.app`), wildcard subdomains aren't available. The `?tenant=slug` query parameter overrides tenant resolution:

```
https://driving-school-system-psi.vercel.app/?tenant=elite-road-academy
```

The middleware persists this in a `x-tenant-slug` cookie (30-day expiry) so internal navigation keeps the tenant context without repeating the query parameter.

#### Tenant Resolution Flow

```
1. middleware.ts reads hostname
2. classifyHostname(hostname, platformDomain, adminSubdomain)
3. If ?tenant= param exists → set x-tenant-override header + cookie
4. In page/layout:
   a. getTenantData() / getTenantPageData() — for public pages (admin client, no auth)
   b. getDashboardContext() — for dashboard pages
   c. getPortalContext() — for student portal pages
   d. getPlatformAdminContext() — for admin pages
5. resolveHostname() or resolveTenantBySlug() queries organization_domains table
6. Returns { organizationId, organizationSlug, organizationName, hostname, timezone, currency }
```

### Data Isolation

Every tenant-scoped table has an `organization_id` column. RLS policies enforce:
- Users can only read/write rows where `organization_id` matches their membership
- The `organization_id` is **never trusted from the browser** — always set server-side from the auth context

---

## 6. Authentication & Authorization

### Authentication (Supabase Auth)

- **Cookie-based sessions** using `@supabase/ssr`
- Middleware refreshes sessions on every request via `supabase.auth.getUser()`
- Auth cookies: `sb-xxx-auth-token` (may be chunked into `.0`, `.1`, etc.)
- Protected routes (`/admin`, `/dashboard`, `/portal`) redirect to `/auth/sign-in` if no auth cookie
- **Rate limiting**: `authLimiter` (10 requests per 15 minutes)

### User Creation

Users are created via `adminClient.auth.admin.createUser()` with `email_confirm: true` (auto-confirms email, avoids sending email). This is used when school owners add students or instructors — the **try-create-first** pattern:

```typescript
// 1. Try to create the user
const { data, error } = await adminClient.auth.admin.createUser({ email, email_confirm: true });
if (error) {
  // 2. User probably exists — look them up
  const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
  const existing = listData?.users?.find(u => u.email === email);
}
```

### Authorization Flow

```
1. Authenticate user → Supabase Auth (getUser())
2. Resolve organization → hostname/slug lookup
3. Load memberships → organization_members table
4. authorizeForOrganization() → find active membership matching org
5. requirePermission(auth, PERMISSIONS.XXX) → check role → permission matrix
6. requireRole(auth, USER_ROLES.SCHOOL_OWNER) → check role hierarchy
```

### Context Helpers

| Function | Used By | Returns |
|----------|---------|---------|
| `getDashboardContext()` | Dashboard pages | `{ auth, organization, settings }` |
| `getPortalContext()` | Portal pages | `{ auth, organization, settings, student }` |
| `getPlatformAdminContext()` | Admin pages | `{ userId, email, role }` |
| `getTenantData()` | Public pages | `{ organization, settings }` (no auth needed) |
| `getTenantPageData()` | Home page | `{ organization, settings, lessonTypes, instructors, reviews, heroSlides, ... }` |

### Role Hierarchy (Most → Least Privileged)

1. **`platform_owner`** — Full platform access, all permissions
2. **`platform_support`** — Full platform access (support staff)
3. **`school_owner`** — Full access to their organization
4. **`school_admin`** — Like owner but cannot manage domains/members/billing
5. **`instructor`** — View org, manage own schedule, view students, manage bookings
6. **`student`** — View own data, book lessons, leave reviews

### Permission Matrix (42 Permissions)

Permissions are defined in `src/permissions/roles.ts`:

| Category | Permissions |
|----------|-------------|
| **Organization** | `org:view`, `org:edit`, `org:manage_members`, `org:manage_settings`, `org:manage_domains`, `org:manage_branding`, `org:view_audit_logs` |
| **Instructor** | `instructor:view`, `instructor:create`, `instructor:edit`, `instructor:delete`, `instructor:view_own_schedule`, `instructor:manage_own_availability` |
| **Student** | `student:view`, `student:create`, `student:edit`, `student:delete`, `student:view_own_profile`, `student:edit_own_profile` |
| **Booking** | `booking:view`, `booking:create`, `booking:edit`, `booking:cancel`, `booking:view_own`, `booking:create_own`, `booking:cancel_own` |
| **Availability** | `availability:view`, `availability:manage` |
| **Vehicle** | `vehicle:view`, `vehicle:manage` |
| **Location** | `location:view`, `location:manage` |
| **Lesson Type** | `lesson_type:view`, `lesson_type:manage` |
| **Package** | `package:view`, `package:manage` |
| **Review** | `review:view`, `review:moderate`, `review:create_own` |
| **Success Story** | `success_story:view`, `success_story:manage` |
| **Payment** | `payment:view`, `payment:manage` |
| **Report** | `report:view` |
| **Notification** | `notification:manage` |

### Role → Permission Mapping

- **school_owner**: All permissions above
- **school_admin**: All except `org:edit`, `org:manage_members`, `org:manage_settings`, `org:manage_domains`, `org:manage_branding`, `instructor:delete`
- **instructor**: `org:view`, `instructor:view/view_own_schedule/manage_own_availability`, `student:view`, `booking:view/create/edit`, `availability:view`, `vehicle:view`, `location:view`, `lesson_type:view`, `package:view`, `review:view`, `success_story:view`
- **student**: `org:view`, `instructor:view`, `student:view_own_profile/edit_own_profile`, `booking:view_own/create_own/cancel_own`, `availability:view`, `location:view`, `lesson_type:view`, `package:view`, `review:view/create_own`, `success_story:view`

### Admin PIN Gate

The platform admin panel has a secondary PIN authentication layer:
1. `PLATFORM_ADMIN_PIN` env var sets the PIN
2. Middleware checks for `x-admin-pin-verified` cookie
3. If missing, redirects to `/admin/verify`
4. PIN cookie is HMAC-signed, 4-hour expiry
5. Locks after 5 failed attempts (15-minute lockout)

---

## 7. Database Schema

The database runs on **Supabase PostgreSQL** with Row-Level Security (RLS) on all tenant tables. Migrations are in `scripts/all-migrations.sql` (2490 lines, 12 migrations). Extensions used: `uuid-ossp`, `btree_gist`.

### Tables Overview

#### Core Tenant Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `organizations` | Driving schools | `id` UUID PK, `name`, `slug` UNIQUE, `status` (default 'trial'), `timezone` ('Australia/Sydney'), `currency` ('AUD'), `country` ('AU') |
| `organization_domains` | Domain mappings | `organization_id` FK, `hostname` (unique lower index), `domain_type`, `status` (default 'pending'), `is_primary`, `verification_token` |
| `organization_members` | User-org memberships | `organization_id` FK, `user_id` FK, `role` (default 'student'), `status` (default 'invited'), UNIQUE(org_id, user_id) |
| `profiles` | User profiles | `id` PK = auth.users(id), `email`, `full_name`, `phone`, `avatar_url` |
| `school_settings` | Per-school config | `organization_id` FK UNIQUE, branding (logo, colors), contact info, booking rules, `sections_enabled` JSONB, `draft_content` JSONB, `content_published_at` |

#### People & Resources

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `instructors` | Instructor records | `organization_id`, `user_id` UNIQUE(org,user), `display_name`, `license_number`, `transmission_type` (default 'automatic'), `max_daily_lessons` (default 8), `default_lesson_duration` (default 60) |
| `students` | Student records | `organization_id`, `user_id` UNIQUE(org,user), `display_name`, `pickup_address`, `preferred_transmission`, `preferred_instructor_id` FK, `emergency_contact_name/phone` |
| `vehicles` | Vehicle fleet | `organization_id`, `name`, `make`, `model`, `registration`, `transmission`, `status` (active/maintenance/retired), `assigned_instructor_id` FK |
| `locations` | School locations | `organization_id`, `name`, `address`, `suburb`, `state`, `postcode` |
| `service_areas` | Coverage areas | `organization_id`, `name`, `suburb`, `postcode`, `state` |
| `instructor_service_areas` | Instructor ↔ area mapping | `instructor_id`, `service_area_id`, `travel_buffer_minutes` (default 15), UNIQUE(instructor, area) |

#### Scheduling

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `lesson_types` | Lesson offerings | `organization_id`, `name`, `duration_minutes` (default 60), `price_cents`, `transmission`, `status`, `is_public`, `sort_order` |
| `lesson_packages` | Multi-lesson bundles | `organization_id`, `lesson_type_id` FK, `lesson_count`, `price_cents`, `savings_cents`, `validity_days` |
| `availability_rules` | Weekly recurring schedule | `instructor_id`, `day_of_week`, `start_time` TIME, `end_time` TIME, `is_active`, UNIQUE(org, instructor, day), CHECK(end > start) |
| `availability_exceptions` | Date-specific overrides | `instructor_id`, `exception_date` DATE, `is_available`, `start_time`, `end_time`, UNIQUE(org, instructor, date), CHECK constraint for time consistency |
| `blocked_times` | Blocked-off periods | `instructor_id`, `start_datetime` TIMESTAMPTZ, `end_datetime`, `reason` enum, `is_all_day`, CHECK(end > start) |
| `bookings` | Lesson bookings | `instructor_id`, `student_id`, `lesson_type_id`, `vehicle_id`, `start_datetime`, `end_datetime`, `status` (default 'pending'), `price_cents`, `created_by`, EXCLUSION constraint prevents instructor double-booking |
| `booking_status_history` | Status change log | `booking_id` FK, `previous_status`, `new_status`, `changed_by`, `reason` |

#### Student Features

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `driving_skills` | Skill definitions | `organization_id`, `name` UNIQUE(org, name), `category`, `sort_order` |
| `student_progress` | Skill assessments | `student_id`, `skill_id`, `level` (not_started → confident), `assessed_by` FK, UNIQUE(student, skill) |
| `student_package_purchases` | Package purchases | `student_id`, `lesson_package_id`, `lessons_total`, `lessons_used`, `price_paid_cents`, `status`, `expires_at`, CHECK(used ≤ total) |
| `waitlist_entries` | Waitlist queue | `student_id`, `preferred_days[]`, `preferred_time_start/end`, `preferred_instructor_id`, `status`, `priority` |

#### Reviews & Stories

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `reviews` | Student/public reviews | `reviewer_name`, `rating` (1-5 CHECK), `title`, `body`, `status` (pending/approved/rejected/featured), `moderated_by`, `moderated_at`, `is_anonymous` |
| `success_stories` | Pass stories | `student_name`, `test_location`, `pass_date`, `message`, `status` (draft/published/archived), `consent_given`, `consent_method` CHECK, `sort_order` |

#### Payments & Billing

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `payments` | Payment records | `student_id`, `booking_id`, `payment_type`, `status`, `amount_cents` CHECK(>0), `stripe_payment_intent_id` (unique where not null), `amount_refunded_cents` CHECK(≤ amount) |
| `refunds` | Refund records | `payment_id` FK, `amount_cents` CHECK(>0), `status`, `stripe_refund_id` |
| `plans` | Subscription plans | `name`, `slug` UNIQUE, `price_monthly_cents`, `price_yearly_cents`, limits (max_instructors/students/etc.), feature flags, `trial_days` (default 14) |
| `subscriptions` | Active subscriptions | `organization_id` FK UNIQUE, `plan_id` FK, `status` (default 'trialing'), `billing_interval`, `trial_start/end`, `stripe_subscription_id` |
| `subscription_usage` | Usage tracking | `organization_id`, `subscription_id`, `period_start/end`, counts, UNIQUE(org, period_start) |
| `webhook_events` | Stripe webhook events | `provider` ('stripe'), `event_id` (unique index), `event_type`, `status`, `payload` JSONB, `attempts`, `max_attempts` (3) |

#### Notifications

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `notifications` | Sent notifications | `notification_type` enum, `channel` (email/sms), `recipient_email/phone/user_id`, `subject`, `body`, `status` (default 'queued'), `booking_id`, `attempts` (default 0), `max_attempts` (3) |
| `notification_templates` | Message templates | `notification_type`, `channel`, `subject`, `body`, `is_active`, UNIQUE(org, type, channel) |
| `notification_preferences` | User opt-in/out | `user_id`, `notification_type`, `channel`, `is_enabled`, UNIQUE(org, user, type, channel) |

#### Platform & System

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `media_assets` | Uploaded files | `storage_path`, `public_url`, `mime_type`, `file_size_bytes`, `folder`, `tags[]` |
| `hero_slides` | Homepage slider | `image_url`, `storage_path`, `title`, `subtitle`, `link_url`, `sort_order`, `is_active` |
| `custom_themes` | Brand theming | `organization_id` UNIQUE, colors, fonts, `custom_css` CHECK(≤10240 chars), `header_style`, `footer_style`, `hero_style`, `corner_radius` |
| `audit_logs` | Activity log | `user_id`, `action`, `resource_type`, `resource_id`, `details` JSONB, `ip_address` |
| `feature_flags` | Feature toggles | `name` UNIQUE, `is_enabled`, `allowed_organizations[]` UUID array |

### Key Database Constraints

- **Booking overlap prevention:** `EXCLUSION CONSTRAINT excl_instructor_overlap USING gist` prevents double-booking an instructor
- **`booking_is_active(status)`:** Helper function returns true when status NOT IN ('cancelled', 'rescheduled'); used by the exclusion constraint
- **Status transitions:** Validated in application code (`booking-service.ts`), not DB constraints
- **Soft deletes:** Members use `status = 'removed'`, not row deletion

### Database Helper Functions (SECURITY DEFINER)

- `update_updated_at_column()` / `update_updated_at()` — sets `NEW.updated_at = NOW()`
- `is_org_member(org_id, user_id)` — checks active membership
- `is_org_admin(org_id, user_id)` — checks active membership with admin+ role
- `is_org_owner(org_id, user_id)` — checks active membership with owner+ role
- `handle_new_user()` — auto-creates a profiles row on `auth.users` INSERT
- `booking_is_active(status)` — returns true when status NOT IN cancelled/rescheduled

### RLS Summary

Every table has RLS enabled. Key patterns:
- **Public read**: `organization_domains` (hostname lookup), `plans`, `feature_flags`
- **Member read**: Most tables — requires active membership in the organization
- **Admin write**: Most tables — requires admin role (school_owner, school_admin, platform_*)
- **Owner only**: Domain management, member management
- **Self-service**: `profiles` (own), `notification_preferences` (own), `notifications` (own via recipient_user_id)

### Seed Data

Three default plans inserted: **Starter** ($49/mo), **Growth** ($99/mo), **Pro** ($199/mo) with increasing limits and features.

---

## 8. Service Layer

All business logic lives in `src/services/`. Services receive a Supabase client and an `AuthorizedContext` — they never create their own clients. Every service scopes queries by `organization_id` from the auth context.

### Pattern

```typescript
export async function createEntity(
  client: SupabaseClient,
  context: AuthorizedContext,
  input: CreateEntityInput
): Promise<Entity> {
  const { data, error } = await client
    .from('entities')
    .insert({ ...input, organization_id: context.organizationId })  // ← trusted org_id LAST
    .select()
    .single();
  // ...
}
```

> **CRITICAL:** Spread order is `{ ...input, organization_id }` — trusted values go LAST to prevent client-side override.

### Service Files

| Service | Tables | Key Operations |
|---------|--------|----------------|
| `booking-service.ts` | `bookings`, `booking_status_history` | CRUD, status transitions (TOCTOU-safe with `.eq('status', current)`), reschedule, cancel; catches PostgreSQL exclusion constraint `23P01` |
| `booking-notifications.ts` | `notifications` (via notification-service) | Fire-and-forget: `notifyBookingConfirmed`, `notifyBookingCancelled`, `notifyLessonCompleted`, `notifyBookingChanged`, `notifyInstructorReassigned`, `notifyStudentWelcome`, `notifyPublicBookingReceived` |
| `availability-engine.ts` | (pure logic, no DB) | `computeAvailableSlots()` — compute from rules/exceptions/blocked/bookings with travel buffer |
| `availability-rule-service.ts` | `availability_rules` | Weekly schedule CRUD + `setWeeklySchedule()` (bulk replace) |
| `availability-exception-service.ts` | `availability_exceptions` | Date override CRUD with date range filtering |
| `blocked-time-service.ts` | `blocked_times` | Blocked periods CRUD with date range filtering |
| `instructor-service.ts` | `instructors` | CRUD, creates membership for instructor's user_id |
| `student-service.ts` | `students` | CRUD, creates membership for student's user_id |
| `student-progress-service.ts` | `driving_skills`, `student_progress` | Skill CRUD, progress upsert |
| `vehicle-service.ts` | `vehicles` | Fleet CRUD |
| `lesson-type-service.ts` | `lesson_types` | CRUD + `getPublicLessonTypes()` (no auth, public=true, active) |
| `lesson-package-service.ts` | `lesson_packages` | CRUD + `getPublicLessonPackages()` |
| `organization-service.ts` | `organizations` | Get/create/update org |
| `membership-service.ts` | `organization_members` | Add/remove/update members, reactivate removed, prevent removing last owner |
| `location-service.ts` | `locations` | Location CRUD (hard delete) |
| `domain-service.ts` | `organization_domains`, `domain_events` | Domain management, DNS verification, primary domain, provider integration |
| `service-area-service.ts` | `service_areas`, `instructor_service_areas` | Area CRUD + instructor-area assignment |
| `school-settings-service.ts` | `school_settings` | Settings CRUD, **draft/publish workflow** (saveDraft → publishDraft → discardDraft), auto-create defaults |
| `review-service.ts` | `reviews` | CRUD + `getPublicReviews()` + `moderateReview()` (approve/reject/feature with moderated_by/at) |
| `success-story-service.ts` | `success_stories` | CRUD + `getPublicSuccessStories()` (published + consent_given) |
| `payment-service.ts` | `payments`, `refunds` | Payment recording, mark succeeded/failed (webhook-driven), refund with amount validation |
| `notification-service.ts` | `notifications`, `notification_templates`, `notification_preferences` | Full pipeline: preferences → template → render `{{variables}}` → record → send → update status |
| `subscription-service.ts` | `subscriptions`, `plans` | Lifecycle (create with trial → activate → cancel/suspend/reactivate), plan change, usage refresh |
| `entitlement-service.ts` | `subscriptions`, `plans` | Check plan limits (`checkUsageLimit`), feature flags (`isFeatureEnabled`), throw on exceeded |
| `waitlist-service.ts` | `waitlist_entries` | CRUD, `findMatchingWaitlistEntries()` (matches by day/instructor/type/area/time), `expireWaitlistEntries()` |
| `reports-service.ts` | Multiple tables | Revenue report, instructor performance, booking analytics (by day/type/peak hours) |
| `media-library-service.ts` | `media_assets`, Supabase Storage | Upload (5MB max, image types), folder management, tag management; rollback storage on DB failure |
| `hero-slide-service.ts` | `hero_slides`, Supabase Storage | Slide CRUD, reorder, upload images |
| `custom-theme-service.ts` | `custom_themes` | Theme upsert, `themeToCSS()` generates CSS custom properties |
| `webhook-service.ts` | `webhook_events` | Idempotent recording (unique provider+event_id), retry logic (max 3 attempts) |
| `platform-admin-service.ts` | All tables | Cross-tenant: org creation (reserved slugs, owner account, settings, audit), status updates, domain health, feature flag toggle, system health, platform stats (12 parallel count queries) |

---

## 9. Validators

All validators use Zod schemas in `src/validators/`. Each file exports the schema and inferred TypeScript type.

| File | Schemas | Key Validations |
|------|---------|-----------------|
| `auth.ts` | signIn, signUp, forgotPassword, resetPassword | Password: min 8, uppercase + lowercase + number required |
| `organization.ts` | create, update | slug: 3-63 chars, lowercase + numbers + hyphens |
| `membership.ts` | addMember, updateRole, remove | Assignable roles only (not platform roles) |
| `instructor.ts` | create, update | display_name 2-100; max_daily_lessons 1-20; duration 30-180 |
| `student.ts` | create, update | display_name 2-100; notes max 5000 |
| `vehicle.ts` | create, update | make/model required; year 1990-2100 |
| `booking.ts` | create, update, cancel, transitionStatus | end > start validated |
| `lesson-type.ts` | create, update | duration 15-240 (default 60); price_cents ≥ 0 |
| `lesson-package.ts` | create, update | lesson_count 1-100; validity_days 1-365 |
| `availability-rule.ts` | create, update, setWeeklySchedule | HH:MM time format; end > start |
| `availability-exception.ts` | create, update | YYYY-MM-DD; conditional: available=true requires times, false forbids |
| `blocked-time.ts` | create, update | ISO datetimes; end > start; reason enum |
| `review.ts` | create, moderate | rating 1-5; body 10-2000 chars; moderation status enum |
| `success-story.ts` | create, update | consent_given + consent_method required together |
| `payment.ts` | create, createRefund, updateStatus | — |
| `notification.ts` | upsertTemplate, send, updatePreference | Channel-appropriate recipient validation |
| `school-settings.ts` | update | hex color validation; meta_title max 70; min_booking_notice 0-168 |
| `subscription.ts` | create, changePlan, suspend, updateBilling | — |
| `waitlist.ts` | create, updateCustomTheme | HH:MM times must be paired; custom CSS max 10KB |
| `location.ts` | create, update | name 2-100; country 2 chars |
| `domain.ts` | addDomain, setPrimary, remove, platformSubdomain | hostname 3-253 chars, regex-validated |
| `service-area.ts` | create, update, assignInstructorArea | travel_buffer_minutes 0-120 |

---

## 10. Public Tenant Website (`(tenant)` Routes)

The public website is what visitors and potential students see. **No authentication required.** Uses `getAdminClient()` (bypasses RLS since visitors are unauthenticated).

### Layout

- **Sticky Header**: School logo/name, desktop nav links filtered by `sections_enabled` array, phone number, "Book Now" CTA button in brand primary color
- **Mobile Header**: Hamburger → `<MobileMenu>` slide-in panel (272px, semi-transparent backdrop with blur)
- **Footer**: 4-column grid — About, Quick Links, Contact Info, Social Links (Facebook, Instagram, TikTok, Google Reviews)
- **Mobile Bottom CTA Bar**: "Email Us", circular "Call" button, "Book Now"
- Brand colors injected as CSS custom properties (`--brand-primary`, `--brand-secondary`)

### Route: `/` — Home Page

Full landing page with sections controlled by `sections_enabled` setting:
- **Hero Slider** (`<HeroSlider>`) — auto-sliding (5s), gradient overlay, title/subtitle, CTA link, arrow nav, dot indicators; pauses on hover
- **Value Propositions** — 4 items: Qualified Instructors, Flexible Scheduling, Patient Teaching, High Pass Rates
- **Why Choose Us** — About text + 6 feature cards
- **Success Stories** — Grid of `<SuccessStoryCard>` components
- **Lessons** — Grid of `<LessonTypeCard>` — name, description, price, duration, transmission badge, "Book This Lesson" link
- **Packages** — Grid of `<PackageCard>` — name, lesson count, price, savings, "Most Popular" badge on 2nd package
- **Instructors** — Grid of `<InstructorCard>` — photo/avatar initial, name, bio (2-line clamp), transmission badge
- **Testimonials** — Average rating + `<TestimonialCarousel>` (3 cards at a time on desktop, 1 on mobile)
- **Service Areas** — Grid with name, suburb, postcode, state badges
- **FAQ** — `<FAQAccordion>` with 6 hardcoded driving-lesson questions (single-open accordion)
- **Final CTA** — "Ready to Start Your Driving Journey?" with "Book Your First Lesson" button

### Route: `/lessons` — Lesson Types

Grid of lesson cards. Each: name, description (3-line clamp), price (from cents), duration, transmission badge, "Book This Lesson" link.

### Route: `/packages` — Lesson Packages

Grid of package cards. Each: name, description, price, lesson count, savings badge, validity in days.

### Route: `/instructors` — Instructor Profiles

Grid of instructor cards. Each: photo/avatar initial, name, bio (3-line clamp), transmission badge, duration badge.

### Route: `/areas` — Service Areas

Grid of area cards. Each: area name, suburb, postcode, state badges.

### Route: `/book` — Online Booking

**4-step wizard** (`<BookingWidget>` client component):
1. **Choose Lesson Type** — selectable cards with name, price, duration, transmission
2. **Choose Instructor** — filtered by transmission compatibility, "No preference" option
3. **Choose Date & Time** — date picker (today to 60 days out), calls `getAvailableSlotsAction()` for available time slots
4. **Your Details** — name (required), email (required), phone, pickup address, notes + booking summary sidebar

Submits via `submitBookingRequestAction` → creates booking with status `new_request`.

### Route: `/reviews` — Reviews

- **Average rating** with star visualization and review count
- **Featured reviews section** (status = `featured`)
- **All approved reviews** grid
- **ReviewCard**: star rating, title, body (in quotes), reviewer avatar initial, date
- **"Write a Review" form** (`<PublicReviewForm>`): star rating selector with hover, reviewer name, title (optional), body. Submits as `pending` via `submitPublicReviewAction` + sends notification to school owner.

### Route: `/success-stories` — Success Stories

Grid of published stories with consent given. Each: photo/trophy icon, student name, "PASSED" badge, pass date, test location, message (3-line clamp).

### Route: `/contact` — Contact

Contact info cards (phone, email, address), business hours, social links, "Book Online" CTA.

---

## 11. School Dashboard (`(dashboard)` Routes)

School management interface. **Requires authentication + organization membership.** Every page calls `getDashboardContext()`.

### Layout

- **Desktop**: Fixed 64px wide sidebar with school initial avatar, nav icon links, user section with "View site" link and `<SignOutButton>`
- **Mobile**: Top header bar + bottom navigation bar (first 5 visible nav items)
- Nav items filtered by role via `getVisibleNav(role)` using `isAtLeastRole()` and `isOrgAdminRole()`

### Route: `/dashboard` — Overview

- **Today's Stats**: 4 cards — Lessons Today, Instructors Working, Expected Revenue, Total Students
- **Setup Checklist** (admin only): 6-step onboarding — Set Up Branding, Add Instructors, Create Lesson Types, Set Availability, Add First Student, Set Up Custom Domain
- **Quick Actions** (admin only): Today Mode, Add Booking, Add Student, Block Time, View Calendar
- **Upcoming Lessons**: Next 5 bookings as `BookingCard` components

### Route: `/dashboard/today` — Today's Schedule

**Permission**: `BOOKING_VIEW`. Instructor role sees only own lessons, admin sees all.
- Quick Stats: Remaining, Completed, Revenue
- **Next Lesson** card: student name, phone (tel: link), pickup address (Google Maps link), lesson type, notes + action buttons (Call, Directions, Start Lesson, Complete, Add Notes)
- Later Today list, Completed list

### Route: `/dashboard/calendar` — Calendar

- Day/Week toggle, prev/next/today navigation, instructor filter pills
- Status legend (7 color-coded statuses)
- Day view: vertical booking card list; Week view: 7-column grid

### Route: `/dashboard/bookings` — Booking Management

**Permission**: `BOOKING_VIEW`
- Filters: status dropdown, instructor dropdown (admin), date range, "Filter" button
- Create Booking modal (admin): dropdowns for instructor, student, lesson type, vehicle + date/time
- Booking cards with status badge, `<BookingActions>` for status transitions

**Status Transitions**: `new_request → contacted → confirmed → completed/no_show`, or `→ rejected/cancelled` from any non-terminal state.

### Route: `/dashboard/students` — Student Management

**Permission**: `STUDENT_VIEW`
- Search, Add Student form (creates Auth user + student record + membership)
- Student cards → link to detail page

### Route: `/dashboard/students/[id]` — Student Detail

**Permission**: `STUDENT_VIEW`
- Header: avatar, name, email, phone, transmission, pickup address, badges
- Stats: Completed lessons, Upcoming, Total Bookings, Total Spent
- **Progress Tracking**: `<ProgressEditor>` — skills grouped by category, selectable level (5 levels), notes, assessment date
- **Recent Bookings**: Up to 20 bookings with status badges

### Route: `/dashboard/instructors/[id]` — Instructor Detail

**Permission**: `INSTRUCTOR_VIEW`
- Header: photo/avatar, name, email, phone, transmission, duration, license
- Stats: Completed, Unique Students, Revenue, Average Rating, Reliability %
- Upcoming Schedule (next 7 days grouped by date), Recent Reviews, Recent Completed Lessons table

### Route: `/dashboard/availability` — Availability Management

**Permission**: `AVAILABILITY_MANAGE`
- Instructor selector dropdown
- **Weekly Schedule**: 7-day grid with add/delete rules
- **Exceptions**: Date-specific overrides with add/delete
- **Blocked Times**: Blocked periods with reason codes, add/delete

### Route: `/dashboard/reviews` — Review Moderation

**Permission**: `REVIEW_MODERATE`
- Status filter pills (All, Pending, Approved, Featured, Rejected)
- Review cards: reviewer, stars, status badge, title, body, dates
- `<ReviewActions>`: Approve / Feature / Reject buttons with moderation notes

### Route: `/dashboard/settings` — School Settings

**Role**: `SCHOOL_OWNER` required
- `<SettingsEditor>`: Branding (colors, logo), Contact, Booking config, SEO, Social links
- Draft/publish content workflow

### Route: `/dashboard/billing` — Billing & Subscription

**Role**: `SCHOOL_OWNER` required
- **Current Plan**: name, price, billing interval, status badge, period dates
- Trial notice, Suspension notice
- **Usage**: Progress bars (blue < 80%, yellow ≥ 80%, red at limit) for instructors, students, locations, vehicles, bookings
- **Features**: Checkmarks for plan features
- **Available Plans**: 3-column comparison grid

### Route: `/dashboard/reports` — Reports

**Permission**: `REPORT_VIEW`
- Revenue: summary cards + by lesson type + by month
- Instructor Performance: bookings, completion rate, revenue, rating, no-shows
- Booking Analytics: summary + by day of week (bar chart) + by lesson type

### Other Dashboard Routes

- `/dashboard/vehicles` — Vehicle fleet CRUD (name, make/model/year, registration, transmission, status, assigned instructor)
- `/dashboard/lesson-types` — Lesson type CRUD table
- `/dashboard/packages` — Package CRUD cards
- `/dashboard/success-stories` — `<SuccessStoryManager>` with consent tracking
- `/dashboard/payments` — Payment tracking with `<RecordPaymentForm>`, status filters, summary cards
- `/dashboard/notifications` — Notification log with status filters + `/templates` for editing `{{variable}}` templates
- `/dashboard/waitlist` — Summary cards, status filters, student waitlist table
- `/dashboard/media` — `<MediaLibraryClient>` with folder filtering, search
- `/dashboard/hero-slides` — `<SlideManager>` for hero carousel management

---

## 12. Student Portal (`(portal)` Routes)

Student self-service. **Requires authentication + student role.** Feature-flag gated behind `student_portal`. Every page calls `getPortalContext()` (returns `{ auth, organization, settings, student }`). If user has no student record, redirects to `/dashboard`.

### Layout

- Branded header with org name, student name, "Website →" link
- Mobile: bottom nav (Home, Bookings, Progress, Packages, Payments, Reviews, Profile)
- Desktop: fixed 48px left sidebar

### Route: `/portal` — Home

- Welcome message, Stats (Lessons Done, Upcoming, Package Balance)
- Quick Actions: Book a Lesson, View Progress, Leave a Review, My Profile
- Upcoming Lessons list

### Route: `/portal/bookings` — My Bookings

- Tabs: Upcoming, Past, All
- Booking cards with status badges, `<CancelBookingButton>` on upcoming

### Route: `/portal/progress` — Skill Progress

- Overall progress bar (% at "competent" or above)
- Level legend (5 color-coded levels)
- Skills grouped by category, each with level badge, progress bar, assessment date

### Route: `/portal/packages` — My Packages

- Active packages with remaining lessons display, progress bar, expiry
- Past packages (expired/completed)

### Route: `/portal/payments` — Payment History

- Total Spent summary, unified timeline (lessons + packages merged by date)

### Route: `/portal/reviews` — My Reviews

Three states: Already Submitted (shows status), No Completed Lessons, or Eligible (review form with instructor dropdown, stars, title, body, anonymous toggle)

### Route: `/portal/profile` — My Profile

- Read-only sections (Personal, Pickup, Driving, Emergency Contact)
- `<ProfileEditForm>` for editing phone, address, suburb, transmission, emergency contact

---

## 13. Platform Admin Panel (`(admin)` Routes)

Cross-tenant administration. **Requires `platform_owner` or `platform_support` role + admin PIN.** Uses `getAdminClient()` for cross-org queries.

### Layout

- Sidebar: "DriveFlow Admin" branding, nav (Overview, Organizations, Domains, Subscriptions, Health, Feature Flags, Audit Logs)
- User info with email, role badge, `<SignOutButton>`, `<LockAdminButton>`

### Route: `/admin` — Admin Dashboard

- Key Metrics: Total/Active/Trial/Suspended schools
- Usage: Students, Instructors, Bookings, Bookings This Month
- Subscriptions: Active, Trialing, Past Due
- System Health: 4 cards (Failed Webhooks, Failed Notifications, Pending Webhooks, Domains Need Attention) — green/red threshold indicators
- Recent Webhook Errors table

### Route: `/admin/verify` — PIN Verification

- Centered card with lock icon, masked PIN input (monospace, auto-focus)
- Clears + refocuses on failure, locks after 5 attempts (15-minute lockout)
- "Session expires after 4 hours of inactivity"

### Route: `/admin/organizations` — All Organizations

- Status filter pills, "Add School" button
- Table: Name (link), Slug, Status, Plan, Subscription Status, Created
- **AddSchoolForm**: School Name (auto-generates slug), Slug, Email, Phone, Owner Name, Owner Email

### Route: `/admin/organizations/[id]` — Organization Detail

- Header card with status badge + `<OrgStatusActions>` (Activate/Suspend/Cancel buttons)
- Usage stats (Students, Instructors, Bookings, Revenue)
- Subscription + Domains panels, Members table

### Route: `/admin/domains` — Domain Management

- Status filter pills, "Add Domain" button
- Table: Hostname, Organization, Type, DNS Status, SSL, Primary, Last Checked
- **AddDomainForm**: Organization dropdown, Domain Type, Hostname, Primary checkbox, DNS instructions

### Route: `/admin/subscriptions` — Subscriptions

- Status filter pills, Table: Org, Plan, Status, Billing, MRR, Period End

### Route: `/admin/health` — System Health

- Overall status banner, 5 health metric cards with green/red thresholds
- Recent Failed Webhooks table

### Route: `/admin/feature-flags` — Feature Flags

- Flag cards with name (monospace), Enabled/Disabled badge, description, scoped org count
- `<FeatureFlagToggle>` switch with optimistic UI update

### Route: `/admin/audit-logs` — Audit Logs

- Resource Type filter pills, Table: Timestamp, Action, Resource, User, Details (JSON)

---

## 14. Auth Pages (`auth/` Routes)

### `/auth/sign-in`

Client component with `useActionState`. Email + password fields, hidden `returnTo`. Contextual messages for `?message=password_updated` and `?message=confirmed`. Links: Forgot password, Create account.

### `/auth/sign-up`

Full name + email + password (min 8, uppercase+lowercase+number) + confirm. Success → "Check your email" message.

### `/auth/forgot-password`

Email input → sends reset link. Always shows success (prevents email enumeration).

### `/auth/reset-password`

New password + confirm with same validation. Token from URL. Redirects to sign-in on success.

### `/auth/error`

Maps `?code=` to user-friendly error messages: `EXCHANGE_FAILED`, `UNEXPECTED_ERROR`, `TENANT_RESOLUTION_FAILED`, `NOT_A_TENANT`, `ACCESS_DENIED`, `INSUFFICIENT_ROLE`, `INSUFFICIENT_PERMISSION`.

---

## 15. Booking Flow (End to End)

### Public Booking (via `/book` page)

```
1. Visitor opens /book on tenant website
2. getTenantData() resolves organization
3. Load lesson types + instructors via admin client
4. BookingWidget 4-step wizard:
   Step 1: Select lesson type
   Step 2: Select instructor (filtered by transmission compatibility)
   Step 3: Select date → getAvailableSlotsAction() computes slots:
     a. Load availability_rules for that day_of_week
     b. Check availability_exceptions for that specific date
     c. Load blocked_times overlapping that date
     d. Load existing bookings for that date
     e. Subtract blocked + booked (with travel buffer) from available → open slots
   Step 4: Enter details (name, email, phone, pickup address, notes)
5. submitBookingRequestAction creates booking (status: 'new_request')
6. Fire-and-forget notification to school owner
7. Visitor sees confirmation
```

### Dashboard Booking Management

```
1. School owner sees new_request in /dashboard/bookings
2. Reviews → transitions to 'contacted' or 'confirmed'
3. On confirm: notification sent to student
4. On lesson day: marks 'completed' or 'no_show'
5. Completed bookings trigger payment recording
```

### Valid Status Transitions

```
new_request → contacted, confirmed, rejected, cancelled
contacted   → confirmed, rejected, cancelled
confirmed   → completed, cancelled, no_show
completed   → (terminal)
cancelled   → (terminal)
rejected    → (terminal)
no_show     → (terminal)
```

**Race condition prevention:** `transitionBookingStatus()` adds `.eq('status', currentStatus)` to the update query — concurrent transitions don't corrupt state.

**Double-booking prevention:** PostgreSQL `EXCLUSION CONSTRAINT` with `tstzrange` overlap + `booking_is_active(status)`.

---

## 16. Review & Moderation Flow

```
1. PUBLIC SUBMISSION:
   Visitor fills form on /reviews
   → submitPublicReviewAction()
   → getTenantData() → getAdminClient()
   → Insert review (status: 'pending')
   → Fire-and-forget: notifyNewReview()
     → Look up school owner via organization_members
     → Insert notification (type: 'custom', channel: 'email')

2. MODERATION:
   School owner → /dashboard/reviews → Pending queue
   → Approve/Reject/Feature button
   → reviewService.moderateReview()
   → Updates status + moderated_by + moderated_at + moderation_notes

3. PUBLIC DISPLAY:
   /reviews queries WHERE status IN ('approved', 'featured')
   → Featured reviews in special section
   → Approved reviews in main grid
   → Average rating computed and displayed with stars
```

---

## 17. Notification System

### Architecture

```
Event occurs → Service creates notification (fire-and-forget)
  → Check notification preferences (opt-out check)
  → Load template (DB custom or DEFAULT_TEMPLATES fallback)
  → Render {{variables}} via template engine
  → Insert into notifications table (status: 'queued')
  → Send via provider (LogEmailProvider in dev, Resend TODO)
  → Update status: sent/delivered/failed
```

### Notification Types

| Type | Trigger | Channel |
|------|---------|---------|
| `booking_confirmed` | Booking confirmed | email |
| `booking_reminder` | Scheduled reminder | email/sms |
| `booking_changed` | Booking rescheduled | email |
| `booking_cancelled` | Booking cancelled | email |
| `payment_receipt` | Payment succeeded | email |
| `payment_failed` | Payment failed | email |
| `instructor_reassigned` | Instructor changed | email |
| `review_request` | After lesson completion | email |
| `test_congratulations` | Student passed test | email |
| `welcome` | New student added | email |
| `custom` | Manual / system events | email |

### Fire-and-Forget Pattern

```typescript
// In server action — must use admin client for async operations
const adminClient = getAdminClient();
void notifyBookingConfirmed(adminClient, booking);

// The request-scoped client may be GC'd before async completes
```

### Template Variables

Templates use `{{variable}}` syntax, rendered by `renderTemplate()`. Missing variables become empty string. Variables: `{{student_name}}`, `{{instructor_name}}`, `{{booking_date}}`, `{{booking_time}}`, `{{lesson_type}}`, `{{school_name}}`, etc.

---

## 18. Payment System

### Payment Types

| Type | Description |
|------|-------------|
| `booking_full` | Full payment for a single booking |
| `booking_deposit` | Deposit/partial payment for a booking |
| `package_purchase` | Payment for a lesson package |
| `outstanding_balance` | Catch-up payment |

### Payment Status Flow

```
pending → processing → succeeded → refunded / partially_refunded
                     → failed
                     → cancelled
```

### Stripe Integration

- **PaymentProvider** abstract interface with `StripePaymentProvider` implementation
- `createPaymentIntent()`, `getPaymentIntentStatus()`, `createRefund()`, `verifyWebhookEvent()`, `getOrCreateCustomer()`
- Webhook events: idempotent via unique `(provider, event_id)` index, max 3 retry attempts
- Refund validation: checks total refunded ≤ original amount

---

## 19. Subscription & Billing

### Plan Structure

Each plan defines:
- Monthly and yearly pricing (`price_monthly_cents`, `price_yearly_cents`)
- Resource limits: `max_instructors`, `max_students`, `max_locations`, `max_vehicles`, `max_bookings_per_month` (NULL = unlimited)
- Feature flags: `custom_domain_enabled`, `sms_enabled`, `student_progress_enabled`, `advanced_reports_enabled`, `waitlist_enabled`, `custom_branding_enabled`, `api_access_enabled`
- Trial period: `trial_days` (default 14)

### Entitlement Service

Translates subscription plan into runtime checks:
- `checkUsageLimit(client, orgId, 'instructors')` → `{ allowed, limit, current }`
- `isFeatureEnabled(client, orgId, 'customDomain')` → `boolean`
- `requireFeature()` / `requireUsageLimit()` → throws `SUBSCRIPTION_001` if exceeded

### Subscription Lifecycle

```
create (trialing) → activate (active) → cancel/suspend
                                       → reactivate
suspend → reactivates org too
cancel → sets cancelled_at
```

### Billing Page UI

- Usage bars: blue (<80%), yellow (≥80%), red (at limit)
- 3-column plan comparison grid
- Feature checkmarks (✓/✗)

---

## 20. Availability Engine

**File**: `src/services/availability-engine.ts` — **pure-logic module** with no database calls. All data passed in, fully testable.

### Algorithm

```
1. Determine day_of_week from date
2. Get base availability from rules for that day
3. Check for exceptions on that date:
   a. is_available=false → no slots for that day
   b. is_available=true with custom times → use those instead
4. Compute available windows from base/exception times
5. Subtract blocked_times that overlap with the date
6. Subtract existing bookings (with travel buffer) that overlap
7. Split remaining windows into slots of slotDuration (30-min aligned)
8. Return list of { start, end } ISO datetime strings
```

### Helper Functions

- `timeToMinutes(time)` — "HH:MM:SS" to minutes since midnight
- `minutesToTime(minutes)` — minutes to "HH:MM"
- `dateToDayOfWeek(dateStr)` — "YYYY-MM-DD" to day enum
- `subtractIntervals(available, blocked)` — interval arithmetic

---

## 21. Media Library

### Storage Architecture

- Uses **Supabase Storage** bucket `school-assets`
- Max file size: 5MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`
- `media_assets` table tracks metadata (storage_path, public_url, mime_type, file_size_bytes, width, height, folder, tags[])
- **Rollback on failure**: if DB insert fails after storage upload, the storage file is deleted

### Usage

- Hero slide images
- Instructor profile photos
- School logo/favicon
- Success story photos

---

## 22. Deployment

### Vercel Configuration

- **Platform**: Vercel Hobby plan
- **Region**: `syd1` (Sydney)
- **Framework**: Next.js 16 (auto-detected)
- **Build Command**: `npm run build`
- **Output**: `.next` (standalone when `DOCKER_BUILD=1`)

### Environment Variables on Vercel

Set as **Config** type (not Secret) for `NEXT_PUBLIC_*` variables. Secret type for `SUPABASE_SERVICE_ROLE_KEY`, `PLATFORM_ADMIN_PIN`, `STRIPE_SECRET_KEY`.

### Tenant Testing on Vercel

Since `.vercel.app` doesn't support wildcard subdomains, use `?tenant=slug`:
```
https://driving-school-system-psi.vercel.app/?tenant=elite-road-academy
```

The cookie persists the tenant, so subsequent navigation works without the query parameter.

---

## Appendix A: Server Action Pattern

Every server action follows this pattern:

```typescript
'use server';

export async function myAction(
  _prev: ActionState,      // Previous state (for useActionState)
  formData: FormData       // Form data from the client
): Promise<ActionState> {
  try {
    // 1. Auth + authorization
    const { auth } = await getDashboardContext();
    requirePermission(auth, PERMISSIONS.XXX);

    // 2. Get database client
    const client = await createServerSupabaseClient();

    // 3. Parse + validate input
    const input = mySchema.parse({ field: formData.get('field') });

    // 4. Call service (organization_id from auth context, never from client)
    const result = await myService(client, auth, input);

    // 5. Audit log (fire-and-forget)
    audit(client, auth, { action: 'entity.created', resourceType: 'entity', resourceId: result.id });

    // 6. Optional notification (fire-and-forget, must use admin client)
    void notifyAboutEvent(getAdminClient(), result);

    // 7. Revalidate cache
    revalidatePath('/dashboard/entities');

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}
```

## Appendix B: Key Architectural Decisions

1. **Cookie-based auth** (not JWT in headers) — enables SSR and Server Components
2. **Admin client singleton** — service role key, bypasses RLS, used for public pages and fire-and-forget ops
3. **Hostname-based tenancy** — primary resolution, with `?tenant=` fallback for Vercel
4. **Spread order `{ ...input, organization_id }`** — prevents client-side org_id override
5. **`createUser` over `inviteUserByEmail`** — avoids email bounce issues on hobby plan
6. **Try-create-first pattern** — avoids `listUsers` pagination issues
7. **Fire-and-forget with admin client** — request-scoped client may be GC'd before async completes
8. **PostgREST filter syntax** — `.not('status', 'in', '(cancelled,rejected)')` without quotes around values
9. **Booking exclusion constraint** — database-level double-booking prevention via `btree_gist`
10. **Race condition guard** — `.eq('status', currentStatus)` on booking transitions (TOCTOU-safe)

---

*This document is a complete reference for recreating the DriveFlow platform. Every table, route, button, and data flow is documented above.*
