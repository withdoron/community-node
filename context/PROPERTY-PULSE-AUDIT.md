# Property Pulse Orientation Audit

> **Purpose:** Read-only inventory of the Property Pulse standalone app to plan porting into the LocalLane workspace engine.
> **Date:** 2026-03-12
> **Repos audited:** `property-pulse/` (standalone app) and `community-node/` (workspace engine)

---

## 1. ENTITY INVENTORY

Property Pulse uses 10 Base44 entities. All writes go through 7 server functions (no direct client-side writes). The Base44 client is configured with `requiresAuth: false` -- auth is enforced per-function on the server side via `base44.auth.me()`.

### 1.1 PropertyGroups

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `name` | string | Group name (e.g. "Oregon Duplex") |
| `address` | string | Physical address |
| `structure_type` | enum | `single`, `duplex`, `triplex`, `fourplex`, `apartment_building`, `other` |
| `description` | string | Free text |
| `management_fee_pct` | number | Default 10 |
| `maintenance_reserve_pct` | number | Default 10 |
| `emergency_reserve_pct` | number | Default 5 |
| `emergency_reserve_target` | number | Dollar target for emergency reserve |
| `has_insurance` | boolean | |
| `insurance_notes` | string | |

**Relationships:** Parent of Properties, OwnershipStakes, DistributionSplits, Expenses, MonthlySettlements (all via `group_id`).
**Server function:** `manageProperties` -- actions: `create_group`, `update_group`, `delete_group` (cascade deletes child Properties).
**Permissions:** `can_create_properties`, `can_edit_properties`, `can_delete_properties`.

### 1.2 Properties (Units)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `name` | string | e.g. "Unit A" |
| `group_id` | string (FK) | -> PropertyGroups |
| `address` | string | |
| `unit_label` | string | e.g. "A", "B" |
| `property_type` | enum | `single_family`, `duplex_unit`, `triplex_unit`, `apartment`, `other` |
| `monthly_rent` | number | |
| `has_garage` | boolean | |
| `status` | enum | `occupied`, `vacant`, `maintenance`, `listed` |
| `tenant_name` | string | |
| `tenant_email` | string | |
| `tenant_phone` | string | |
| `lease_start` | date string | |
| `lease_end` | date string | |
| `notes` | string | |

**Server function:** `manageProperties` -- actions: `create_property`, `update_property`, `delete_property`.

### 1.3 Owners

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `name` | string | |
| `role` | enum | `owner`, `manager`, `both` |

**Server function:** `manageOwnership` -- actions: `create_owner`, `update_owner`, `delete_owner`. Requires `can_manage_owners`.

### 1.4 OwnershipStakes

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `owner_id` | string (FK) | -> Owners |
| `group_id` | string (FK) | -> PropertyGroups |
| `ownership_pct` | number | e.g. 50 |

**Server function:** `manageOwnership` -- actions: `create_stake`, `update_stake`, `delete_stake`. Requires `can_manage_stakes`.

### 1.5 DistributionSplits

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `from_owner_id` | string (FK) | Owner whose share is split |
| `to_owner_id` | string (FK) | Owner receiving the split |
| `group_id` | string (FK) | -> PropertyGroups |
| `split_pct` | number | % of from_owner's distribution |
| `reason` | string | e.g. "Family arrangement" |

**Server function:** `manageOwnership` -- actions: `create_split`, `update_split`, `delete_split`. Requires `can_manage_splits`.

### 1.6 Expenses

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `group_id` | string (FK) | -> PropertyGroups |
| `property_id` | string (FK, optional) | -> Properties; empty = group-level |
| `category` | enum | `property_tax`, `water_sewer`, `insurance`, `supplies`, `mileage`, `other` |
| `description` | string | |
| `amount` | number | |
| `date` | date string | YYYY-MM-DD |
| `is_recurring` | boolean | Flags for carry-forward |
| `receipt_url` | string | Uploaded receipt |
| `paid_by` | enum | `property`, `manager` |
| `reimbursement_status` | enum | `not_applicable`, `pending`, `included_in_settlement`, `paid` |
| `reimbursement_note` | string | |
| `reconciled` | boolean | |

**Server function:** `manageExpenses` -- actions: `create`, `update`, `delete`. Also modified by `manageSettlements` (finalize/unfinalize flips reimbursement status).

