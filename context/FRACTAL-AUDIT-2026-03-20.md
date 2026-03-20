# Full Platform Fractal Audit — 2026-03-20

> Read-only audit of the entire community-node codebase.
> If we build in fractals, errors live in fractals. Fix the part, fix the whole.
> Generated: 2026-03-19 evening session

---

### Foundation Health Score: 7/10

The foundation is solid but not square. Entity access is consistent (96%). Error handling is strong (96%). Server functions are clean. But the fractal breaks in several places: 15 components still use useEffect for data fetching instead of React Query, 57 stale language references remain, currency/phone formatting is inconsistent, and there's no frontend auth gating on protected routes. The Property Management module is the most out-of-pattern area — it uses useEffect fetching exclusively and has the most formatting violations. The good news: the patterns that work (entity access, server functions, workspace guides) work everywhere. The fixes are mechanical, not architectural.

---

### Audit 1: Entity Access — 9/10

**Dominant pattern:** `import { base44 } from '@/api/base44Client'` then `base44.entities.EntityName.method()`

**Total files accessing entities:** 111
**Following dominant pattern:** 107 (96.4%)

**63 entities** in active use across the codebase.

**Deviations (4 files — all minor style variations, not different access paths):**

| File | Line | Pattern | Severity |
|------|------|---------|----------|
| src/hooks/useConfig.js | 47 | Aliases `base44.entities.AdminSettings` to local const | Low |
| src/hooks/useAccessWindows.js | 15 | Aliases `base44.entities.AccessWindow` to local const | Low |
| src/components/admin/FeedbackReview.jsx | 7 | Aliases `base44.entities.FeedbackLog` to module-level const | Low |
| src/components/admin/workspaces/AllWorkspacesPanel.jsx | 37 | Dynamic bracket notation `base44.entities[entityName].list()` | Justified |

**Note:** No `src/api/entities.js` re-export layer exists. All 111 files import directly from `base44Client`. The 3 alias deviations still source from `base44.entities` — purely a style variation. AllWorkspacesPanel's bracket notation is legitimate dynamic iteration.

---

### Audit 2: Error Handling — 9/10

**Total entity operations:** 510
**With try/catch or mutation onError:** ~340
**With useQuery (implicit error state):** ~152
**With toast.error() on failure:** ~149
**Silent failures (no handling):** 18 (3.5%)

**Top 10 Critical Unhandled Operations:**

| # | File:Line | Operation | Risk |
|---|-----------|-----------|------|
| 1 | pages/BusinessOnboarding.jsx:94 | `Business.create()` — no onError, user stuck on form | HIGH |
| 2 | pages/ClientPortal.jsx:242 | `FSEstimate.update()` — e-sign fails silently | HIGH |
| 3 | pages/ClientPortal.jsx:366 | `FSDocument.update()` — e-sign fails silently | HIGH |
| 4 | components/dashboard/IdeasBoard.jsx:498 | `Idea.update()` — admin status change, no try/catch | MED |
| 5 | components/dashboard/IdeasBoard.jsx:507 | `Idea.update()` — author edit, no try/catch | MED |
| 6 | components/dashboard/DashboardHome.jsx:37 | `Business.update()` — guide dismiss, no onError | LOW |
| 7 | components/propertymgmt/PropertyManagementHome.jsx:191 | `PMPropertyProfile.update()` — guide dismiss | LOW |
| 8 | components/fieldservice/FieldServiceHome.jsx:151 | `FieldServiceProfile.update()` — guide dismiss | LOW |
| 9 | components/finance/FinanceHome.jsx:249 | `FinancialProfile.update()` — guide dismiss | LOW |
| 10 | components/team/TeamHome.jsx:177 | `Team.update()` — guide dismiss | LOW |

**Pattern:** Guide dismiss mutations (items 6-10) are a fractal error — same missing onError across all 5 workspace homes.

---

### Audit 3: Query Patterns — 7/10

**React Query:**
- useQuery: 89 components (213 total calls)
- useMutation: 56 components (138 total calls)
- Query key convention: **INCONSISTENT** — ~75% kebab-case (`['fs-projects', id]`), ~25% camelCase (`['currentUser']`). No centralized key factory.

**useEffect data fetching:** 15 components

