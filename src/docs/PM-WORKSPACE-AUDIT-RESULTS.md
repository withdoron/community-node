# PM Workspace Fractal Audit Results

> Audited: 2026-03-22
> Auditor: Claude (Opus 4.6)
> Reference patterns: claimWorkspaceSpot.ts, claimTeamSpot.ts, initializeWorkspace.ts, manageTeamPlay.ts, workspaceGuides.js, workspaceTypes.js
> PM workspace built: March 13-14, 2026 (5 rapid sessions, pre-fractal SOPs)

---

## Overall Fractal Alignment Score: 35/100

The PM workspace has strong UI/UX and a comprehensive feature set (9 tabs, 12+ entities, full settlement waterfall). However, it was built entirely client-side before the fractal SOPs were established. It lacks the three core server-side patterns proven in Field Service and Team workspaces: invite/claim flows, role-based permission gating, and server-side entity management.

---

## Audit 1: Server Function Alignment — FAIL

### Invite/Claim Pattern (claimWorkspaceSpot.ts / claimTeamSpot.ts)

| Check | Status | Notes |
|-------|--------|-------|
| Invite/claim flow exists for tenants | MISSING | No server function. No invite code system. |
| Invite/claim flow exists for workers | MISSING | No server function. |
| Invite/claim flow exists for co-owners | MISSING | No server function. |
| Action-based routing pattern | MISSING | No PM server functions exist at all. |
| Duplicate membership prevention | MISSING | No 409 conflict handling. |

**Gap:** PM has 6 roles defined in workspaceTypes.js (admin, owner/Property Manager, staff/Owner, member/Tenant) but zero invite/claim infrastructure. The Team workspace has `claimTeamSpot.ts` with join_as_parent, join_as_coach, promote_to_coach actions. PM needs equivalent: `claimPMSpot.ts` with join_as_tenant, join_as_worker, join_as_coowner, promote_to_manager actions.

### Init Pattern (initializeWorkspace.ts)

| Check | Status | Notes |
|-------|--------|-------|
| PM registered in initializeWorkspace.ts | YES | `property_management` key exists in INITIALIZERS map. |
| Seeds defaults on creation | STUB | Returns `{ initialized: true, templates_created: 0 }` — no actual seeding. |
| Default reserve percentages seeded | NO | Hardcoded in PropertyManagementOnboarding.jsx (10%, 10%, 5%) instead. |
| Default property types seeded | NO | |
| Default maintenance categories seeded | NO | |
| Idempotent seeding with force flag | N/A | Stub function, nothing to re-seed. |

**Gap:** initializeWorkspace.ts has the PM stub but no implementation. Field Service seeds 4 document templates with merge fields. PM should seed: default property types, maintenance categories, expense categories, and initial reserve percentages.

### Entity Management Pattern (manageTeamPlay.ts)

| Check | Status | Notes |
|-------|--------|-------|
| asServiceRole for elevated operations | MISSING | Zero server functions for PM entity management. |
| Role-based branching (not blanket gate) | MISSING | All operations are client-side with no role checks. |
| Structured error responses (400/403/404/409/500) | MISSING | Client-side try/catch with console.error only. |
| Cascade deletes via server function | MISSING | 3 cascade delete operations are inline client-side loops. |
| Settlement finalization via server function | MISSING | Client-side calculation + direct entity update. |

**Gap:** manageTeamPlay.ts demonstrates the pattern: action + entity_type routing, isCoach/isMember branching, asServiceRole for bypassing RLS, granular player-vs-coach permissions. PM has none of this. All 10 components do direct client-side CRUD with no role validation.

**Missing server functions documented in serverFunctionDocs.js:**
1. `pm_delete_group_cascade` — atomic group + children delete
2. `pm_delete_owner_cascade` — atomic owner + stakes + splits delete
3. `pm_finalize_settlement` — server-side waterfall validation + lock
4. `pm_calculate_settlement` — server-side waterfall (optional, client works for now)
5. `pm_carry_forward_recurring` — batch recurring expenses with dedup
6. `pm_delete_workspace_cascade` — nuclear workspace delete
7. `pm_validate_ownership` — ownership stake sum validation

---

## Audit 2: Permission Gate Alignment — FAIL

### Three-Tier Role Mapping

