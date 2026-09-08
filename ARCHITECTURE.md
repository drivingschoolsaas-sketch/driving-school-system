# DriveFlow — Architecture

## Overview

DriveFlow is a multi-tenant SaaS platform for driving schools. Each school (tenant) operates on its own domain with its own branding, data, and administration — all powered by a shared codebase and infrastructure.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Row-Level Security | Supabase RLS |
| CSS | Tailwind CSS |
| Hosting | Vercel |
| Validation | Zod |
| Testing | Vitest + Testing Library |

## Folder Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (platform)/             # Platform admin & marketing routes
│   ├── (tenant)/               # Tenant-scoped routes
│   │   ├── (public)/           # Public website (/, /lessons, /book, etc.)
│   │   ├── admin/              # School admin dashboard
│   │   └── portal/             # Student portal
│   └── api/                    # API routes
├── components/                 # Shared UI components
├── features/                   # Feature modules (one folder per domain)
│   ├── organizations/
│   ├── domains/
│   ├── locations/
│   ├── authentication/
│   ├── permissions/
│   ├── instructors/
│   ├── students/
│   ├── vehicles/
│   ├── lesson-types/
│   ├── packages/
│   ├── availability/
│   ├── bookings/
│   ├── payments/
│   ├── reviews/
│   ├── success-stories/
│   ├── notifications/
│   ├── subscriptions/
│   ├── websites/
│   ├── branding/
│   └── audit/
├── services/                   # Business logic services
├── repositories/               # Data access layer
├── validators/                 # Zod schemas
├── permissions/                # Permission definitions
├── types/                      # TypeScript type definitions
├── hooks/                      # React hooks
├── lib/                        # Core infrastructure
│   ├── tenant/                 # Tenant resolution & context
│   ├── auth/                   # Authentication helpers
│   ├── database/               # Supabase clients
│   ├── errors/                 # Error system
│   ├── logging/                # Structured logging
│   └── domain-provider/        # Domain management abstraction
├── config/                     # Environment & constants
└── tests/                      # Test setup & utilities

supabase/
└── migrations/                 # Database migrations
```

## Request Flow

```
Internet
  → Custom domain / Platform subdomain
  → Vercel Edge
  → Next.js Middleware
    → normalizeHostname()
    → classifyHostname()
    → Set x-hostname-type header
  → Page / API Route
    → resolveHostname()  →  organization_domains table
    → Establish TenantContext
    → Authenticate user (Supabase Auth)
    → Validate organization membership
    → Check role & permissions
    → Execute business logic
    → Database queries scoped by organization_id
    → Supabase RLS enforces tenant isolation
```

## Key Principles

1. **Tenant Isolation**: Every tenant-owned record uses `organization_id`. RLS enforces isolation at the database level.
2. **Domain ≠ Identity**: Domains identify tenants; `organization_id` owns business data. Schools can change domains without data migration.
3. **Security in Depth**: Domain resolution → App authorization → Query scoping → RLS. No single layer is sufficient alone.
4. **Service Abstractions**: External services (Stripe, email, domain provider) use adapter interfaces. Business logic never calls vendor APIs directly.
5. **Feature-Based Organization**: Code is organized by business domain, not by technical layer.

## Implementation Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | ✅ Complete |
| 2 | Multi-Tenancy | Planned |
| 3 | Domain System | Planned |
| 4 | Auth & Authorization | Planned |
| 5 | Driving School Core | Planned |
| 6 | Availability | Planned |
| 7 | Bookings | Planned |
| 8 | Tenant Website | Planned |
| 9 | Admin Dashboard | Planned |
| 10 | Student Portal | Planned |
| 11 | Reviews & Success Stories | Planned |
| 12 | Payments | Planned |
| 13 | Notifications | Planned |
| 14 | SaaS Subscriptions | Planned |
| 15 | Platform Admin | Planned |
| 16 | Advanced Features | Planned |

## Environment Variables

See `.env.example` for the complete list. All variables are validated at startup via Zod schemas in `src/config/env.ts`.