| File | Entities Fetched |
|------|-----------------|
| components/propertymgmt/PropertyManagementPeople.jsx:45 | PMProperty, PMPropertyGroup, PMGuest |
| components/propertymgmt/PropertyManagementListings.jsx:40 | PMListing, PMProperty, PMPropertyGroup |
| components/propertymgmt/PropertyManagementSettlements.jsx:46 | PMSettlement + 5 more entities |
| components/propertymgmt/PropertyManagementMaintenance.jsx:44 | PMMaintenanceRequest + 3 more |
| components/propertymgmt/PropertyManagementFinances.jsx:58 | PMExpense + 7 more entities |
| components/propertymgmt/PropertyManagementOwners.jsx:46 | PMOwner + 3 more |
| components/propertymgmt/PropertyManagementProperties.jsx:51 | PMPropertyGroup, PMProperty |
| components/admin/AdminSidebar.jsx:90 | FeedbackLog |
| components/admin/FeedbackReview.jsx:25 | FeedbackLog |
| components/fieldservice/FieldServiceReport.jsx:43 | FSDailyLog + 5 more |
| components/team/StudyMode.jsx:54 | PlayAssignment |
| hooks/useAccessWindows.js:36 | AccessWindow |
| hooks/useBusinessRevenue.js:65 | Event, JoyCoinsRedemption |
| hooks/usePlayerStats.js:71 | PlayerStats, QuizAttempt |
| hooks/useQuiz.js:887 | QuizAttempt |

**The entire Property Management module (7 components) is the largest pocket.** All 7 use the identical anti-pattern: useState + setLoading + async function inside useEffect + manual try/catch.

---

### Audit 4: Formatting — 6/10

**Currency:**
- Properly formatted (fmt/Intl.NumberFormat): ~213 instances
- Unformatted/manual ($+toFixed): **15 violations**

| File:Line | Issue |
|-----------|-------|
| components/dashboard/DashboardHome.jsx:90,110 | `$${Number(x).toFixed(2)}` |
| components/events/EventDetailModal.jsx:24,29 | `$${lowest.toFixed(2)}` |
| components/events/EventCard.jsx:15,20 | `$${lowest.toFixed(2)}` |
| components/admin/JoyCoinsAdminPanel.jsx:148,151,152,186,200,206,227 | Multiple `$${x.toFixed(2)}` |
| components/propertymgmt/MaintenanceCompleteDialog.jsx:246 | `$${actualCost}` |
| components/events/FilterModal.jsx:109 | `${x}+` manual |

**Phone:**
- Properly formatted (formatPhone): ~26 instances
- Unformatted display: **15 violations**
- Unformatted input (no format-on-change): **7 violations**

| File:Line | Issue |
|-----------|-------|
| pages/BusinessProfile.jsx:464,558 | Raw {business.phone}, {loc.phone} |
| pages/BusinessOnboarding.jsx:410 | Raw {formData.phone} in review |
| components/fieldservice/FieldServiceEstimates.jsx:325,514 | Raw {profile.phone} |
| components/fieldservice/FieldServiceClientPortal.jsx:179 | Raw {profile.phone} |
| components/fieldservice/FieldServiceReport.jsx:184 | Raw {profile.phone} |
| components/fieldservice/FieldServiceProjects.jsx:832 | Raw {clientPhone} |
| components/fieldservice/FieldServiceClientDetail.jsx:302 | Raw {client.phone} |
| components/events/EventDetailModal.jsx:645 | Raw {event.organizer_phone} |
| components/dashboard/BusinessSettings.jsx:800 | Raw {business.phone} |
| components/admin/AdminUsersSection.jsx:251 | Raw {selectedUser.phone} |
| components/propertymgmt/TenantList.jsx:77 | Raw {t.tenant_phone} |
| components/propertymgmt/OwnerCard.jsx:61 | Raw {owner.phone} |
| components/propertymgmt/ListingPreview.jsx:259 | Raw {listing.contact_phone} |
| PM inputs (7 files) | Raw phone inputs without format-on-change |

**DRY concern:** No centralized `fmt()` or `formatPhone()` utility. Every file defines its own local copy (~30+ duplicates). Same correct implementation, but a maintenance risk.

---

### Audit 5: Component Architecture — 6/10

**Nested components:** 2

| File:Line | Inner Component | Risk |
|-----------|----------------|------|
| components/propertymgmt/MaintenancePhotoGrid.jsx:27 | PhotoThumbnail inside MaintenancePhotoGrid | HIGH (rendered in .map loop) |
| components/search/FilterBar.jsx:34 | FilterContent inside FilterBar | LOW |

**Unused props:** 14 instances

- `isOwner` passed to 7 FS tab components, used by **0**
- `workerRole` passed to 7 FS tab components, used by **0**
- `features` passed to 7 FS tab components, used by **3** (Projects, Estimates, People)