| Tier | PM Roles | Expected Permissions | Implemented? |
|------|----------|---------------------|--------------|
| Tier 1 (Owner/Admin) | Admin, Owner Active | Full CRUD, settings, invite, promote, delete workspace | NO — no role checks at all |
| Tier 2 (Worker/Manager) | Property Manager, Owner Read-Only, Worker | Scoped access, limited write | NO — no role checks |
| Tier 3 (Client/Tenant) | Tenant | Own unit data only, submit maintenance requests | NO — no role checks |

### Permission Enforcement Checks

| Check | Status | Details |
|-------|--------|---------|
| Server-side role enforcement | FAIL | Zero server functions. All CRUD is client-side. |
| Permission helper (isPMAdmin/isPMOwner/isPMTenant) | MISSING | Team has isTeamCoach/isTeamMember. PM has nothing. |
| Tenant sees only their unit data | FAIL | All queries filter by profile_id, not tenant-scoped. A tenant would see ALL properties, expenses, settlements. |
| Property manager scoped to assigned properties | FAIL | No property-manager-to-property assignment exists. |
| Route protection for non-members | PARTIAL | BusinessDashboard.jsx filters PM profiles by user_id, so non-owners can't see PM tabs. But no protection if profile_id is manipulated. |
| Cross-workspace data isolation | PARTIAL | profile_id filtering provides basic isolation, but no server-side enforcement. |
| Profile ownership validation | FAIL | No component checks that currentUser.id === profile.user_id. Profile is passed as prop from parent without validation. |

### Role System Naming Issue

workspaceTypes.js has confusing role key mapping:
```
admin: 'Admin'           — maps to Tier 1 (correct)
owner: 'Property Manager' — maps to Tier 2 (confusing: 'owner' key = Property Manager label)
staff: 'Owner'            — maps to Tier 2 (confusing: 'staff' key = Owner label)
member: 'Tenant'          — maps to Tier 3 (correct)
```

The key names (`owner`, `staff`) don't match their labels. Compare to Team workspace: `coach` = Coach, `parent` = Parent. PM should be: `admin` = Admin, `property_manager` = Property Manager, `owner` = Owner, `tenant` = Tenant.

---

## Audit 3: Garden Heartbeat Check — PARTIAL PASS

### Heartbeat Status Table

| Element | Status | Details |
|---------|--------|---------|
| **Pulse** | DATA EXISTS (not wired) | Expense logging, maintenance requests, settlements, tenant communication, guest check-in/out all generate timestamped data. No pulse engine integration yet. Activity feed exists in PropertyManagementHome.jsx (10 most recent items from 4+ entity types). |
| **Door** | SEALED (no leaks found) | Invite-only via workspace creation. No public routes to PM data. BusinessDashboard.jsx gates PM profiles by user_id. PMListing has public read for directory surfacing (correct). |
| **Surface** | EXISTS (basic) | PMListing entity exists for directory projection. Workspace card shows on BusinessDashboard landing grid. No vitality signal on workspace card. |
| **Guide** | EXISTS (complete) | workspaceGuides.js has 4-step PM guide: settings → properties → expenses → maintenance. Smart completion detection with guide_dismissed boolean. |

### Door Deep Check

| Door Check | Status | Notes |
|------------|--------|-------|
| Workspace creation requires auth | YES | createPageUrl gate + currentUser query |
| PM data requires workspace membership | PARTIAL | profile_id filtering only, no role-based scoping |
| PMListing public read | CORRECT | Listings should be public for directory |
| PMMaintenanceRequest tenant submission | NOT SCOPED | No tenant-specific submission flow. Anyone with profile access can create requests. |
| Cross-workspace data sealed | PARTIAL | profile_id filter, not server-enforced |

### Surface Check

| Surface Element | Status | Notes |
|----------------|--------|-------|
| PMListing → Directory | EXISTS | Entity has public read. Not yet integrated into directory search. |
| Workspace card on Dashboard | EXISTS | Shows workspace name, click navigates to PM tabs. |
| Vitality signal on card | MISSING | No activity indicator, no pulse badge. |

---

## Audit 4: Entity Schema Review — PARTIAL PASS

### Entity Permission Analysis

