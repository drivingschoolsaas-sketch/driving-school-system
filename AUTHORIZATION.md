# DriveFlow — Authorization Model

## Overview

Authorization in DriveFlow is a multi-layer system. No single layer is sufficient; they work together to ensure complete tenant isolation.

## Authorization Flow

For every protected tenant request:

```
1. Resolve organization from hostname
   → middleware classifies hostname
   → tenant resolver queries organization_domains
   → returns TenantContext with organization_id

2. Authenticate user
   → Supabase Auth validates session
   → returns user_id

3. Find active organization membership
   → query organization_members
   → WHERE organization_id = resolved_org AND user_id = auth_user
   → WHERE status = 'active'

4. Confirm membership org matches resolved org
   → membership.organization_id === resolvedOrganizationId
   → safety check against programming errors

5. Check role
   → isAtLeastRole(membership.role, minimumRole)

6. Check permission
   → hasPermission(membership.role, requiredPermission)

7. Apply RLS
   → Supabase enforces row-level security at the database

8. Execute action
```

## Roles

| Role | Scope | Description |
|------|-------|-------------|
| `platform_owner` | Platform | Full system access |
| `platform_support` | Platform | Support operations |
| `school_owner` | Organization | Full school access, member & domain management |
| `school_admin` | Organization | Administrative access (no member/domain management) |
| `instructor` | Organization | Schedule, bookings, student progress |
| `student` | Organization | Own bookings, progress, reviews |

## Permission Categories

### Organization
- `org:view` — View organization details
- `org:edit` — Edit organization settings
- `org:manage_members` — Add/remove/update members
- `org:manage_settings` — Manage school settings
- `org:manage_domains` — Manage custom domains
- `org:manage_branding` — Manage branding
- `org:view_audit_logs` — View audit trail

### Instructors
- `instructor:view` / `create` / `edit` / `delete`
- `instructor:view_own_schedule` / `manage_own_availability`

### Students
- `student:view` / `create` / `edit` / `delete`
- `student:view_own_profile` / `edit_own_profile`

### Bookings
- `booking:view` / `create` / `edit` / `cancel`
- `booking:view_own` / `create_own` / `cancel_own`

### Other
- `availability:view` / `manage`
- `vehicle:view` / `manage`
- `location:view` / `manage`
- `lesson_type:view` / `manage`
- `package:view` / `manage`
- `review:view` / `moderate` / `create_own`
- `success_story:view` / `manage`
- `payment:view` / `manage`
- `report:view`
- `notification:manage`

## RLS Helper Functions

```sql
is_org_member(org_id, user_id)    -- active membership exists
is_org_admin(org_id, user_id)     -- school_owner, school_admin, or platform roles
is_org_owner(org_id, user_id)     -- school_owner or platform_owner
```

## RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `organizations` | Members | Authenticated | Admins | — |
| `organization_domains` | Public (for resolution) | Owners | Owners | Owners |
| `organization_members` | Own memberships | Admins | Admins | Owners |
| `profiles` | Own profile | Own (auto-trigger) | Own | — |
| `locations` | Members | Admins | Admins | Admins |
| `audit_logs` | Admins | Members | — | — |
| `domain_events` | Admins | Admins | — | — |

## Security Rules

1. **Never trust `organization_id` from the browser** — it comes from server-resolved hostname
2. **Authentication ≠ Authorization** — a logged-in user is not automatically authorized
3. **Membership is required** — no active membership = no access, regardless of authentication
4. **RLS is the last defense** — even if application code has a bug, RLS blocks cross-tenant access
5. **Domain ≠ Identity** — domains identify tenants, `organization_id` owns data