### 1.7 LaborEntries

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `property_id` | string (FK) | -> Properties |
| `worker_name` | string | |
| `worker_type` | enum | `handyman`, `manager`, `owner`, `other` |
| `hourly_rate` | number | |
| `hours` | number | |
| `total` | number | Computed: hourly_rate * hours |
| `date` | date string | |
| `description` | string | |
| `user_id` | string | Auto-set by server for workers |

**Server function:** `manageLaborEntries` -- actions: `create`, `update`, `delete`. Workers can only create/edit own entries. Admin can edit/delete any. Requires `can_create_labor`, `can_edit_all_labor`.

### 1.8 MaintenanceRequests

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `property_id` | string (FK) | -> Properties |
| `title` | string | |
| `description` | string | |
| `priority` | enum | `low`, `medium`, `high`, `emergency` |
| `status` | enum | `open`, `in_progress`, `completed`, `cancelled` |
| `reported_by` | string | |
| `reported_date` | date string | |
| `completed_date` | date string | Auto-set on completion |
| `total_cost` | number | |
| `notes` | string | |
| `assigned_to` | string | Worker email/userId |

**Server function:** `manageMaintenanceRequests` -- actions: `create`, `update_status`, `assign`, `edit`, `delete`. Tenants create only for their `linked_property_id`. Workers update status only on assigned requests.

### 1.9 MonthlySettlements

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Auto-generated |
| `group_id` | string (FK) | -> PropertyGroups |
| `month` | string | "YYYY-MM" |
| `status` | enum | `draft`, `finalized` |
| `notes` | string | |
| `finalized_at` | ISO timestamp | |
| `gross_rent` | number | Calculated |
| `total_fixed_expenses` | number | Calculated |
| `management_fee` | number | Calculated |
| `maintenance_reserve` | number | Calculated |
| `emergency_reserve` | number | Calculated |
| `total_labor_costs` | number | Calculated |
| `total_reimbursements` | number | Calculated |
| `net_distributable` | number | Calculated |
| `distributions` | string (JSON) | JSON-stringified distribution array |

**Server function:** `manageSettlements` -- actions: `create_draft`, `update_draft`, `finalize`, `unfinalize`, `delete_draft`. Requires `can_create_settlements`, `can_finalize_settlements`, `can_unfinalize_settlements`.

### 1.10 AppProfile (Singleton)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Single row |
| `manager_name` | string | |
| `manager_email` | string | |
| `manager_phone` | string | |
| `default_mgmt_fee_pct` | number | |
| `default_maint_reserve_pct` | number | |
| `default_emerg_reserve_pct` | number | |
| `user_roles` | string (JSON) | JSON array of user role objects |

**user_roles entry shape:**
```
{
  user_id, email, role ("admin"|"owner"|"worker"|"tenant"),
  linked_owner_id, linked_property_id, display_name,
  invited_at, accepted_at,
  permissions (per-user overrides), permission_overrides
}
```

**Server function:** `manageAppProfile` -- actions: `update_user_roles` (requires `can_manage_users`), `update_settings` (requires `can_manage_settings`).

### Entity Relationship Diagram (Textual)

```
AppProfile (singleton, holds user_roles JSON)
  └── references Owners (via linked_owner_id)
  └── references Properties (via linked_property_id)

PropertyGroups
  ├── Properties (group_id)
  │   ├── LaborEntries (property_id)
  │   └── MaintenanceRequests (property_id)
  ├── Expenses (group_id, optional property_id)
  ├── OwnershipStakes (group_id + owner_id -> Owners)
  ├── DistributionSplits (group_id + from_owner_id/to_owner_id -> Owners)
  └── MonthlySettlements (group_id)

Owners
  ├── OwnershipStakes (owner_id)
  └── DistributionSplits (from_owner_id, to_owner_id)
```

---

## 2. COMPONENT INVENTORY

**Total:** ~50 custom files, ~7,800 lines of code
**Tech stack:** React 18, React Router, TanStack Query, Tailwind CSS (dark theme), shadcn/ui, Lucide icons, Base44 SDK

### 2.1 Pages (8 page-level components)

