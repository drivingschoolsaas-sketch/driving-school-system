# DriveFlow — Full Architecture Document

## 1. Overview

**DriveFlow** is a multi-tenant SaaS platform for driving schools. Each school operates on its own independent domain (or platform subdomain) with fully isolated data. The platform enables driving schools to manage students, instructors, bookings, availability, payments, and public-facing websites — all from a single codebase.

### Key Characteristics

- **Multi-tenant**: One deployment serves all schools; data is isolated per `organization_id`
- **Hostname-based routing**: Tenant is resolved from the incoming request's `Host` header
- **Row-Level Security (RLS)**: PostgreSQL RLS policies enforce data isolation at the database level
- **Role-based access control (RBAC)**: 6 roles with granular permissions
- **3 separate portals**: Platform Admin, School Dashboard, Student Portal
- **Public tenant websites**: Each school gets a customizable marketing site

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth (cookie-based sessions via `@supabase/ssr`) |
| **ORM/Client** | Supabase JS Client (service role + anon key) |
| **Styling** | Tailwind CSS |
| **Validation** | Zod |
| **Testing** | Vitest + Testing Library |
| **Payments** | Stripe (webhooks) |
| **Deployment** | Vercel-ready (Vercel domain provider integration) |

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         INCOMING REQUEST                            │
│                    (Host: school.driveflow.com.au)                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS MIDDLEWARE                           │
│  1. Classify hostname (platform_admin / tenant / localhost)         │
│  2. Set x-hostname-type, x-normalized-hostname headers             │
│  3. Refresh Supabase auth session (cookie-based)                   │
│  4. Protect /admin, /dashboard, /portal routes                     │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                     ┌──────────┼──────────┐
                     │          │          │
                     ▼          ▼          ▼
              ┌──────────┐ ┌────────┐ ┌────────────┐
              │ Platform │ │ Tenant │ │  Student   │
              │  Admin   │ │ Dash   │ │  Portal    │
              │ /admin/* │ │/dashb/*│ │ /portal/*  │
              └──────────┘ └────────┘ └────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      AUTHORIZATION LAYER                            │
│  getPlatformAdminContext() / getDashboardContext() /                 │
│  getPortalContext()                                                 │
│  → Resolve hostname → Authenticate user → Authorize for org        │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                │
│  Business logic (28 service modules)                                │
│  All queries scoped by organization_id                              │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + RLS)                       │
│  12 migrations · 30+ tables · Row-Level Security on all tenant data │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Folder Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── (admin)/                # Platform admin route group
│   │   ├── layout.tsx          # Admin sidebar layout
│   │   └── admin/
│   │       ├── page.tsx        # Overview dashboard
│   │       ├── actions.ts      # Server actions (create org, add domain)
│   │       ├── organizations/  # Schools list + Add School form
│   │       ├── domains/        # Domain health + Add Domain form
│   │       ├── subscriptions/  # Subscription management
│   │       ├── health/         # System health monitoring
│   │       ├── feature-flags/  # Feature flag toggles
│   │       └── audit-logs/     # Audit log viewer
│   │
│   ├── (dashboard)/            # Tenant dashboard route group
│   │   ├── layout.tsx          # Dashboard sidebar layout (role-filtered nav)
│   │   ├── components/         # Shared components (SignOutButton)
│   │   └── dashboard/
│   │       ├── page.tsx        # Dashboard overview
│   │       ├── actions.ts      # Server actions (CRUD for content)
│   │       ├── bookings/       # Booking management
│   │       ├── students/       # Student management
│   │       ├── instructors/    # Instructor management
│   │       ├── calendar/       # Calendar view
│   │       ├── availability/   # Availability rules
│   │       ├── lesson-types/   # Lesson type management
│   │       ├── packages/       # Package management
│   │       ├── vehicles/       # Vehicle fleet
│   │       ├── reviews/        # Review moderation
│   │       ├── success-stories/# Success story CRUD
│   │       ├── payments/       # Payment tracking
│   │       ├── notifications/  # Notification center
│   │       ├── billing/        # Subscription billing
│   │       ├── waitlist/       # Waitlist management
│   │       ├── reports/        # Analytics & reports
│   │       └── settings/       # School settings editor
│   │
│   ├── (portal)/               # Student portal route group
│   │   ├── layout.tsx          # Portal layout
│   │   └── portal/
│   │       ├── page.tsx        # Student dashboard
│   │       ├── bookings/       # My bookings
│   │       ├── progress/       # Skill progress tracker
│   │       ├── packages/       # My packages
│   │       ├── payments/       # Payment history
│   │       └── profile/        # Profile editor
│   │
│   ├── (tenant)/               # Public tenant website route group
│   │   ├── layout.tsx          # Public site layout (header + footer)
│   │   ├── page.tsx            # Homepage (hero, features, testimonials)
│   │   ├── components/         # Public components (carousel, FAQ, menu)
│   │   ├── lessons/            # Lesson types listing
│   │   ├── packages/           # Package deals with savings
│   │   ├── instructors/        # Meet the team
│   │   ├── areas/              # Service areas
│   │   ├── reviews/            # Public reviews
│   │   ├── success-stories/    # Graduate stories
│   │   ├── book/               # Online booking page
│   │   └── contact/            # Contact page
│   │
│   ├── auth/                   # Authentication pages
│   │   ├── sign-in/            # Login form
│   │   ├── sign-up/            # Registration form
│   │   ├── forgot-password/    # Password reset request
│   │   ├── reset-password/     # Password reset form
│   │   ├── callback/           # OAuth callback handler (route.ts)
│   │   └── error/              # Auth error page
│   │
│   ├── api/                    # API routes
│   │   ├── health/             # Health check endpoint
│   │   └── webhooks/stripe/    # Stripe webhook handler
│   │
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles (Tailwind)
│
├── config/
│   ├── env.ts                  # Zod-validated environment variables
│   └── constants.ts            # Enums, role definitions, app constants
│
├── lib/
│   ├── auth/
│   │   ├── authorization.ts           # authorizeForOrganization(), requirePermission()
│   │   ├── auth-actions.ts            # signIn, signUp, signOut server actions
│   │   ├── get-dashboard-context.ts   # Tenant dashboard auth helper
│   │   ├── get-platform-admin-context.ts  # Platform admin auth helper
│   │   ├── get-portal-context.ts      # Student portal auth helper
│   │   ├── session.ts                 # Session utilities
│   │   ├── protect-route.ts           # Route protection helper
│   │   ├── redirect-url.ts            # Safe redirect URL validation
│   │   └── index.ts
│   │
│   ├── database/
│   │   ├── supabase-client.ts  # Browser client (anon key)
│   │   ├── supabase-server.ts  # Server client (anon key + cookies)
│   │   ├── supabase-admin.ts   # Admin client (service role, bypasses RLS)
│   │   └── index.ts
│   │
│   ├── tenant/
│   │   ├── domain-normalizer.ts    # normalizeHostname(), classifyHostname()
│   │   ├── resolve-hostname.ts     # resolveHostname() — the single entry point
│   │   ├── tenant-context.ts       # TenantContext, ResolvedContext types
│   │   ├── get-tenant-data.ts      # Public site data loader
│   │   └── index.ts
│   │
│   ├── domain-provider/
│   │   ├── types.ts            # DomainProvider interface
│   │   ├── vercel-provider.ts  # Vercel Domains API integration
│   │   ├── mock-provider.ts    # Mock provider for testing
│   │   └── index.ts
│   │
│   ├── errors/
│   │   ├── app-error.ts        # AppError class (code, severity, context)
│   │   ├── error-codes.ts      # Error factories (AuthErrors, TenantErrors, etc.)
│   │   └── index.ts
│   │
│   └── logging/
│       ├── logger.ts           # Structured logger with feature/operation tags
│       └── index.ts
│
├── permissions/
│   ├── roles.ts                # RBAC: permissions matrix, role hierarchy
│   └── index.ts
│
├── validators/                 # Zod schemas (23 modules)
│   ├── organization.ts         ├── booking.ts
│   ├── membership.ts           ├── review.ts
│   ├── auth.ts                 ├── success-story.ts
│   ├── instructor.ts           ├── payment.ts
│   ├── student.ts              ├── notification.ts
│   ├── vehicle.ts              ├── subscription.ts
│   ├── service-area.ts         ├── waitlist.ts
│   ├── lesson-type.ts          ├── location.ts
│   ├── lesson-package.ts       ├── domain.ts
│   ├── school-settings.ts      ├── availability-rule.ts
│   ├── availability-exception.ts
│   ├── blocked-time.ts
│   └── index.ts
│
├── services/                   # Business logic (28 modules)
│   ├── platform-admin-service.ts   # Platform stats, org CRUD, domain mgmt
│   ├── organization-service.ts     # Organization CRUD
│   ├── membership-service.ts       # Member invites, role changes
│   ├── domain-service.ts           # Domain verification, DNS management
│   ├── instructor-service.ts       # Instructor profiles
│   ├── student-service.ts          # Student records
│   ├── vehicle-service.ts          # Vehicle fleet
│   ├── service-area-service.ts     # Coverage areas
│   ├── lesson-type-service.ts      # Lesson type catalog
│   ├── lesson-package-service.ts   # Package bundles
│   ├── school-settings-service.ts  # Branding, booking config
│   ├── availability-rule-service.ts      # Weekly schedules
│   ├── availability-exception-service.ts # Date overrides
│   ├── blocked-time-service.ts     # Time blocks (breaks, holidays)
│   ├── availability-engine.ts      # Slot computation engine
│   ├── booking-service.ts          # Booking lifecycle
│   ├── review-service.ts           # Review submission + moderation
│   ├── success-story-service.ts    # Graduate stories
│   ├── payment-service.ts          # Payment processing
│   ├── webhook-service.ts          # Stripe webhook processing
│   ├── notification-service.ts     # Email/SMS notifications
│   ├── entitlement-service.ts      # Plan entitlement checks
│   ├── subscription-service.ts     # Subscription lifecycle
│   ├── waitlist-service.ts         # Waitlist queue management
│   ├── reports-service.ts          # Analytics & reporting
│   ├── custom-theme-service.ts     # Custom branding themes
│   └── index.ts
│
├── types/
│   ├── database.ts             # TypeScript types mirroring all 30+ tables
│   └── index.ts
│
└── tests/
    ├── setup.ts                # Vitest setup
    ├── helpers.ts              # Test utilities
    ├── tenant-isolation.test.ts    # Cross-tenant isolation tests
    └── auth-cross-domain.test.ts   # Cross-domain auth tests

scripts/                        # Operational scripts
├── create-admin-user.ts        # Create school owner + auth user
├── create-platform-admin.ts    # Assign platform_owner role
├── create-school-owner.ts      # Create school owner
├── create-tenant-user.ts       # Create instructor user
├── make-platform-admin.ts      # Promote user to platform admin
├── reset-password.ts           # Reset user password
├── seed-full-school.ts         # Seed complete school data
├── seed-availability-bookings.ts # Seed availability + bookings
├── test-all-logins.ts          # Test all 3 login flows
└── run-seed.ts                 # Master seed runner

supabase/
└── migrations/                 # 12 migration files (see Section 7)
```

---

## 5. Multi-Tenancy Architecture

### 5.1 Hostname Resolution Flow

Every request goes through a centralized hostname resolution pipeline:

```
Raw Host Header
       │
       ▼
normalizeHostname()          # Lowercase, strip port, strip www
       │
       ▼
classifyHostname()           # Determine type:
       │                     #   - "localhost"         → dev fallback
       │                     #   - "platform_admin"    → admin.driveflow.com.au
       │                     #   - "platform_website"  → driveflow.com.au
       │                     #   - "preview"           → *.vercel.app
       │                     #   - "tenant"            → anything else
       │
       ▼
resolveHostname()            # For tenants:
       │                     #   1. Query organization_domains by hostname
       │                     #   2. Check domain status = 'verified'
       │                     #   3. Load organization
       │                     #   4. Check org status = 'active' | 'trial'
       │                     #   5. Return TenantContext
       ▼
TenantContext {
  organizationId, organizationName, organizationSlug,
  organizationStatus, hostname, timezone, currency
}
```

### 5.2 Domain Types

| Type | Example | Description |
|------|---------|-------------|
| `platform_subdomain` | `myschool.driveflow.com.au` | Auto-provisioned subdomain on the platform domain |
| `custom_root` | `myschool.com.au` | School's own root domain |
| `custom_subdomain` | `booking.myschool.com.au` | Subdomain on school's own domain |

### 5.3 Domain Lifecycle

```
Created (by platform admin)
    │
    ▼
  pending → verifying → verified ✓
                │              │
                ▼              ▼
             failed       Active & serving traffic
                │
                ▼
            suspended
```

Platform admin–assigned domains skip to `verified` immediately since the admin is trusted.

### 5.4 Data Isolation

Every tenant-owned table includes an `organization_id` column:

- **Application Layer**: All service functions receive `organization_id` from the resolved tenant context — never from user input
- **Database Layer**: PostgreSQL RLS policies enforce isolation; authenticated users can only access rows where `organization_id` matches their active membership
- **Admin Client**: The service-role client (`getAdminClient()`) bypasses RLS for:
  - Hostname resolution (unauthenticated visitors need it)
  - Platform admin cross-org queries
  - Public tenant page data loading (no auth required)

---

## 6. Authentication & Authorization

### 6.1 Auth Flow

```
Browser Request
       │
       ▼
Middleware (src/middleware.ts)
  • Refreshes Supabase session cookie
  • Checks for sb-*-auth-token cookie
  • Redirects unauthenticated users from /admin, /dashboard, /portal
       │
       ▼
Server Component (page.tsx)
  • Calls getDashboardContext() / getPlatformAdminContext() / getPortalContext()
  • These helpers:
    1. Get authenticated user via Supabase Auth (getUser())
    2. Resolve tenant from hostname (using admin client)
    3. Fetch user's org memberships (using server client)
    4. Authorize via authorizeForOrganization()
  • Returns AuthorizedContext { userId, organizationId, role, membership }
       │
       ▼
Service Layer
  • requirePermission(context, PERMISSIONS.BOOKING_CREATE)
  • requireRole(context, USER_ROLES.SCHOOL_ADMIN)
```

### 6.2 Three Supabase Clients

| Client | File | Key | RLS | Use Case |
|--------|------|-----|-----|----------|
| **Browser** | `supabase-client.ts` | Anon | ✅ Active | Client components (rare) |
| **Server** | `supabase-server.ts` | Anon + Cookies | ✅ Active | Authenticated server queries |
| **Admin** | `supabase-admin.ts` | Service Role | ❌ Bypassed | Platform admin, hostname resolution, public pages |

### 6.3 Role Hierarchy

```
platform_owner          ← Full platform access (all orgs)
  └── platform_support  ← Platform support (all orgs, read-heavy)
       └── school_owner      ← Full org access (single org)
            └── school_admin      ← Org admin (no domains/members mgmt)
                 └── instructor        ← Own schedule, view students
                      └── student           ← Own profile, book, review
```

### 6.4 Permission Matrix (Key Permissions)

| Permission | Owner | Admin | Instructor | Student |
|-----------|-------|-------|------------|---------|
| `org:manage_members` | ✅ | ❌ | ❌ | ❌ |
| `org:manage_domains` | ✅ | ❌ | ❌ | ❌ |
| `org:manage_settings` | ✅ | ❌ | ❌ | ❌ |
| `instructor:create` | ✅ | ✅ | ❌ | ❌ |
| `booking:create` | ✅ | ✅ | ✅ | ❌ |
| `booking:create_own` | ❌ | ❌ | ❌ | ✅ |
| `availability:manage` | ✅ | ✅ | ❌ | ❌ |
| `instructor:manage_own_availability` | ❌ | ❌ | ✅ | ❌ |
| `review:moderate` | ✅ | ✅ | ❌ | ❌ |
| `review:create_own` | ❌ | ❌ | ❌ | ✅ |
| `payment:manage` | ✅ | ✅ | ❌ | ❌ |
| `report:view` | ✅ | ✅ | ❌ | ❌ |

Full matrix: 35 permissions across 6 roles. See `src/permissions/roles.ts`.

---

## 7. Database Schema

### 7.1 Migrations (12 phases)

| # | Migration | Tables Created |
|---|-----------|----------------|
| 1 | `foundation` | `organizations`, `organization_domains`, `organization_members`, `profiles` |
| 2 | `multi_tenancy_rls` | RLS policies for all Phase 1 tables |
| 3 | `driving_school_core` | `instructors`, `students`, `vehicles`, `service_areas`, `instructor_service_areas`, `lesson_types`, `lesson_packages`, `school_settings`, `locations` |
| 4 | `availability` | `availability_rules`, `availability_exceptions`, `blocked_times` |
| 5 | `bookings` | `bookings`, `booking_status_history` |
| 6 | `student_portal` | `driving_skills`, `student_progress`, `student_package_purchases` |
| 7 | `reviews_success_stories` | `reviews`, `success_stories` |
| 8 | `payments` | `payments`, `refunds` |
| 9 | `notifications` | `notification_templates`, `notifications`, `notification_preferences` |
| 10 | `subscriptions` | `plans`, `subscriptions`, `subscription_usage` |
| 11 | `audit_logs` | `audit_logs` |
| 12 | `advanced_features` | `feature_flags`, `webhook_events`, `waitlist_entries`, `custom_themes` |

### 7.2 Core Enums

```sql
organization_status: 'active' | 'trial' | 'suspended' | 'cancelled'
domain_type:         'platform_subdomain' | 'custom_root' | 'custom_subdomain'
domain_status:       'pending' | 'verifying' | 'verified' | 'failed' | 'suspended'
user_role:           'platform_owner' | 'platform_support' | 'school_owner' |
                     'school_admin' | 'instructor' | 'student'
membership_status:   'active' | 'invited' | 'suspended' | 'removed'
booking_status:      'pending' | 'confirmed' | 'in_progress' | 'completed' |
                     'cancelled' | 'no_show' | 'rescheduled'
payment_status:      'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
subscription_status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'suspended'
```

### 7.3 Entity Relationships

```
organizations (1) ──── (N) organization_domains
organizations (1) ──── (N) organization_members ──── (1) profiles
organizations (1) ──── (1) school_settings
organizations (1) ──── (N) locations

organizations (1) ──── (N) instructors
organizations (1) ──── (N) students
organizations (1) ──── (N) vehicles
organizations (1) ──── (N) service_areas
organizations (1) ──── (N) lesson_types
organizations (1) ──── (N) lesson_packages ──── (1) lesson_types

instructors (1) ──── (N) availability_rules
instructors (1) ──── (N) availability_exceptions
instructors (1) ──── (N) blocked_times
instructors (1) ──── (N) bookings

students (1) ──── (N) bookings
students (1) ──── (N) student_progress ──── (1) driving_skills
students (1) ──── (N) student_package_purchases ──── (1) lesson_packages
students (1) ──── (N) reviews

bookings (1) ──── (N) booking_status_history
bookings (1) ──── (N) payments ──── (N) refunds

organizations (1) ──── (N) subscriptions ──── (1) plans
organizations (1) ──── (N) notifications
organizations (1) ──── (N) notification_templates
organizations (1) ──── (N) audit_logs
organizations (1) ──── (1) custom_themes
organizations (1) ──── (N) waitlist_entries
```

### 7.4 Key Database Types

| Type | Fields | Description |
|------|--------|-------------|
| `Organization` | name, slug, status, timezone, currency, country, phone, email | The school entity |
| `OrganizationDomain` | hostname, domain_type, status, is_primary, ssl_status | Domain routing |
| `OrganizationMember` | user_id, role, status | User↔Org binding |
| `Instructor` | display_name, license_number, transmission_type, max_daily_lessons | Teaching staff |
| `Student` | display_name, learner_permit_number, preferred_instructor_id | Learner record |
| `Booking` | instructor_id, student_id, lesson_type_id, start/end_datetime, status, price_cents | Lesson appointment |
| `SchoolSettings` | logo_url, primary_color, hero_title, min_booking_notice_hours, sections_enabled | Site customization |
| `Plan` | max_instructors, max_students, custom_domain_enabled, price_monthly_cents | Subscription tier |

---

## 8. Application Portals

### 8.1 Platform Admin (`/admin/*`)

The super-admin dashboard for managing the entire SaaS platform.

| Page | Description |
|------|-------------|
| **Overview** | Platform stats (total orgs, students, bookings, subscriptions) |
| **Organizations** | List/create schools, manage status (activate/suspend) |
| **Domains** | Domain health monitoring, add/assign domains to schools |
| **Subscriptions** | Subscription management across all schools |
| **System Health** | Failed webhooks, notifications, domain issues |
| **Feature Flags** | Toggle features globally or per-organization |
| **Audit Logs** | Platform-wide audit trail |

**Auth**: `getPlatformAdminContext()` → requires `platform_owner` or `platform_support` role.

### 8.2 School Dashboard (`/dashboard/*`)

The admin dashboard for individual driving school management.

| Page | Min Role | Description |
|------|----------|-------------|
| **Overview** | Any | School-specific stats |
| **Calendar** | Any | Visual booking calendar |
| **Bookings** | Any | Booking CRUD, status management |
| **Students** | Any | Student records, profiles |
| **Instructors** | Admin | Instructor management |
| **Availability** | Any | Instructor schedule rules |
| **Lesson Types** | Admin | Lesson catalog management |
| **Packages** | Admin | Bundle packages |
| **Vehicles** | Admin | Fleet management |
| **Reviews** | Admin | Review moderation |
| **Success Stories** | Admin | Graduate stories CRUD |
| **Waitlist** | Admin | Queue management |
| **Reports** | Admin | Analytics and reporting |
| **Payments** | Admin | Payment tracking |
| **Notifications** | Admin | Notification center |
| **Billing** | Owner | Subscription & billing |
| **Settings** | Owner | School branding, booking config |

**Auth**: `getDashboardContext()` → resolves tenant → requires active membership. Navigation is role-filtered.

### 8.3 Student Portal (`/portal/*`)

Self-service portal for driving students.

| Page | Description |
|------|-------------|
| **Dashboard** | Upcoming lessons, progress summary |
| **Bookings** | My bookings, book new lessons |
| **Progress** | Skill progress tracker (parking, lane changes, etc.) |
| **Packages** | My purchased packages |
| **Payments** | Payment history |
| **Profile** | Personal information editor |

**Auth**: `getPortalContext()` → same as dashboard + loads `Student` record.

### 8.4 Public Tenant Website (`/` — tenant root)

Each school's public-facing marketing site. **No authentication required** — uses admin client to bypass RLS.

| Page | Description |
|------|-------------|
| **Homepage** | Hero banner, features grid, testimonials, FAQ accordion |
| **Lessons** | Lesson types with prices and durations |
| **Packages** | Package deals with savings calculations |
| **Instructors** | Meet the team with bios and photos |
| **Areas** | Service area coverage |
| **Reviews** | Public approved reviews with ratings |
| **Success Stories** | Graduate pass stories with photos |
| **Book** | Online booking page |
| **Contact** | Contact form and info |

Fully customizable via `school_settings` (colors, text, hero content, enabled sections).

---

## 9. Key Design Patterns

### 9.1 Server Actions Pattern

All mutations use Next.js Server Actions with `'use server'`:

```typescript
'use server';

export async function createBookingAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. Authenticate & authorize
  const { auth, organization } = await getDashboardContext();
  requirePermission(auth, PERMISSIONS.BOOKING_CREATE);

  // 2. Validate input (Zod)
  const parsed = createBookingSchema.safeParse({ ... });
  if (!parsed.success) return { success: false, error: parsed.error.message };

  // 3. Call service (business logic)
  const booking = await bookingService.create(client, {
    ...parsed.data,
    organizationId: auth.organizationId,  // NEVER from user input
  });

  // 4. Revalidate cache
  revalidatePath('/dashboard/bookings');
  return { success: true };
}
```

### 9.2 Validator → Service → Database Flow

```
User Input (FormData / JSON)
    │
    ▼
Zod Schema (validators/)       # Shape validation, type coercion
    │
    ▼
Service Function (services/)   # Business rules, authorization checks
    │                          # organization_id injected server-side
    ▼
Supabase Client                # Database query (RLS-protected or admin)
    │
    ▼
Database (PostgreSQL + RLS)    # Final enforcement layer
```

### 9.3 Error Handling

Structured errors via `AppError` class with typed error codes:

```typescript
throw new AppError({
  code: 'BOOKING_001_CONFLICT',
  message: 'Time slot already booked',
  statusCode: 409,
  severity: 'medium',
  context: { instructorId, startTime },
});
```

Error factories in `error-codes.ts`:
- `AuthErrors.unauthenticated()`, `.forbidden()`, `.invalidToken()`, `.sessionExpired()`
- `TenantErrors.accessDenied()`
- `DomainErrors.unknownHost()`, `.notVerified()`, `.organizationSuspended()`

### 9.4 Structured Logging

```typescript
logger.info('Booking created', {
  feature: 'bookings',
  operation: 'create_booking',
  organizationId,
  bookingId,
  instructorId,
});
```

All logs are tagged with `feature` and `operation` for filtering.

---

## 10. Availability & Booking Engine

The availability engine computes available time slots by combining:

```
Available Slots = Recurring Rules − Exceptions − Blocked Times − Existing Bookings
```

### Components

| Component | Table | Description |
|-----------|-------|-------------|
| **Availability Rules** | `availability_rules` | Weekly recurring schedules (e.g., Mon 8:00–17:00) |
| **Exceptions** | `availability_exceptions` | Date-specific overrides (e.g., off Dec 25) |
| **Blocked Times** | `blocked_times` | Ad-hoc blocks (breaks, meetings, holidays) |
| **Bookings** | `bookings` | Already-booked slots excluded |

The engine in `availability-engine.ts` computes free windows for a given instructor + date range, respecting lesson duration and travel buffer settings.

---

## 11. Payment & Subscription Architecture

### 11.1 Payment Flow

```
Student books lesson
       │
       ▼
Payment created (status: pending)
       │
       ▼
Stripe PaymentIntent created
       │
       ▼
Webhook: payment_intent.succeeded → POST /api/webhooks/stripe
       │
       ▼
webhook-service.ts processes event
       │
       ▼
Payment updated (status: succeeded)
Booking confirmed
Notification sent to student + instructor
```

### 11.2 Subscription Tiers (Plans)

Plans control feature access and resource limits:

| Limit | Description |
|-------|-------------|
| `max_instructors` | Maximum instructor accounts |
| `max_students` | Maximum student records |
| `max_vehicles` | Maximum vehicles in fleet |
| `max_bookings_per_month` | Monthly booking cap |
| `custom_domain_enabled` | Can use own domain |
| `sms_enabled` | SMS notification support |
| `student_progress_enabled` | Skill tracking feature |
| `advanced_reports_enabled` | Advanced analytics |
| `custom_branding_enabled` | Custom theme support |
| `api_access_enabled` | API access |

The `entitlement-service.ts` checks these limits before allowing resource creation.

---

## 12. Environment Configuration

All environment variables are validated at startup via Zod in `src/config/env.ts`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Platform
NEXT_PUBLIC_PLATFORM_DOMAIN=driveflow.com.au
NEXT_PUBLIC_PLATFORM_NAME=DriveFlow
NEXT_PUBLIC_PLATFORM_ADMIN_SUBDOMAIN=admin

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Missing or invalid variables cause a clear error at startup with the specific validation failure.

---

## 13. Security Rules

1. **Every tenant table uses `organization_id`** — data isolation is structural
2. **Never trust `organization_id` from the browser** — always derive from server-side tenant resolution
3. **Never disable RLS** to make features work
4. **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client**
5. **All hostname comparisons** go through `normalizeHostname()`
6. **Admin client** is only used in trusted server-side code after authorization
7. **Audit logging** on all admin operations (create org, add domain, status changes, feature flag toggles)
8. **Zod validation** on all input before any database operation
9. **CSRF protection** via Next.js Server Actions (form-bound, not callable via URL)
10. **Safe redirects** — `redirect-url.ts` validates return URLs to prevent open redirects

---

## 14. Testing Strategy

| Type | Location | Framework |
|------|----------|-----------|
| Unit tests | `src/**/__tests__/` | Vitest |
| Validator tests | `src/validators/__tests__/` | Vitest + Zod |
| Service tests | `src/services/__tests__/` | Vitest |
| Integration tests | `src/tests/` | Vitest |
| Tenant isolation | `src/tests/tenant-isolation.test.ts` | Vitest |
| Auth cross-domain | `src/tests/auth-cross-domain.test.ts` | Vitest |

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run typecheck     # TypeScript strict check
npm run lint          # ESLint
npm run build         # Production build
```