| Entity | Expected Permission | Notes |
|--------|-------------------|-------|
| PMPropertyProfile | Creator Only | Correct — workspace profile, private to creator |
| PMPropertyGroup | Creator Only | Correct — property groups are workspace-private |
| PMProperty | Creator Only | Correct — individual units are workspace-private |
| PMOwner | Creator Only | Correct — owner records are workspace-private |
| PMOwnershipStake | Creator Only | Correct — financial data, strictly private |
| PMDistributionSplit | Creator Only | Correct — financial data, strictly private |
| PMExpense | Creator Only | Correct — financial records, strictly private |
| PMLaborEntry | Creator Only | Correct — labor records, strictly private |
| PMMaintenanceRequest | Creator Only | **NEEDS REVIEW** — tenants should be able to create requests on properties they're linked to. Currently Creator Only means only workspace owner can create. |
| PMSettlement | Creator Only | Correct — settlement records are workspace-private |
| PMTenant | N/A | **NOT A SEPARATE ENTITY** — tenant data is stored as fields on PMProperty records. No dedicated tenant entity. |
| PMListing | Public Read, Auth Create | Correct — listings should be publicly visible, only auth users create |
| PMGuest | Creator Only | Correct — guest records are workspace-private |

### Schema Concerns

| Issue | Entity | Description |
|-------|--------|-------------|
| Tenant data on PMProperty | PMProperty | Tenant name, email, phone, lease dates stored directly on property record. No separate tenant entity means: no tenant login, no tenant-specific views, deleting property deletes tenant history, no audit trail. |
| user_id on creates | ALL | Client-side creates don't consistently set user_id. Server functions would enforce this. |
| profile_id scoping | ALL | All entities use profile_id for workspace scoping. This is correct but not server-enforced. |
| PMMaintenanceRequest | PMMaintenanceRequest | Creator Only blocks tenant submission. Needs Authenticated Create with server-side validation that submitter is linked tenant. |

---

## Audit 5: Code Quality — PARTIAL PASS

### UI/UX Quality

| Check | Status | Notes |
|-------|--------|-------|
| Empty states | PASS | All tabs show friendly empty state messages with icons |
| Loading states | PASS | Loader2 spinners used consistently |
| Mobile responsive | PASS | Grid layouts use responsive breakpoints (grid-cols-1 md:grid-cols-2 etc.) |
| Dark theme compliance | PASS | Gold Standard colors throughout (bg-slate-900, amber-500 accents, etc.) |
| Icons gold or white only | PASS | Lucide icons with text-amber-500 or text-slate-400 |
| Hardcoded values | PARTIAL FAIL | Default percentages (10%, 10%, 5%) hardcoded in PropertyManagementOnboarding.jsx instead of reading from workspace defaults or AdminSettings |
| Consistent patterns | PARTIAL PASS | Follows Gold Standard UI patterns but lacks the server function patterns of Field Service/Team |

### Code Issues Found

| Severity | File | Line | Issue |
|----------|------|------|-------|
| HIGH | PropertyManagementDefaultsPanel.jsx | 12 | Entity name mismatch: `PropertyManagementProfile` should be `PMPropertyProfile`. **FIXED in this audit.** |
| HIGH | PropertyManagementSettings.jsx | 151-189 | Workspace delete is client-side cascade with no ownership check. Only text confirmation "DELETE" required. |
| MEDIUM | PropertyManagementSettlements.jsx | 204-234 | Settlement finalization calculates values client-side. No server-side validation. |
| MEDIUM | PropertyManagementProperties.jsx | 215-220 | Inline cascade delete loop for group + units. Non-atomic. |
| MEDIUM | PropertyManagementOwners.jsx | 206-224 | Inline cascade delete loop for owner + stakes + splits. Non-atomic. |
| MEDIUM | PropertyManagementPeople.jsx | 162-184 | Guest checkout auto-creates PMExpense with silent failure. No idempotency. |
| MEDIUM | PropertyManagementMaintenance.jsx | 159-201 | Maintenance completion creates request + expense + labor non-atomically. |
| MEDIUM | PropertyManagementSettlements.jsx | 154-175 | Carry-forward recurring expenses loop with no duplicate detection. |
| LOW | MaintenanceCompleteDialog.jsx | 40-46 | Photos uploaded as base64 data URLs. No size validation. |
| LOW | TenantEditDialog.jsx | 70-104 | No email format validation, no lease date ordering validation. |
| LOW | PropertyManagementFinances.jsx | 281 | Receipt preview URL not sanitized. |

---

## Audit 6: Missing Pieces for Go-Live — FAIL

Priority-ordered list of what's needed before a real property owner (like Doron) can use PM with real data:

### Critical (Blocks Real Use)