| File | Lines | Description |
|------|-------|-------------|
| `src/pages/Dashboard.jsx` | ~285 | Central hub. Fetches all entities. PortfolioStats, PropertyGroupSummary, ReserveHealth, RecentActivity, QuickActions. Owner-group filtering. |
| `src/pages/Properties.jsx` | ~374 | Full CRUD for groups + units. 7 mutations. Cascading delete warnings. StandalonePropertyDialog for single-unit creation. |
| `src/pages/Owners.jsx` | ~425 | Full CRUD for owners, stakes, splits. 9 mutations. Ownership % validation per group. Cascading deletes. |
| `src/pages/Expenses.jsx` | ~495 | Dual-view (table + cards). Rich filtering: group, category, date range, recurring, reconciliation, reimbursement. Receipt preview. |
| `src/pages/LaborLog.jsx` | ~385 | Dual-view. Filtering by property, worker, type, date. Worker mode hides financials. |
| `src/pages/Maintenance.jsx` | ~398 | Status tabs with counts. Priority/property filtering. Role-based views (admin/owner/worker/tenant). Status workflow. |
| `src/pages/Settlements.jsx` | ~502 | Most complex page. Live recalculation via `calculateSettlement()`. Override system. Finalization workflow. Recurring expense carry-forward. |
| `src/pages/Settings.jsx` | ~532 | Manager profile. User management (invite, role assign, link to owner/property, permissions). Default percentages. Seed data tool. |

### 2.2 Dashboard Components

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/components/dashboard/PortfolioStats.jsx` | ~61 | Reusable | 4-stat grid: total rent, properties/groups, open maintenance, monthly mgmt fee |
| `src/components/dashboard/QuickActions.jsx` | ~28 | Reusable | 3 nav links (Record Expense, Log Labor, New Settlement). Admin-only. |
| `src/components/dashboard/ReserveHealth.jsx` | ~86 | Reusable | Per-group reserve totals with emergency reserve progress bar |
| `src/components/dashboard/RecentActivity.jsx` | ~115 | Reusable | Merged chronological feed (last 10 across expenses, labor, maintenance, settlements) |
| `src/components/dashboard/PropertyGroupSummary.jsx` | ~96 | Reusable | Group card: units with rent/status, gross rent, monthly expenses, reserves, net distributable |

### 2.3 Property Components

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/components/properties/PropertyGroupCard.jsx` | ~106 | Reusable | Expandable group card with nested unit cards |
| `src/components/properties/PropertyGroupFormDialog.jsx` | ~230 | Reusable | Full group form: name, address, structure type, percentages, insurance |
| `src/components/properties/PropertyUnitCard.jsx` | ~70 | Reusable | Unit display: name, label, garage badge, rent, status pill, tenant |
| `src/components/properties/PropertyUnitFormDialog.jsx` | ~290 | Reusable | Full unit form: all fields including tenant info |
| `src/components/properties/StandalonePropertyDialog.jsx` | ~221 | Reusable | Creates group + property atomically for single-unit properties |

### 2.4 Owner Components

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/components/owners/OwnerCard.jsx` | ~255 | Reusable | Complex card: role badge, linked user status, stakes section, splits section |
| `src/components/owners/OwnerFormDialog.jsx` | ~126 | Reusable | Name, email, phone, role selector |
| `src/components/owners/OwnershipStakeFormDialog.jsx` | ~156 | Reusable | Group selector, ownership % with 100% cap validation |
| `src/components/owners/DistributionSplitFormDialog.jsx` | ~176 | Reusable | To-owner, group selector, split %, reason |

### 2.5 Expense Components

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/components/expenses/ExpenseCard.jsx` | ~116 | Reusable | Mobile card with reconcile toggle, receipt, category badge, recurring icon |
| `src/components/expenses/ExpenseRow.jsx` | ~115 | Reusable | Desktop table row with hover actions, inline reconciliation |
| `src/components/expenses/ExpenseFormDialog.jsx` | ~390 | Reusable | Full form with receipt upload, paid-by, reimbursement, recurring toggle |
| `src/components/expenses/ExpenseFilters.jsx` | ~146 | Reusable | Multi-filter bar: group, category pills, date range, toggles |

