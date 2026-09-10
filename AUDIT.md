# DriveFlow — Phase 0 Audit Report

**Date:** 2026-09-10
**Baseline:** 35 test files, 504 tests passing, typecheck clean, build passes
**Spec reference:** `new.md` (66-section Master Architecture Audit)
**P0 Status:** ✅ ALL FIXED (migration 00013 + application code changes)
**P1 Status:** ✅ P1-1, P1-2, P1-3, P1-4, P1-5, P1-7, P1-8, P1-9, P1-10 FIXED
**P1 Deferred:** P1-6 (canonical admin URL) — major routing refactor, deferred post-MVP
**P2 Status:** ✅ P2-1, P2-2, P2-3, P2-5 FIXED
**P2 Deferred:** P2-4 (mobile-first UX) — large design task, deferred

---

## P0 — Security / Data Corruption (fix before any feature work)

### P0-1: SECURITY DEFINER functions lack `SET search_path`
**File:** `supabase/migrations/00002_multi_tenancy_rls.sql`
**Risk:** Search-path hijack. An attacker who can create objects in the public schema can shadow system functions called by `is_org_member()`, `is_org_admin()`, `is_org_owner()`.
**Spec ref:** Section 17
**Fix:** Add `SET search_path = ''` (or `= pg_catalog`) to every SECURITY DEFINER function.

### P0-2: No `server-only` imports on admin/service-role modules
**Files:** `src/lib/database/supabase-admin.ts`, `src/lib/auth/get-platform-admin-context.ts`, `src/lib/auth/get-dashboard-context.ts`
**Risk:** Service-role key could be bundled into client JS if a client component accidentally imports one of these.
**Spec ref:** Section 16
**Fix:** Add `import 'server-only'` as the first line in every module that touches `SUPABASE_SERVICE_ROLE_KEY` or server-only auth logic.

### P0-3: Hardcoded credentials in repository
**Files:** `ARCHITECTURE.md` (Section 16 — test accounts with passwords), `scripts/create-*.ts`
**Risk:** Credential exposure via git history / public repo.
**Spec ref:** Section 19
**Fix:** Remove all hardcoded passwords. Use environment variables or a seeding mechanism that generates random passwords.

### P0-4: Localhost dev fallback silently picks first active org
**File:** `src/lib/tenant/resolve-hostname.ts:65-71`
**Risk:** In development, every request resolves to an arbitrary tenant without the developer knowing which one. Masks tenant-isolation bugs.
**Spec ref:** Section 10
**Fix:** Remove the fallback. Require an explicit `NEXT_PUBLIC_DEV_TENANT_SLUG` env var, or require developers to use `schoolname.localhost:3000`.

### P0-5: Custom domains marked `verified` immediately on creation
**File:** `src/services/platform-admin-service.ts` → `addDomainToOrganization()`
**Risk:** Anyone with platform admin access can claim any domain without proving DNS ownership.
**Spec ref:** Section 12
**Fix:** Insert domains as `pending_verification`. Implement DNS TXT record verification flow (generate token, check `_driveflow-verify.{domain}` TXT record).

### P0-6: Public SELECT on `organization_domains` — `USING (true)`
**File:** `supabase/migrations/00002_multi_tenancy_rls.sql`
**Risk:** Any authenticated user (or anon if anon access is on) can enumerate all domains for all organizations.
**Fix:** Restrict to `is_org_member(organization_id, auth.uid())` or make it accessible only through a service-role lookup in the tenant resolver.

### P0-7: Cross-tenant foreign keys allow data leakage
**File:** `supabase/migrations/00005_bookings.sql:43-46`
**Risk:** `instructor_id REFERENCES instructors(id)` has no composite key with `organization_id`. A booking in Org A can reference an instructor belonging to Org B. Same for `student_id`, `vehicle_id`, `lesson_type_id`.
**Spec ref:** Section 18
**Fix:** Add composite unique constraints on `(id, organization_id)` to parent tables, then use composite FKs: `FOREIGN KEY (instructor_id, organization_id) REFERENCES instructors(id, organization_id)`.