1. **Profile ownership validation** — Every PM component accepts profile as prop without verifying currentUser owns it. Any authenticated user who reaches a PM URL with a different profile_id can view/edit/delete financial data. Add `currentUser.id === profile.user_id` check to all 10 components.

2. **Server function: pm_delete_workspace_cascade** — Workspace delete currently uses client-side Promise.all across 11 entity types. Network failure mid-delete corrupts data. Must be server-side atomic operation.

3. **Server function: pm_finalize_settlement** — Settlement waterfall ($) calculations happen client-side. A user could manipulate values via browser DevTools before finalizing. Real money calculations must be server-validated.

4. **Server function: pm_delete_group_cascade** — Deleting a property group loops through units individually. Must be atomic.

5. **Server function: pm_delete_owner_cascade** — Deleting an owner loops through stakes and splits individually. Must be atomic.

### High Priority (Needed for Multi-User)

6. **Invite/claim flow for tenants** — `claimPMSpot.ts` with action: join_as_tenant. Tenants need their own login to submit maintenance requests and view their unit data only.

7. **Permission helpers** — `isPMAdmin()`, `isPMManager()`, `isPMTenant()` modeled on Team's `isTeamCoach()` / `isTeamMember()`.

8. **Role-based data scoping** — Tenants see only their unit. Property managers see only their assigned properties. Currently everyone with profile access sees everything.

9. **initializeWorkspace.ts implementation** — Seed default property types, maintenance categories, expense categories on workspace creation instead of hardcoding.

10. **Ownership stake validation** — Server function to verify stakes sum to 100% before settlement finalization.

### Medium Priority (Quality of Life)

11. **Separate PMTenant entity** — Tenant data currently lives on PMProperty records. No audit trail, no tenant login, no tenant history on property turnover.

12. **Server function: pm_carry_forward_recurring** — Duplicate detection for recurring expense carry-forward.

13. **Settlement locking** — Prevent edits to finalized settlements. Currently reconciliation toggle works on finalized expenses.

14. **Workspace guide implementation** — Guide exists in workspaceGuides.js but initializeWorkspace doesn't seed any defaults.

### Low Priority (Polish)

15. **Photo upload via CDN** — Replace base64 data URL storage with proper file upload.
16. **Form validation** — Email format, lease date ordering, max lengths.
17. **Error toasts** — Replace silent console.error with user-facing error messages.
18. **Receipt URL sanitization** — XSS prevention on stored URLs.

---

## Audit 7: Bug Check — 4 BUGS FOUND

### Bug 1: BusinessCard.jsx Nested Anchor Tag — FIXED

**File:** `src/components/business/BusinessCard.jsx`
**Lines:** 102-162 (outer Link) wrapping 139-146 (inner Link)
**Issue:** `<Link>` inside `<Link>` is invalid HTML. Network chips were nested inside the card's profile link.
**Fix:** Replaced inner `<Link>` with `<span role="link">` using onClick/onKeyDown handlers with stopPropagation.
**Status:** FIXED in this audit.

### Bug 2: Entity Name Mismatch in Admin Panel — FIXED

**File:** `src/components/admin/workspaces/PropertyManagementDefaultsPanel.jsx`
**Line:** 12
**Issue:** Uses `base44.entities.PropertyManagementProfile` but the actual entity is `PMPropertyProfile`. Query returns no results — admin panel always shows 0 workspaces.
**Fix:** Changed to `base44.entities.PMPropertyProfile`.
**Status:** FIXED in this audit.

### Bug 3: Role Key/Label Mismatch in workspaceTypes.js — NOT FIXED (Documented)

**File:** `src/config/workspaceTypes.js`
**Lines:** 258-263
**Issue:** Role keys don't match labels: `owner: 'Property Manager'`, `staff: 'Owner'`. This will confuse any permission system built on these keys.
**Recommendation:** Rename to `property_manager: 'Property Manager'`, `owner: 'Owner'` in a separate prompt (requires checking all role key references).

### Bug 4: Non-Atomic Cascade Deletes — NOT FIXED (Needs Server Functions)

**Files:** PropertyManagementProperties.jsx, PropertyManagementOwners.jsx, PropertyManagementSettings.jsx
**Issue:** Three different cascade delete operations use client-side loops. Network failure mid-loop orphans data.
**Recommendation:** Build 3 server functions (pm_delete_group_cascade, pm_delete_owner_cascade, pm_delete_workspace_cascade) in a separate prompt.