---

## 15. Deployment Architecture

```
                    ┌─────────────────────┐
                    │   DNS / Cloudflare   │
                    │  *.driveflow.com.au  │
                    │  custom-school.com   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Vercel         │
                    │   (Next.js Edge)     │
                    │  Middleware on every │
                    │  request             │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Supabase        │
                    │  PostgreSQL + Auth  │
                    │  + Storage          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Stripe        │
                    │  Payments + Subs    │
                    │  (via webhooks)     │
                    └─────────────────────┘
```

### Custom Domain Setup

1. Platform admin adds domain via `/admin/domains` → saved as `verified`
2. School owner configures DNS (CNAME → `driveflow.com.au` or A record to platform IP)
3. Vercel domain provider adds domain to project (via `vercel-provider.ts`)
4. SSL auto-provisioned by Vercel
5. Incoming requests → middleware → hostname resolution → school's tenant site

---

## 16. Local Development

```bash
npm install                              # Install dependencies
cp .env.example .env.local               # Configure environment
npx supabase start                       # Start local Supabase (Docker)
npx supabase db push                     # Run all 12 migrations
npx tsx scripts/run-seed.ts              # Seed school data
npx tsx scripts/create-platform-admin.ts # Create platform admin
npm run dev                              # Start dev server on :3000
```