### 2.6 Labor Components

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/components/labor/LaborCard.jsx` | ~66 | Reusable | Mobile card (financials hidden in worker mode) |
| `src/components/labor/LaborRow.jsx` | ~76 | Reusable | Desktop table row |
| `src/components/labor/LaborFormDialog.jsx` | ~234 | Reusable | Property, worker, rate, hours, live total, date, description |
| `src/components/labor/LaborFilters.jsx` | ~113 | Reusable | Property, worker, type pills, date range |
| `src/components/labor/LaborStats.jsx` | ~44 | Reusable | Summary stats (hours, cost, avg rate, count) |

### 2.7 Maintenance Components

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/components/maintenance/MaintenanceRequestCard.jsx` | ~187 | Reusable | Priority/status badges, role-aware action buttons, tenant messaging |
| `src/components/maintenance/MaintenanceFormDialog.jsx` | ~286 | Reusable | Full form (simplified for tenant mode) |
| `src/components/maintenance/MaintenanceFilters.jsx` | ~71 | Reusable | Property dropdown, priority pills |
| `src/components/maintenance/MaintenanceStatusTabs.jsx` | ~49 | Reusable | Tab bar with per-status count badges |
| `src/components/maintenance/CompleteRequestDialog.jsx` | ~87 | Reusable | Cost + resolution notes for completing requests |