These props exist for future view-gating (DEC-073) but are currently dead weight in 4 of 7 tabs.

**Inline style pattern:** `fontFamily: 'Georgia, serif'` appears **14 times** across Home.jsx, UserOnboarding.jsx, Layout.jsx, TeamHome.jsx, WorkspaceGuide.jsx. Should be a single Tailwind `font-display` utility class.

**Large components (500+ lines):** 38 files

| File | Lines | Split Priority |
|------|-------|---------------|
| components/admin/BusinessEditDrawer.jsx | 1748 | HIGH |
| components/dashboard/EventEditor.jsx | 1690 | HIGH |
| components/fieldservice/FieldServiceProjects.jsx | 1532 | HIGH |
| components/fieldservice/FieldServiceEstimates.jsx | 1475 | HIGH |
| pages/BusinessDashboard.jsx | 1296 | MED |
| components/finance/FinanceImport.jsx | 1142 | MED |
| components/finance/FinanceSettings.jsx | 1037 | MED |
| components/fieldservice/FieldServiceLog.jsx | 1031 | MED |
| *(30 more files between 500-1000 lines)* | | LOW |

---

### Audit 6: Server Functions — 8/10

**Total server functions:** 20
**asServiceRole correct:** 19/20
**Pattern violations:** 2

| Issue | File:Line | Severity |
|-------|-----------|----------|
| Uses `base44.entities` instead of `base44.asServiceRole.entities` | functions/setJoyCoinPin.ts:34,37,41 | HIGH |
| `.list()` instead of `.filter()` (documented as intentional) | functions/updateAdminSettings.ts:59 | LOW |

**Sensitive data exposure (4 functions):**

| Function | Issue |
|----------|-------|
| handleEventCancellation.ts:59,105 | console.log leaks user_id and user_email |
| searchHubMember.ts:113 | Returns user.email to external spoke callers |
| sendWebhookToSpoke.ts:81 | Forwards raw remote response body on failure |
| updateBusiness.ts:214-351 | 10+ console.log statements with full request payloads |

**Otherwise:** All 20 functions use Response.json consistently. Parameter validation is solid across the board. Zero remaining `.filter().list()` patterns.

---

### Audit 7: Gold Standard — 6/10

**Light background violations:** 38 instances

| Category | Count | Files |
|----------|-------|-------|
| PageNotFound (full light theme) | 4 | src/lib/PageNotFound.jsx |
| ClientPortal (client-facing — likely intentional) | 14 | src/pages/ClientPortal.jsx |
| ListingPreview (print — uses gray-* not slate-*) | 3 | src/components/propertymgmt/ListingPreview.jsx |
| FS Documents/Estimates (print views) | 7 | FieldServiceDocuments.jsx, FieldServiceEstimates.jsx |
| FS Client Portal (client-facing) | 5 | FieldServiceClientPortal.jsx |
| SignatureCanvas/SigningFlow (light-mode conditional) | 5 | SignatureCanvas.jsx, SigningFlow.jsx |

**True violation:** PageNotFound.jsx — this is a platform page users see, not a print/client view. Should be dark theme.

**Palette violations:** Extensive — status colors (emerald, blue, red, purple, sky) used across nearly every feature module for semantic indicators. This is standard UX but technically outside the strict Gold Standard "NEVER: bg-blue-*, bg-green-*" rule. **Policy decision needed:** Are semantic status indicators exempt from the Gold Standard?

**Hardcoded hex colors:** ~50 instances — nearly all justified (canvas/SVG rendering for flag football, brand color defaults `#f59e0b`, print stylesheets, dev tooling).

**Mobile responsiveness:** Generally solid. One real issue: `FieldServiceEstimates.jsx:408` — `min-w-[480px]` table forces horizontal scroll on small screens.

---

### Audit 8: Navigation — 8/10

**Total routes:** 36
**Dead routes:** 0
**Orphan pages:** 0

**Issues:**

| Issue | Severity |
|-------|----------|
| **No frontend auth guards.** No ProtectedRoute wrapper exists. Protected pages render for unauthenticated users and rely solely on backend API calls failing — producing broken/empty UI, not clean redirects. | HIGH |
| **Duplicate route for JoinTeam.** Registered both in pages.config.js (`/JoinTeam`) and as explicit route (`/join/:inviteCode`). The `/JoinTeam` path is likely dead weight. | LOW |
| **Inconsistent per-page auth.** Only JoinTeam and JoinFieldService show a "sign in" prompt. MyLane, Admin, Settings, etc. show broken/empty states when unauthenticated. | MED |

