# DriveFlow — Claude Code Instructions

## Project

Multi-tenant SaaS platform for driving schools. Each school operates on its own domain with isolated data.

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm test             # Run tests (Vitest)
npm run test:watch   # Run tests in watch mode
```

## Architecture

- **Framework**: Next.js App Router + TypeScript (strict)
- **Database**: Supabase (PostgreSQL + RLS)
- **Styling**: Tailwind CSS
- **Testing**: Vitest + Testing Library
- **Validation**: Zod

## Key Rules

1. Every tenant-owned table uses `organization_id`
2. Never trust `organization_id` from the browser
3. Never disable RLS to make features work
4. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
5. All hostname comparisons go through `normalizeHostname()`
6. Business logic lives in services, not UI components
7. Errors use structured codes from `src/lib/errors/error-codes.ts`
8. Logging uses structured logger from `src/lib/logging/logger.ts`
9. Environment variables are validated via Zod at startup

## Folder Convention

- `src/lib/` — Core infrastructure (tenant, auth, database, errors, logging, domain-provider)
- `src/config/` — Environment validation and constants
- `src/types/` — TypeScript types mirroring database schema
- `src/permissions/` — Role and permission definitions
- `src/validators/` — Zod input validation schemas
- `src/services/` — Business logic services (org, membership, location, domain)
- `src/features/` — Feature modules (one folder per business domain)
- `src/tests/` — Cross-cutting integration tests (tenant isolation)
- `supabase/migrations/` — Database migrations (never modify dashboard manually)

## Authorization

All protected operations must go through:
1. `authorizeForOrganization()` — validates user has active membership in the resolved org
2. `requirePermission()` — checks specific permission for the user's role
3. `requireRole()` — checks minimum role level

See `src/permissions/roles.ts` for the full permission matrix and `src/lib/auth/authorization.ts` for the guards.

## Current Phase

Phase 16 — Advanced Features (complete). All 16 phases done.