### 2.8 Settlement Components

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/components/settlements/SettlementCard.jsx` | ~112 | Reusable | Expandable header with month, group, status badge, net amount |
| `src/components/settlements/SettlementWaterfall.jsx` | ~287 | Reusable | **Core financial component.** 7-step numbered waterfall with inline reconciliation, override support, distribution breakdown, owner highlighting |
| `src/components/settlements/NewSettlementDialog.jsx` | ~200 | Reusable | Group + month picker. Duplicate detection. Triggers RecurringExpenseDialog. |
| `src/components/settlements/FinalizeDialog.jsx` | ~50 | Reusable | Confirmation AlertDialog for finalization |
| `src/components/settlements/RecurringExpenseDialog.jsx` | ~154 | Reusable | Checkbox list of previous-month expenses for carry-forward |

### 2.9 Shared Components

| File | Lines | Type | Description |
|------|-------|------|-------------|
| `src/components/shared/EmptyState.jsx` | ~16 | Reusable | Generic: icon, title, description, action slot |
| `src/components/shared/StatCard.jsx` | ~19 | Reusable | Label, value, optional icon, accent mode |
| `src/components/shared/PageHeader.jsx` | ~13 | Reusable | Title, subtitle, actions slot (used by all 8 pages) |
| `src/components/RoleGate.jsx` | ~37 | Reusable | Page access gate via `canAccessPage(role, pageName)` |
| `src/components/UserNotRegisteredError.jsx` | ~32 | Reusable | Full-page error for unregistered users |

### 2.10 Infrastructure

| File | Lines | Description |
|------|-------|-------------|
| `src/Layout.jsx` | ~137 | Sticky header, desktop nav + mobile drawer, role-filtered nav items, dark theme |
| `src/App.jsx` | ~93 | Provider stack: AuthProvider -> QueryClientProvider -> Router -> RoleProvider -> Routes |
| `src/main.jsx` | ~9 | React 18 createRoot |
| `src/pages.config.js` | ~76 | Auto-generated routing config, 8 pages |
| `src/lib/app-params.js` | ~55 | Base44 platform URL params + localStorage |
| `src/lib/query-client.js` | -- | TanStack Query client |
| `src/lib/utils.js` | -- | Tailwind merge utility |
| `src/contexts/RoleContext.jsx` | ~180 | Role resolution, auto-linking, bootstrap admin, permission merging |
| `src/hooks/useRole.js` | ~6 | Context consumer |
| `src/hooks/usePermission.js` | ~12 | Single flag / full permissions |
| `src/hooks/useOwnerGroups.js` | ~30 | Owner-scoped group filtering |
| `src/lib/roleAccess.js` | ~45 | Role -> page access map |
| `src/lib/permissionTemplates.js` | ~100 | 33 permission flags across 4 roles |
| `src/lib/calculateSettlement.js` | ~150 | Settlement waterfall calculation |
| `src/lib/recurringExpenseUtils.js` | ~50 | Recurring expense carry-forward logic |
| `src/lib/seedData.js` | ~80 | Demo data seeder |
| `src/lib/serverApi.js` | ~150 | Client-side API wrappers for 7 server functions |
| `src/api/entities.js` | ~15 | Re-exports 10 entities from Base44 client |
| `src/api/base44Client.js` | ~10 | Base44 SDK client setup |

---

## 3. FEATURE MAP

### 3.1 Fully Built and Working

| Feature | Evidence |
|---------|----------|
| **Property Management** | Full CRUD for groups + units. Structure types, reserve percentages, insurance, tenant tracking. Cascading deletes. |
| **Ownership & Distribution** | Owners, stakes, splits. Ownership % validation per group. Cascading deletes. |
| **Expense Tracking** | Full CRUD with categories, receipts (file upload), recurring flags, paid-by tracking, reimbursement workflow, reconciliation status. Dual-view (table + cards). Rich filtering. |
| **Labor Logging** | Full CRUD with worker types, hourly rates, hours, totals. Worker mode (own entries only, financials hidden). Dual-view. |
| **Maintenance Requests** | Full lifecycle: create -> assign -> in_progress -> complete. Priority levels. Role-scoped views (admin/owner/worker/tenant). Tenant-only creation for linked property. |
| **Settlement Waterfall** | 9-step calculation: gross rent -> expenses -> mgmt fee -> maintenance reserve -> emergency reserve -> labor -> reimbursements -> net distributable -> distributions (with splits). Live recalculation. Override support. Inline reconciliation. Owner highlighting. |
| **Recurring Expense Carry-Forward** | Detects previous-month recurring expenses, offers checkbox selection for carry-forward into new month. |
| **Settlement Finalization** | Draft -> finalize (flips reimbursement status on expenses) -> unfinalize. Unreconciled expense warnings. |
| **Role-Based Access Control** | 4 roles (admin/owner/worker/tenant). 33 permission flags. Server-side enforcement on all writes. Client-side gating on pages and actions. Per-user permission overrides. |
| **Owner-Scoped Data** | Owners see only property groups where they have stakes (client-side via `useOwnerGroups` hook). |
| **User Management** | Invite users, assign roles, link to owner/property, view pending/active status, remove users. |
| **Settings** | Manager profile, default percentages with sample preview, seed data tool. |
| **Dashboard** | Portfolio stats, per-group summaries, reserve health with progress bars, recent activity feed, quick actions. |
| **Responsive Design** | Desktop table + mobile card views for Expenses, Labor. Mobile hamburger nav. `min-h-[44px]` touch targets. |

### 3.2 Stubbed or Partially Built

| Feature | Status |
|---------|--------|
| **Permission-based page derivation** | `deriveVisiblePages()` function exists in `roleAccess.js` but is not wired in. Current page access uses role-name-based map. Noted as Build 19c migration. |

### 3.3 Specced but Not Started

| Feature | Notes |
|---------|-------|
| **Reports / Export** | `can_export_data` permission flag exists but no export UI is built. No Reports page. |
| **Tenant Portal** | Tenants can create maintenance requests but have no dedicated portal view. Currently just a restricted version of the Maintenance page. |

---

## 4. ROLE & PERMISSION SYSTEM

### 4.1 Roles

| Role | Page Access | Data Scope |
|------|-------------|------------|
| `admin` | All 8 pages | All data |
| `owner` | Dashboard, Expenses (read), Maintenance (read), Settlements (read) | Own property groups only (via OwnershipStakes) |
| `worker` | LaborLog, Maintenance | Own labor entries only; assigned maintenance requests |
| `tenant` | Maintenance | Own linked property only |

### 4.2 Permission Flags (33 total)

**Page Access (8):** `can_access_dashboard`, `can_access_properties`, `can_access_owners`, `can_access_expenses`, `can_access_labor_log`, `can_access_maintenance`, `can_access_settlements`, `can_access_settings`

**Data Access (3):** `can_view_all_groups`, `can_view_all_financials`, `can_view_all_maintenance`

**Property & Ownership (6):** `can_create_properties`, `can_edit_properties`, `can_delete_properties`, `can_manage_owners`, `can_manage_stakes`, `can_manage_splits`

**Financial (6):** `can_create_expenses`, `can_edit_expenses`, `can_delete_expenses`, `can_create_settlements`, `can_finalize_settlements`, `can_unfinalize_settlements`

**Labor (3):** `can_create_labor`, `can_edit_all_labor`, `can_view_labor_costs`

**Maintenance (4):** `can_create_maintenance`, `can_edit_maintenance`, `can_assign_maintenance`, `can_complete_maintenance`

**Admin (3):** `can_manage_users`, `can_manage_settings`, `can_export_data`

### 4.3 Server-Side Auth Pattern

Every server function:
1. Calls `base44.auth.me()` -> 401 if not authenticated
2. Loads AppProfile singleton, parses `user_roles` JSON
3. Matches caller by `user_id` or `email` in roles array
4. Merges `PERMISSION_TEMPLATES[role]` + per-user `permission_overrides`
5. Checks required permission flag for the requested action
6. Executes via `base44.asServiceRole.entities.*` (service role, not user role)

**Important:** Permission logic (templates + resolver) is **duplicated** across all 7 server function files because Base44 Deno runtime doesn't support cross-file imports.

### 4.4 Client-Side Auth Pattern

- `RoleProvider` context resolves current user's role + permissions on mount
- Auto-links unlinked role entries (matches by email, sets user_id)
- Bootstrap: first user with no roles gets auto-assigned `admin`
- `RoleGate` wraps each page, checks `canAccessPage(role, pageName)`
- `usePermission(flag)` hook gates individual buttons/actions
- `useOwnerGroups()` hook filters data for owner-role users

---

## 5. DATA FLOW

### 5.1 Entry to Settlement Flow

```
Property Setup:
  PropertyGroups (with reserve %s) -> Properties (with monthly_rent) -> Owners -> OwnershipStakes -> DistributionSplits