**What works well:** All 31 page files are routed. All imports resolve. ClientPortal correctly skips LayoutWrapper. Root route properly redirects authenticated users to MyLane.

---

### Audit 9: Workspace Consistency — 7/10

**Workspace Matrix:**

| Workspace | Guide | useWorkspaceInit | features prop | guide_dismissed |
|-----------|:-----:|:----------------:|:-------------:|:---------------:|
| business | ✅ | ❌ | ❌ | ✅ |
| field_service | ✅ | ❌ | ✅ | ✅ |
| team | ✅ | ❌ | ❌ | ✅ |
| finance | ✅ | ❌ | ❌ | ✅ |
| property_management | ✅ | ❌ | ❌ | ✅ |

**Key findings:**

| Finding | Severity |
|---------|----------|
| **useWorkspaceInit hook is dead code.** Defined in src/hooks/useWorkspaceInit.js, imported by zero files. | MED |
| **features prop only wired for field_service.** Other 4 workspace types don't pass features from workspaceTypes.js. | LOW (future-proofing) |
| **property_management passes entire scope as props** instead of named props like other workspaces. | LOW |
| **Team guide only shows for coaches** (intentional but inconsistent pattern). | LOW |
| **workspaceTypes.js uses "fieldservice" (no underscore)** vs workspaceGuides.js uses "field_service". Works at runtime but naming mismatch. | LOW |

**Shared patterns (strong):** All 5 workspaces use identical WorkspaceGuide + guide_dismissed + smart completion + onStepClick patterns.

---

### Audit 10: Garden Language — 7/10

**Total stale references:** 57

| Category | Count | Status |
|----------|-------|--------|
| "Ideas Board" → "Shaping the Garden" | 0 | ✅ Complete |
| Old status labels → Garden labels | 0 | ✅ Complete |
| "Punch Pass" → "Joy Coins" | 0 | ✅ Complete |
| **"Enough Number" → "Monthly Target"** | **14** | ❌ Needs fix |
| **"workspace" → garden language (user-facing)** | **33** | ❌ Needs fix |
| "workspace" (admin panel — lower priority) | 10 | ⚠️ Optional |

**"Enough Number" (14 instances — 3 files + 1 config):**

| File | Lines | Count |
|------|-------|-------|
| components/finance/FinanceHome.jsx | 310, 321, 373 | 3 |
| components/finance/FinanceSettings.jsx | 380, 810, 848, 860, 1010 | 5 |
| components/finance/FinanceOnboarding.jsx | 434, 497, 542, 638 | 4 |
| config/workspaceGuides.js | 151, 169 | 2 |

**"workspace" in user-facing copy (33 instances — 7 files):**

| File | Count | Examples |
|------|-------|---------|
| components/propertymgmt/PropertyManagementOnboarding.jsx | 7 | "Create a Property Management Workspace" |
| components/propertymgmt/PropertyManagementSettings.jsx | 8 | "Workspace name", "Delete Workspace?" |
| components/fieldservice/FieldServiceOnboarding.jsx | 5 | "Create a Field Service Workspace" |
| components/finance/FinanceOnboarding.jsx | 5 | "Create a Finance Workspace" |
| pages/JoinFieldService.jsx | 4 | "Join this workspace" |
| pages/BusinessDashboard.jsx | 2 | "Your Workspaces", "My Workspaces" |
| config/workspaceGuides.js | 2 | "Configure your workspace" |

---

## Priority Fix List (Ordered by Foundation Impact)

### Critical (Foundation-level — breaks the fractal)

1. **Frontend auth guards** — No ProtectedRoute wrapper. Protected pages show broken states to unauthenticated users. Need a route-level gate that redirects to login/Home. *(Audit 8)*

2. **Business.create() silent failure** — BusinessOnboarding.jsx:94 has no onError. User gets stuck on onboarding if creation fails. *(Audit 2)*

3. **E-sign silent failures** — ClientPortal.jsx:242,366. Client signature submissions fail silently on both estimates and documents. Business-critical flow with zero error feedback. *(Audit 2)*

4. **setJoyCoinPin.ts uses wrong SDK pattern** — Uses `base44.entities` instead of `base44.asServiceRole.entities`. Could silently fail if entity permissions are restrictive. *(Audit 6)*

### High (Pattern consistency — fractal errors)

5. **"Enough Number" → "Monthly Target"** — 14 user-facing strings across 4 files. Mechanical find-and-replace. *(Audit 10)*