**Localhost resolution**: `localhost:3000` automatically resolves to the first active organization via `resolveLocalhostDevFallback()`. No `/etc/hosts` editing required.

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | `tonmoy0024@gmail.com` | `MyPassword123` |
| School Owner | `schoolowner1@driveflow.test` | `SW123456` |
| Instructor | `instructor@driveflow.test` | `Instructor123` |

---

## 17. Implementation Status

All 16 phases are **complete**:

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation (orgs, domains, members) | ✅ Complete |
| 2 | Multi-Tenancy RLS | ✅ Complete |
| 3 | Domain System | ✅ Complete |
| 4 | Auth & Authorization | ✅ Complete |
| 5 | Driving School Core | ✅ Complete |
| 6 | Availability Engine | ✅ Complete |
| 7 | Bookings | ✅ Complete |
| 8 | Tenant Website | ✅ Complete |
| 9 | Admin Dashboard | ✅ Complete |
| 10 | Student Portal | ✅ Complete |
| 11 | Reviews & Success Stories | ✅ Complete |
| 12 | Payments | ✅ Complete |
| 13 | Notifications | ✅ Complete |
| 14 | SaaS Subscriptions | ✅ Complete |
| 15 | Platform Admin | ✅ Complete |
| 16 | Advanced Features | ✅ Complete |