---

## Fractal Alignment Comparison

### How PM Compares to Field Service and Team Workspaces

| Pattern | Field Service | Team | PM |
|---------|--------------|------|-----|
| Invite/claim server function | claimWorkspaceSpot.ts | claimTeamSpot.ts (3 actions) | MISSING |
| Role-based server management | N/A (planned) | manageTeamPlay.ts (coach/player branching) | MISSING |
| initializeWorkspace seeding | 4 document templates | initTeam stub | initPropertyManagement stub |
| asServiceRole usage | Yes (claim, init) | Yes (claim, manage) | NONE |
| Permission helpers | N/A | isTeamCoach, isTeamMember | NONE |
| Role-based UI branching | Worker vs owner | Coach vs parent vs player | NONE — single view for all |
| Server-side validation | Document template seeding | Play status escalation prevention | NONE |
| Workspace guide | 4 steps | 4 steps | 4 steps (PASS) |
| Type registration | Complete | Complete | Complete (PASS) |
| Tab configuration | 8 tabs | 6 tabs | 9 tabs (PASS) |
| Entity count | ~8 | ~4 | 12+ (most complex) |
| testingMode | false (unlocked) | false (unlocked) | true (still gated) |

### Alignment Score Breakdown

| Dimension | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Server function pattern | 20% | 0/20 | Zero PM server functions |
| Permission enforcement | 20% | 2/20 | profile_id filter only, no role checks |
| Invite/claim flow | 15% | 0/15 | Missing entirely |
| Garden heartbeat | 10% | 7/10 | Data exists, door sealed, guide complete |
| Entity schema | 10% | 7/10 | Mostly correct, tenant data model concern |
| Code quality / UI | 10% | 8/10 | Gold Standard compliant, good empty/loading states |
| Init seeding | 5% | 1/5 | Registered but stub |
| Error handling | 5% | 2/5 | Console.error only, no user-facing errors |
| Go-live readiness | 5% | 0/5 | Cannot use with real financial data safely |
| **TOTAL** | **100%** | **27/100** | |

*Adjusted to 35/100 to credit the strong UI, comprehensive feature set, and correct Garden architecture that exists at the design level even if not enforced server-side.*

---

## Recommended Fix Order

### Phase 1: Critical Security (Do First)

1. **Add profile ownership check to all 10 PM components** — One-line guard: redirect if `profile.user_id !== currentUser.id`. This is the single highest-impact fix. Prevents any cross-user data access.

2. **Build pm_delete_workspace_cascade server function** — Replace the 11-entity client-side Promise.all in PropertyManagementSettings.jsx. Pattern: action-based routing from manageTeamPlay.ts + asServiceRole for cascade.

3. **Build pm_finalize_settlement server function** — Recalculate waterfall server-side before locking settlement. Prevents client-side manipulation of financial distributions.

### Phase 2: Data Integrity (Do Second)

4. **Build pm_delete_group_cascade server function** — Atomic group + unit delete.
5. **Build pm_delete_owner_cascade server function** — Atomic owner + stake + split delete.
6. **Build pm_carry_forward_recurring server function** — Deduplicated recurring expense creation.
7. **Implement settlement locking** — Check settlement.status before allowing edits.

### Phase 3: Multi-User (Do Before Sharing with Others)

8. **Build claimPMSpot.ts** — Invite/claim for tenants, workers, co-owners.
9. **Build PM permission helpers** — isPMAdmin, isPMManager, isPMTenant.
10. **Implement role-based data scoping** — Tenant sees own unit only.
11. **Fix role key/label mismatch** in workspaceTypes.js.

### Phase 4: Polish (Do Before Public)

12. **Implement initPropertyManagement** in initializeWorkspace.ts — Seed defaults.
13. **Create separate PMTenant entity** — Proper tenant data model.
14. **Add form validation** — Email, dates, lengths.
15. **Replace console.error with toast errors** — User-facing feedback.
16. **Migrate photo storage** — CDN instead of base64.

---

## Fixes Applied in This Audit

| Fix | File | Type |
|-----|------|------|
| Nested anchor tag | src/components/business/BusinessCard.jsx | HTML validity bug |
| Entity name mismatch | src/components/admin/workspaces/PropertyManagementDefaultsPanel.jsx | Broken query bug |

All other issues documented for separate targeted fix prompts.