Monthly Operations:
  Expenses (categorized, receipted, recurring-flagged, paid-by tracked)
  LaborEntries (per-property, per-worker, hourly)
  MaintenanceRequests (lifecycle tracked, cost on completion)

Settlement:
  1. Select group + month
  2. Carry forward recurring expenses (RecurringExpenseDialog)
  3. calculateSettlement() runs waterfall
  4. Draft saved with calculated values + JSON distributions
  5. Admin reviews (can override rent/expenses/labor, reconcile expenses)
  6. Finalize -> flips expense reimbursement statuses
```

### 5.2 Settlement Waterfall Calculation

```
  Gross Rent = SUM(properties.monthly_rent) where group_id matches
- Fixed Expenses = SUM(expenses.amount) where group_id + month match
- Management Fee = gross_rent * (management_fee_pct / 100)
- Maintenance Reserve = gross_rent * (maintenance_reserve_pct / 100)
- Emergency Reserve = gross_rent * (emergency_reserve_pct / 100)
- Labor Costs = SUM(labor.total) where property in group + month match
- Manager Reimbursements = SUM(expenses.amount) where paid_by="manager" + status in (pending, included_in_settlement)
= Net Distributable

Distribution:
  For each OwnershipStake: gross_amount = net_distributable * (ownership_pct / 100)
  For each DistributionSplit: transfer split_pct of from_owner's gross to to_owner
  Manager reimbursement added back to manager owner's net_amount