---

## P1 — Functional / Architecture (fix during Phase 1)

### P1-1: Booking statuses don't match spec
**File:** `supabase/migrations/00005_bookings.sql:20-28`, `src/config/constants.ts`
**Current:** `pending, awaiting_payment, confirmed, completed, cancelled, no_show, rescheduled`
**Spec requires:** `new_request, contacted, confirmed, completed, cancelled, rejected, no_show`
**Spec ref:** Section 42
**Impact:** Booking-as-REQUEST model not implemented. `awaiting_payment` and `rescheduled` are non-MVP. Missing `contacted` and `rejected`.

### P1-2: `www.` blindly stripped in hostname normalization
**File:** `src/lib/tenant/domain-normalizer.ts:31-33`
**Spec ref:** Section 9
**Impact:** `www.example.com` and `example.com` should be treated as separate explicit domains. A school may register only one; stripping `www.` merges them silently.

### P1-3: No draft/preview/publish content workflow ✅ FIXED
**Files:** Success stories have `published` status but no full draft→preview→publish pipeline.
**Spec ref:** Section 44
**Impact:** School owners cannot preview their public website content before it goes live.
**Fix:** Migration 00015 adds `draft_content` JSONB + `content_published_at` to school_settings. Service layer: `saveDraftContent()`, `publishDraftContent()`, `discardDraft()`, `getPreviewSettings()`. Dashboard settings editor now saves content tabs (branding/SEO/social) as drafts with Publish/Discard workflow.

### P1-4: No media library / asset management ✅ FIXED
**Observation:** No Supabase Storage bucket management, no media library UI. Only raw `logo_url`/`image_url` string fields.
**Spec ref:** Section 45
**Impact:** Schools can't manage images for their public site.
**Fix:** Migration 00016 creates `media_assets` table with RLS. New `media-library-service.ts` with upload/list/update/delete. Dashboard `/dashboard/media` page with folder organization, alt-text editing, URL copy.

### P1-5: No invitation-based owner onboarding ✅ FIXED
**File:** `src/services/platform-admin-service.ts` → `createOrganization()`
**Current:** Creates Supabase Auth user directly with a password.
**Spec ref:** Section 11
**Impact:** No invite email, no password-set flow. Platform admin must communicate passwords out-of-band.
**Fix:** `createOrganization()` now uses `inviteUserByEmail()` instead of `createUser()` with password. Password field removed from add-school form. Existing users are added directly. Returns `inviteSent` flag.

### P1-6: School Admin runs on tenant domains instead of canonical URL
**Current:** Dashboard at `{tenant-domain}/dashboard`
**Spec ref:** Section 38
**Spec requires:** `app.driveflow.com.au/s/{slug}/dashboard` — single admin host, slug-based routing.
**Impact:** Cookie/auth complexity, DNS requirements for every school.

### P1-7: Student portal exists but is non-MVP ✅ FIXED
**Files:** `src/app/(portal)/`, `supabase/migrations/00006_student_portal.sql`
**Spec ref:** Section 3 (MVP scope)
**Impact:** Adds attack surface, code to maintain, and confusion about what's supported.
**Fix:** Portal layout gated behind `student_portal` feature flag via `isFeatureFlagEnabled()`. Redirects to `/` when disabled.

### P1-8: Stripe/payment code in place but non-MVP ✅ FIXED
**Files:** `src/services/payment-service.ts`, `src/services/webhook-service.ts`, `supabase/migrations/00008_payments.sql`
**Spec ref:** Section 3
**Impact:** Same as P1-7.
**Fix:** Dashboard payments page gated behind `payments` feature flag. Webhook route kept open (Stripe retries on non-200) but documented as non-MVP.

### P1-9: Booking INSERT RLS too permissive
**File:** `supabase/migrations/00005_bookings.sql:124-125`
**Current:** Any org member can INSERT bookings.
**Spec ref:** Section 42
**Impact:** Should be restricted to admin/instructor roles or use the booking-as-request model.