6. **Property Management useEffect → React Query migration** — 7 components all using the same anti-pattern. Biggest pocket of non-standard data fetching. *(Audit 3)*

7. **Currency formatting violations** — 15 instances of `$${x.toFixed(2)}` instead of `fmt()`. Concentrated in DashboardHome, EventCard, EventDetailModal, JoyCoinsAdminPanel. *(Audit 4)*

8. **Phone display formatting** — 15 raw phone displays + 7 raw phone inputs (mostly PM module). *(Audit 4)*

9. **Server function console.log cleanup** — updateBusiness.ts has 10+ debug logs with full payloads. handleEventCancellation.ts leaks user_id/email. *(Audit 6)*

10. **Guide dismiss onError** — 5 workspace Home components all missing onError on guide_dismissed mutation. Fractal error — same pattern, same gap, 5 instances. *(Audit 2)*

### Medium (Code quality)

11. **"workspace" → garden language** — 33 user-facing strings across 7 files. Mechanical replacement (workspace → space). *(Audit 10)*

12. **PageNotFound.jsx light theme** — Full light background on a platform page. Should be dark theme. *(Audit 7)*

13. **Centralize fmt() and formatPhone()** — ~30+ files define their own local copies. Extract to `src/utils/format.js`. *(Audit 4)*

14. **fontFamily: 'Georgia, serif' → Tailwind utility** — 14 inline style instances. Add `font-display` to tailwind.config.js. *(Audit 5)*

15. **useWorkspaceInit.js is dead code** — Hook exists but zero files import it. Either wire it in or remove it. *(Audit 9)*

16. **Nested component: MaintenancePhotoGrid.jsx:27** — PhotoThumbnail defined inside render, used in .map(). Move to module scope. *(Audit 5)*

17. **searchHubMember.ts returns user.email** — External spoke callers receive raw member emails. Consider masking. *(Audit 6)*

### Low (Polish)

18. **Duplicate JoinTeam route** — Remove `/JoinTeam` from pages.config.js (keep `/join/:inviteCode`). *(Audit 8)*

19. **ListingPreview uses gray-* instead of slate-*** — Even for print, should use consistent Tailwind palette. *(Audit 7)*

20. **Unused props (isOwner/workerRole)** — 14 instances of props passed but not consumed. Future view-gating seeds — keep or clean up per DEC-073 plans. *(Audit 5)*

21. **workspaceTypes.js "fieldservice" vs workspaceGuides.js "field_service"** — Naming inconsistency between config files. *(Audit 9)*

22. **Admin panel "workspace" terminology** — 10 instances. Lower priority since users don't see admin panel. *(Audit 10)*

23. **Query key standardization** — No centralized key factory. 75/25 kebab/camelCase split. *(Audit 3)*

---

## Estimated Fix Effort

**Prompt 1: Critical Auth + Error Handling** (~45 min)
- Add ProtectedRoute wrapper + wire into App.jsx
- Add onError to BusinessOnboarding, ClientPortal e-sign mutations
- Fix setJoyCoinPin.ts to use asServiceRole
- Add onError to 5 guide dismiss mutations

**Prompt 2: Garden Language Sweep** (~20 min)
- "Enough Number" → "Monthly Target" (14 strings, 4 files)
- "workspace" → "space" in user-facing copy (33 strings, 7 files)

**Prompt 3: Formatting Consistency** (~30 min)
- Extract fmt() and formatPhone() to src/utils/format.js
- Fix 15 currency violations
- Fix 15 phone display violations + 7 phone input violations

**Prompt 4: PM React Query Migration** (~60 min)
- Migrate 7 PropertyManagement components from useEffect to useQuery
- Establish query key pattern for PM entities

**Prompt 5: Server Function Cleanup** (~15 min)
- Remove debug console.log from updateBusiness.ts
- Remove user_id/email logs from handleEventCancellation.ts
- Review searchHubMember.ts email exposure

**Prompt 6: Component Architecture Polish** (~30 min)
- Fix PageNotFound.jsx to dark theme
- Move PhotoThumbnail to module scope
- Add font-display to tailwind.config.js, replace 14 inline styles
- Remove or wire useWorkspaceInit.js

**Prompt 7: Large Component Splits** (~90 min per file, ongoing)
- BusinessEditDrawer.jsx (1748 lines)
- EventEditor.jsx (1690 lines)
- FieldServiceProjects.jsx (1532 lines)
- FieldServiceEstimates.jsx (1475 lines)

---

*This audit is a snapshot. The fractal principle says: fix the pattern, not just the instance. Each prompt above targets a pattern, not individual bugs.*