All amounts rounded to 2 decimal places.
Distributions stored as JSON-stringified array on MonthlySettlements.
```

### 5.3 Recurring Expense Logic

- `getPreviousMonth(monthStr)` -- handles year boundary
- `getRecurringCandidates(expenses, groupId, monthStr)` -- finds previous-month expenses, de-dupes by `category|amount|property_id`, marks `is_recurring=true` as pre-checked

---

## 6. PATTERNS THAT MAP TO WORKSPACE ENGINE

### 6.1 Workspace Engine Summary (community-node)

The workspace engine in `community-node` has 4 types: `business`, `team`, `finance`, `fieldservice`.

**Registry:** `src/config/workspaceTypes.js` -- each type defines `id`, `label`, `icon`, `description`, `roles`, `tabs[]`, `createWizard`, `available`.

**Host:** `src/pages/BusinessDashboard.jsx` (~1000 lines) -- monolithic state machine with per-type rendering blocks.

**Pattern:** Config-driven tabs -> `getProps(scope)` -> `<TabComponent {...props} />`. No workspace context/provider -- all state in `BusinessDashboard.jsx` via `useState`.

### 6.2 Direct Port Mappings

| Property Pulse | Workspace Engine Equivalent | Port Strategy |
|----------------|----------------------------|---------------|
| `PropertyGroups` (root entity) | Analogous to `FieldServiceProfile` or `FinancialProfile` | Property Pulse needs a root `PropertyProfile` entity scoped by `user_id` |
| 8 pages with sidebar nav | 5-6 tabs in workspace tab bar | Convert pages to tabs |
| `RoleContext` + `RoleGate` | Workspace `roles` config in `WORKSPACE_TYPES` | Map PP roles to workspace roles object |
| `AppProfile` singleton | Root profile entity per workspace | Move user_roles into workspace role system |
| Server function auth | Same Base44 server function pattern | Keep server functions, scope by workspace profile |
| `calculateSettlement.js` | Analogous to Finance workspace calculations | Port directly, lives in workspace component tree |
| `useOwnerGroups` hook | N/A in current workspaces | Port as workspace-specific hook |

### 6.3 Property Pulse -> Workspace Tab Mapping

| PP Page | Suggested Tab | Notes |
|---------|--------------|-------|
| Dashboard | `home` | Standard workspace home tab |
| Properties | `properties` | Property + unit management |
| Owners | `owners` | Ownership + stakes + splits |
| Expenses | `expenses` | Could merge with a Finance-like activity tab |
| LaborLog | `labor` | Or merge into a "Log" tab like Field Service |
| Maintenance | `maintenance` | Status workflow + role-based views |
| Settlements | `settlements` | Waterfall + finalization |
| Settings | `settings` | Standard workspace settings tab |

### 6.4 What Ports Directly

- **Tab components:** All 8 pages convert to tab components with minor refactoring (remove `RoleGate` wrapper, receive props via `getProps(scope)`)
- **Reusable components:** All ~35 feature components (cards, forms, filters, dialogs) port unchanged
- **Calculation logic:** `calculateSettlement.js` and `recurringExpenseUtils.js` port as-is
- **Server functions:** All 7 server functions port with minor scope changes
- **Permission system:** 33 flags + templates + per-user overrides can be stored in the workspace profile

### 6.5 What Needs Adaptation

| Area | Current PP Pattern | Required Workspace Pattern | Effort |
|------|-------------------|---------------------------|--------|
| **Root entity** | `AppProfile` singleton | Needs `PropertyProfile` per workspace with `user_id` scoping | Medium |
| **User roles** | JSON blob in `AppProfile.user_roles` | Workspace engine has a `roles` config object; PP needs member management within the workspace profile | Medium |
| **Navigation** | Sidebar layout with 8 pages | Tab bar with `getProps(scope)` | Low |
| **Data scoping** | Standalone app, all data is "in the app" | Must scope all entities to `profile_id` (workspace root) | Medium |
| **Auth bootstrap** | First user auto-admin | Workspace owner is creator | Low |
| **Onboarding** | Settings page with seed data | Needs `PropertyPulseOnboarding` wizard (3-4 steps) | Medium |
| **Multi-workspace** | Not supported (singleton app) | Multiple property portfolios per user | Medium |
| **Owner portal** | Owner role sees filtered data in same UI | May need a separate "member view" like Team's parent/player switcher | Low-Medium |

### 6.6 Similarities to Existing Workspaces

| PP Feature | Closest Workspace Analog |
|------------|-------------------------|
| Settlement waterfall | Finance workspace "Enough Number" calculation (income - obligations = surplus) |
| Labor entries per property | Field Service daily log entries per project |
| Maintenance request lifecycle | Field Service project phase tracking |
| Owner/stake/split model | **No direct analog** -- unique to property management |
| Recurring expense carry-forward | Finance recurring transactions |
| Worker-scoped labor | Field Service worker management with individual rates |
| Reserve tracking with targets | Finance debt tracking with balance targets |
| Receipt upload | Field Service photo gallery |

---

## 7. WORKSPACE ENGINE REFERENCE

### 7.1 workspaceTypes.js Structure

**File:** `community-node/src/config/workspaceTypes.js`

```
WORKSPACE_TYPES = {
  business: { id, label, icon, description, archetypeSupport: true, getTabs(workspace), roles, createWizard: null, networkAffinity: true, available: true },
  team:     { id, label, icon, description, archetypeSupport: false, tabs[], roles, createWizard: 'TeamOnboarding', networkAffinity: true, available: true },
  finance:  { id, label, icon, description, archetypeSupport: false, tabs[], roles, createWizard: 'FinanceOnboarding', networkAffinity: false, available: true },
  fieldservice: { id, label, icon, description, archetypeSupport: false, tabs[], roles, createWizard: 'FieldServiceOnboarding', networkAffinity: false, available: true },
}
```

### 7.2 Tab Config Object Shape

```js
{
  id: string,              // 'home', 'settings', etc.
  label: string,           // Display text
  icon: LucideComponent,   // Imported React component (not string)
  component: ReactComponent,
  getProps: (scope) => Object,
}
```

### 7.3 Onboarding Wizard Pattern

1. **Page wrapper:** Thin component in `src/pages/` that imports and renders the wizard
2. **Route registration:** Added to `src/pages.config.js`
3. **Type picker routing:** `handleChoose` in `BusinessDashboard.jsx` navigates to wizard page
4. **Wizard structure:** Full-screen dark layout, step indicator (dots), back/next buttons, `useMutation` for entity creation
5. **On success:** Navigate to `BusinessDashboard?{type}={id}` with toast

### 7.4 Settings Pattern

All workspace settings follow:
- Collapsible accordion sections (`Section` component with `ChevronDown`/`ChevronRight`)
- `useMutation` with `invalidateQueries` on success
- `toast.success()`/`toast.error()` feedback
- Delete/archive workspace with `AlertDialog` type-to-confirm
- Standard dark theme: `bg-slate-900` cards, `border-slate-800`, `text-amber-500` accents

### 7.5 How to Register a New Workspace Type

1. **Add to `WORKSPACE_TYPES`** in `workspaceTypes.js` with id, label, icon, tabs, roles, createWizard
2. **Create tab components** in `src/components/{type}/`
3. **Create onboarding wizard** component + thin page wrapper
4. **Register page** in `pages.config.js`
5. **Wire into `BusinessDashboard.jsx`:**
   - Add `useState` for selection
   - Add root entity query
   - Add to loading check, `hasAnyWorkspace`, icon map
   - Add type picker routing
   - Add URL param handling
   - Add landing grid card rendering
   - Add workspace rendering block (header + tab bar + content)
   - Add to all "clear selections" handlers (~10+ locations)
6. **Create Base44 entities** on the platform

### 7.6 Architecture Notes

- `BusinessDashboard.jsx` is a monolith (~1000 lines) that hosts all 4 workspace types
- Tab rendering JSX is duplicated 4 times (once per type block)
- No workspace context/provider -- state machine via `useState`
- Entity access is direct `base44.entities.*` from components (no abstraction layer)
- Archetype system exists for Business type only (6 archetypes, all map to same tabs currently)

---

## 8. PORTING CHECKLIST (Summary)

### New Files Needed

- [ ] `src/config/workspaceTypes.js` -- Add `propertypulse` entry
- [ ] `src/components/propertypulse/PropertyPulseHome.jsx` -- Dashboard tab
- [ ] `src/components/propertypulse/PropertyPulseProperties.jsx` -- Properties tab
- [ ] `src/components/propertypulse/PropertyPulseOwners.jsx` -- Owners tab
- [ ] `src/components/propertypulse/PropertyPulseExpenses.jsx` -- Expenses tab
- [ ] `src/components/propertypulse/PropertyPulseLabor.jsx` -- Labor tab
- [ ] `src/components/propertypulse/PropertyPulseMaintenance.jsx` -- Maintenance tab
- [ ] `src/components/propertypulse/PropertyPulseSettlements.jsx` -- Settlements tab
- [ ] `src/components/propertypulse/PropertyPulseSettings.jsx` -- Settings tab
- [ ] `src/components/propertypulse/PropertyPulseOnboarding.jsx` -- Onboarding wizard
- [ ] `src/pages/PropertyPulseOnboarding.jsx` -- Page wrapper
- [ ] All ~35 reusable components (cards, forms, filters, dialogs) ported into `src/components/propertypulse/`
- [ ] Calculation utils (`calculateSettlement.js`, `recurringExpenseUtils.js`)
- [ ] Server API wrapper (`serverApi.js`)
- [ ] Permission templates + role resolution

### Files to Modify

- [ ] `src/config/workspaceTypes.js` -- Add new type entry
- [ ] `src/pages.config.js` -- Register onboarding page
- [ ] `src/pages/BusinessDashboard.jsx` -- Wire in new workspace type (~10 integration points)

### Base44 Platform Changes

- [ ] Create `PropertyProfile` entity (root, scoped by `user_id`)
- [ ] Create or migrate: `PPPropertyGroup`, `PPProperty`, `PPOwner`, `PPOwnershipStake`, `PPDistributionSplit`, `PPExpense`, `PPLaborEntry`, `PPMaintenanceRequest`, `PPMonthlySettlement`
- [ ] Create 7 server functions (or adapt existing)

### Key Decisions Required

1. **Entity namespacing:** Prefix PP entities (e.g., `PP_PropertyGroup`) or use workspace-scoped naming?
2. **User roles:** Keep JSON-in-profile pattern or integrate with workspace member system?
3. **Multi-portfolio:** Support multiple property portfolios (multiple PropertyProfiles) per user?
4. **Owner portal:** Separate tab view for owners, or keep the filtered admin view?
5. **Cross-workspace linking:** Link to Finance workspace for accounting integration? (Field Service has `linked_finance_workspace_id` precedent)