### P1-10: No feature entitlement enforcement in middleware/services
**File:** `src/services/entitlement-service.ts`
**Observation:** Entitlements are read-only lookups used in the billing page UI. No middleware or service guard actually blocks feature usage when entitlement is exceeded.
**Spec ref:** Section 46

---

## P2 — UX / Maintainability (fix during Phase 2+)

### P2-1: No CSP header ✅ FIXED
**File:** `next.config.ts`
**Impact:** No defense against XSS via inline scripts or unauthorized resource loading.
**Fix:** Added Content-Security-Policy header to `next.config.ts` with directives for default-src, script-src, style-src, font-src, img-src, connect-src, frame-src, object-src, base-uri, form-action, frame-ancestors. Supabase domain dynamically extracted from env var.

### P2-2: No rate limiting on public forms ✅ FIXED
**Observation:** Public booking request and contact forms have no rate limiting.
**Impact:** Abuse/spam risk.
**Fix:** Created `src/lib/rate-limit/index.ts` — in-memory sliding-window rate limiter with auto-cleanup. Pre-configured limiters: `publicFormLimiter` (5/min), `authLimiter` (10/15min), `apiLimiter` (60/min). Applied `authLimiter` to `signInAction`, `signUpAction`, `forgotPasswordAction`.

### P2-3: No reserved platform hostname validation ✅ FIXED
**Observation:** Nothing prevents creating a tenant with slug `admin`, `api`, `app`, `www`, `mail`, `status`, etc.
**Impact:** Could collide with platform infrastructure subdomains.
**Fix:** Added `RESERVED_SLUGS` check at the start of `createOrganization()` in `platform-admin-service.ts`. Rejects 19 reserved slugs (`admin`, `api`, `app`, `www`, `mail`, `status`, `docs`, `help`, `support`, `billing`, `auth`, `cdn`, `static`, `portal`, `dashboard`, `login`, `signup`, `register`).

### P2-4: Mobile-first UX not implemented for School Admin
**Spec ref:** Section 39
**Observation:** Dashboard pages are desktop-oriented tables/forms.
**Status:** Deferred — large design task requiring per-page responsive layout work.

### P2-5: No audit log for all write operations ✅ FIXED
**Observation:** Audit logging exists but is only called explicitly in platform-admin-service. Most service mutations don't log.
**Spec ref:** Section 48
**Fix:** Created `src/lib/audit/index.ts` — fire-and-forget `audit()` helper that writes to `audit_logs` and never throws. Applied to `booking-service.ts` (create, status transition, cancel) and `school-settings-service.ts` (update, publish).

---

## P3 — Future Improvement (post-MVP)

### P3-1: Travel time buffer engine exists but is placeholder
**File:** `src/lib/travel-time/buffer-provider.ts`
**Status:** Tests pass but uses fixed buffer, no real geocoding/routing.

### P3-2: Subscription billing is Stripe-scaffolded but not wired end-to-end
**Status:** Webhook handler exists, subscription table exists, but no checkout flow.

### P3-3: Advanced reporting service is a skeleton
**File:** `src/services/reports-service.ts`

### P3-4: SMS notification provider not implemented
**Observation:** Email provider scaffolded, SMS provider is a stub.

---

## Baseline Metrics

| Metric | Value |
|---|---|
| Test files | 35 |
| Tests passing | 505 |
| Tests failing | 0 |
| TypeScript errors | 0 |
| Build | ✅ passes |
| Migrations | 12 files |
| Tables | 30+ |
| Services | 28 |
| RLS policies | ~112 |

---

## Recommended Fix Order

1. **P0-1** through **P0-7** — all security items before any feature work
2. **P1-1** — Booking status enum (blocks booking-as-request feature)
3. **P1-2** — www stripping (quick fix, high tenant-correctness impact)
4. **P1-5** — Invitation-based onboarding (blocks production school creation)
5. **P1-3, P1-4** — Content workflow + media library
6. **P1-6** — Canonical admin URL (architectural, may defer)
7. **P1-7, P1-8** — Gate/remove non-MVP code
8. **P1-9, P1-10** — Tighten RLS + enforce entitlements
9. **P2-**** — UX/hardening pass
