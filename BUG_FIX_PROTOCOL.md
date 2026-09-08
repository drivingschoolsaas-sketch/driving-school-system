# DriveFlow — Bug Fix Protocol

## General Bug Fix Procedure

**Do NOT immediately start randomly modifying files.**

### Step 1: Understand
- What is the expected behavior?
- What is actually happening?

### Step 2: Reproduce
- Reproduce the bug locally or identify the exact conditions.

### Step 3: Identify Feature
- Which feature area is affected? (bookings, domains, auth, etc.)

### Step 4: Inspect Recent Changes
- Check recent commits and PRs in the affected area.

### Step 5: Inspect Logs
- Check structured logs for error codes and context.

### Step 6: Trace Data Flow
```
UI → Server → Service → Repository → Database → External Provider (if relevant)
```
Trace the full path of the failing operation.

### Step 7: Root Cause
- Identify the actual root cause.
- Do NOT stop at the first suspicious code.

### Step 8: Regression Test
- Create a failing test that demonstrates the bug.

### Step 9: Smallest Fix
- Implement the smallest safe fix.
- Do NOT refactor unrelated modules.

### Step 10–16: Verify
- Run focused tests
- Run related feature tests
- Run tenant isolation tests (if tenant code involved)
- Run RLS tests (if database security involved)
- Run TypeScript (`npm run typecheck`)
- Run lint (`npm run lint`)
- Run build (`npm run build`)

### Step 17: Impact Check
Check impact on: Domains, Bookings, Payments, Permissions, RLS, Timezones, Notifications, Subscriptions.

### Step 18: Summary
Report:
- Root cause
- Files changed
- Migration changes
- Tests added
- Tests passed
- Security implications
- Remaining risks
- Manual verification needed

**Never claim a test passed unless it actually ran successfully.**

---

## Domain Bug Protocol

For domain-related bugs, follow additional steps:

1. Capture hostname and environment
2. Normalize hostname through `normalizeHostname()`
3. Run through `classifyHostname()`
4. Inspect `organization_domains` table
5. Check domain status
6. Check organization status
7. Inspect DNS state
8. Inspect SSL state
9. Inspect provider response (if applicable)
10. Check authentication (if protected route)
11. Check membership
12. Identify root cause
13. Add regression test
14. Apply smallest fix
15. Test with another organization
16. Test with unknown domain
17. Test with unverified domain
18. Run tenant isolation tests
19. Run build

**Never fix domain bugs by weakening domain verification or tenant security.**
