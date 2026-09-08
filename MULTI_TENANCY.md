# DriveFlow — Multi-Tenancy Architecture

## Core Concept

Every driving school is an **organization** (tenant). All tenant-owned business records use `organization_id` as the ownership key. Domain names identify tenants but never own data.

## Data Ownership Model

```
Organization (organization_id)
  ├── Locations (branches)
  ├── Instructors
  ├── Students
  ├── Vehicles
  ├── Lesson Types
  ├── Packages
  ├── Availability Rules
  ├── Bookings
  ├── Payments
  ├── Reviews
  ├── Success Stories
  ├── Media
  ├── Settings
  └── Domains (can change without affecting above)
```

## Tenant Resolution Flow

1. Request arrives at a hostname
2. Middleware normalizes and classifies the hostname
3. `resolveHostname()` queries `organization_domains`
4. Domain must have `status = 'verified'`
5. Organization is loaded and must be `active` or `trial`
6. `TenantContext` is established for the request

## Security Layers

### Layer 1: Domain Resolution
- Unknown hostnames → `DOMAIN_001_UNKNOWN_HOST`
- Unverified domains → `DOMAIN_002_NOT_VERIFIED`
- Suspended orgs → `DOMAIN_006_ORGANIZATION_SUSPENDED`

### Layer 2: Application Authorization
- Authenticated user must have an **active membership** in the resolved organization
- Membership `organization_id` must match the resolved `organization_id`
- Role and permission checks gate specific operations

### Layer 3: Database Query Scoping
- All tenant queries include `WHERE organization_id = ?`
- The `organization_id` comes from server-validated context, NEVER from the browser

### Layer 4: Supabase Row Level Security
- RLS is enabled on all tenant-owned tables
- Policies check `organization_members` to verify the user belongs to the organization
- Even if application code has a bug, RLS prevents cross-tenant data access

## Cross-Tenant Protection Rules

| Rule | Enforcement |
|------|-------------|
| School A cannot read School B data | RLS + query scoping |
| School A cannot write School B data | RLS + query scoping |
| School A cannot infer School B data | No global counts/aggregates exposed |
| Domain change doesn't move data | `organization_id` is the FK, not hostname |
| Browser cannot choose tenant | Server resolves tenant from hostname |

## User Roles

| Role | Scope | Access |
|------|-------|--------|
| `platform_owner` | Platform | Full system access |
| `platform_support` | Platform | Support operations |
| `school_owner` | Organization | Full school access |
| `school_admin` | Organization | Administrative access |
| `instructor` | Organization | Instructor features |
| `student` | Organization | Student portal |

## Authorization Flow

```
1. Resolve organization from hostname
2. Authenticate user (Supabase Auth)
3. Find active organization_members record
4. Confirm membership.organization_id === resolved organization_id
5. Check role
6. Check specific permission
7. RLS enforces at database level
8. Execute action
```

## Caching Rules

All tenant-dependent caching MUST include `organization_id` in the cache key:

```
tenant:{organization_id}:instructors
tenant:{organization_id}:packages
```

Never globally cache responses that differ per organization.

## Testing Requirements

Every tenant isolation test must use at least:
- Organization A with Domain A and User A
- Organization B with Domain B and User B

And verify:
- Domain A → Organization A
- Domain B → Organization B
- User A can access A resources
- User A CANNOT access B resources
- User B CANNOT access A resources
- Changing Domain A doesn't affect A's business records
