# DriveFlow — Domain Architecture

## Domain Modes

### Type 1: Platform Subdomain
Every organization automatically receives a platform subdomain during onboarding.

```
sydneysmart.driveflow.com.au
abcdriving.driveflow.com.au
```

### Type 2: Custom Root Domain
Schools can connect their own domain.

```
sydneysmartdriving.com.au
abcdriving.com.au
```

### Type 3: Custom Subdomain
Schools with existing websites can use a subdomain for the SaaS.

```
booking.schoolname.com.au
lessons.anotherschool.com.au
```

## Domain Database

### `organization_domains` Table

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `organization_id` | UUID FK | Owner organization |
| `hostname` | TEXT UNIQUE | Normalized hostname |
| `domain_type` | ENUM | platform_subdomain / custom_root / custom_subdomain |
| `status` | ENUM | pending / verifying / verified / failed / suspended |
| `is_primary` | BOOLEAN | Whether this is the primary domain |
| `redirect_to_primary` | BOOLEAN | Whether to redirect to primary |
| `verification_method` | TEXT | How ownership was verified |
| `verification_token` | TEXT | Verification token if needed |
| `ssl_status` | TEXT | SSL certificate status |
| `external_provider_domain_id` | TEXT | Provider-specific ID |

**Constraint**: `UNIQUE(LOWER(hostname))` — one hostname can never belong to two organizations.

## Domain Resolution

```
Incoming Request
  → read hostname
  → normalizeHostname()
    - lowercase
    - remove www
    - remove port
    - trim whitespace
  → classifyHostname()
    - localhost → development
    - *.vercel.app → preview
    - admin.driveflow.com.au → platform admin
    - driveflow.com.au → platform website
    - *.driveflow.com.au → tenant (subdomain)
    - anything else → tenant (custom domain)
  → query organization_domains
  → check domain status (must be 'verified')
  → load organization
  → check org status (must be 'active' or 'trial')
  → return TenantContext
```

## Hostname Normalization

All hostname comparisons go through `normalizeHostname()`:

```typescript
normalizeHostname("  WWW.Example.COM:3000  ") → "example.com"
```

**Never** compare raw `Host` header strings directly.

## Primary Domain

An organization may have multiple domains. One is marked `is_primary = true`.

Secondary domains with `redirect_to_primary = true` will redirect.

**Changing the primary domain does NOT change**: organization_id, students, bookings, payments, instructors, reviews, photos, availability, or any business data.

## Custom Domain Onboarding

```
1. Owner enters desired domain
2. → Normalize hostname
3. → Validate format
4. → Check uniqueness (no other org owns it)
5. → Create pending organization_domains record
6. → Register with hosting provider (via DomainProvider interface)
7. → Generate DNS instructions for owner
8. → Owner configures DNS
9. → System checks DNS
10. → Verify ownership
11. → Verify SSL
12. → Mark status = 'verified'
13. → Optionally set as primary
```

## Domain Provider Abstraction

The application never calls Vercel APIs directly. Instead:

```typescript
interface DomainProvider {
  addDomain(hostname): Promise<Result>
  removeDomain(hostname): Promise<Result>
  checkDomain(hostname): Promise<VerificationResult>
  verifyDomain(hostname): Promise<VerificationResult>
  getDnsInstructions(hostname): Promise<DnsInstruction[]>
  getDomainStatus(hostname): Promise<Status>
}
```

Implementations: `VercelDomainProvider` (production), `MockDomainProvider` (testing).

## Domain Security

| Threat | Protection |
|--------|-----------|
| Unknown hostname | `DOMAIN_001_UNKNOWN_HOST` — 404 |
| Unverified hostname | `DOMAIN_002_NOT_VERIFIED` — 403 |
| Duplicate hostname | `DOMAIN_003_ALREADY_REGISTERED` — 409 |
| DNS verification failure | `DOMAIN_004_DNS_VERIFICATION_FAILED` — 400 |
| SSL pending | `DOMAIN_005_SSL_PENDING` — 503 |
| Suspended organization | `DOMAIN_006_ORGANIZATION_SUSPENDED` — 403 |
| Org/domain mismatch | `DOMAIN_007_ORGANIZATION_MISMATCH` — 403 |
| Unsafe redirect | `DOMAIN_008_UNSAFE_REDIRECT` — 400 |
| Missing primary | `DOMAIN_009_PRIMARY_DOMAIN_MISSING` — 500 |
| Provider error | `DOMAIN_010_PROVIDER_ERROR` — 502 |

## Domain Events

All domain lifecycle changes are recorded in `domain_events`:

- `domain_created`
- `verification_started`
- `verification_failed`
- `domain_verified`
- `ssl_pending`
- `ssl_active`
- `primary_changed`
- `domain_suspended`
- `domain_removed`

## Authentication & Custom Domains

- Cookies cannot be shared across unrelated root domains
- Authentication callbacks must validate against verified domain list
- `returnTo` / `redirect` URLs must be checked against allowed domains
- Never weaken cookie security for cross-domain convenience
- Prevent open redirects
