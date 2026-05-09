# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-05-09 (Saturday afternoon ship-it — Phase 1.0 commit 1 shipped + verified; commit 1.5 spec-ratified, build deferred on KI #28; commit 2 blocked on KI #28; drill-through Seedlings A+B closed; DEC-218/219/220 ratified; migration discussion opened)

## Current Focus

**Phase 1.0 commit 1 shipped + production-verified.** Line-item attribution on FSPayment + per-line rollup view on Project Detail Financial Ledger + `projectSpent` semantic update (now includes settled FSPayment(paid)) + soft-delete schema across all four cost-tracking entities (FSPayment, FSMaterialEntry, FSLaborEntry, FSDailyLog). Commit `04162a8` shipped at ~14:47 PT (~13 min Hyphae build wallclock vs 3.5-5h estimate — calibration data point #71). Doron verified working in production: LineItemPicker visible on Sub Payment + Client Payment forms; per-line rollup renders Estimated / Billed / Cost / Variance per line + Unallocated row at bottom; Spent tile gains "Materials + labor + sub payments" caption.

**Phase 1.0 commit 1.5 spec-ratified, build DEFERRED to next session.** Spec at `0dbe54e` after patches 002/003/004/005. Material/Labor LineItemPicker + write-path additions + per-line rollup view expansion (Cost column to include attributed FSMaterialEntry + FSLaborEntry). Schema gate (FSMaterialEntry.line_item_id + FSLaborEntry.line_item_id) FAILED at 16:11 PT with timeout/error (Request ID `0432acde-c8e7-42d4-b92d-8d5947f6fb3c`); both writes rolled back per Doron's entity browser verification. Base44 schema agent unhealthy. Build prompt + Base44 prompt at `base44-prompts/PHASE-1-0-COMMIT-1-5-MATERIAL-LABOR-ATTRIBUTION.md` ready for retry when Base44 recovers.

**Phase 1.0 commit 2 BLOCKED on KI #28.** Edit/delete on all four cost-tracking entities + cleared-payment immutability + Reverse minimum-viable + cascade-delete server function. Spec ratified (LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL §13 + §14 in Option Z phasing per patch 002). Build cannot ship until: (a) Base44 platform recovers (Security panel loads), (b) Gate 2 (`rls.update` removal on all four cost-tracking entities) applies cleanly. KI #28 captures the blocker.

## Active Architecture

### Phase 1.0 commit 1 (shipped 2026-05-09 ~14:47 PT, production-verified)

- **`useContractLineItems(projectId)` hook** at `src/hooks/useContractLineItems.js` — chronological union of estimate + signed/accepted CO line items. Each item carries `_origin / _co_number / _origin_label` metadata for display. Warns in dev when line items missing `id` per spec §10 risk mitigation.
- **`<LineItemPicker>` component** at `src/components/fieldservice/LineItemPicker.jsx` — type-ahead picker composing shadcn Command + Popover (same pattern as SubVendorPicker). Graceful degradation: no project → "Select a project first"; no estimate → "No line items available — Unallocated"; orphaned reference → "Detached line — re-pick" with X to clear.
- **Sub Payment + Client Payment forms gain LineItemPicker** between Reference and Notes. `line_item_id` added to FSPayment payload. Optional everywhere — null = Unallocated bucket per FINANCIAL-WORKFLOW-SPEC §3.2.5.
- **Per-line rollup view on Project Detail Financial Ledger** — sibling section below the existing category-level rollup (category rollup stays). Each contract line: Estimated / Billed (sum FSPayment received attributed) / Cost (sum FSPayment paid attributed) / Variance. Unallocated row at bottom. Orphaned references auto-shift to Unallocated visually per spec §5.3.
- **`projectSpent` semantic update** per spec §12 Q3 — now includes settled FSPayment(paid) records. Same update to workspace-wide `spendByProject` map. Spent tile gains caption "Materials + labor + sub payments". Spent drill-in subtitle/footer/rows updated to include sub payment rows.
- **Soft-delete read-path filters** via `excludeDeleted` helper at `src/utils/softDelete.js` — applied at all 27 FSPayment / FSMaterialEntry / FSLaborEntry / FSDailyLog filter call sites across 8 files. Living Feet (DEC-146) — one helper, every consumer reads through it. Client-side filter rather than `.filter({ deleted_at: null })` because Base44 SDK null-equality support unverified.
- **Schema additions live in Base44 (Gate 1 clean):** FSPayment.line_item_id + parent_payment_id + deleted_at + deleted_by; FSMaterialEntry.deleted_at + deleted_by; FSLaborEntry.deleted_at + deleted_by; FSDailyLog.deleted_at + deleted_by. Auto-commit `22ed68f`.

### Drill-through Seedlings A+B (shipped 2026-05-09 ~13:02 PT)

- **`<ProjectTileDrillIn>` reused for 6 Desk Home tiles** — Clients / Active Projects / Estimates / Spent This Month / Received / Team. Same primitive that already powered Project Detail's tile drill-throughs. Per-row click navigates to source records via localStorage prefill.
- **`useConsumePrefill(key)` hook extracted** at `src/hooks/useConsumePrefill.js` — Living Feet (DEC-146) — 5+ inline consumers funneled through one hook. Migrated trivial cases (Estimates + Log); Documents inline left in place (multi-key conditional doesn't compose).
- **"This Month" tile renamed "Spent This Month"** — its actual semantic is outgoing materials/labor cost, not income. Sitting next to "Received" with old label invited mental-model confusion.
- **Three new prefill keys wired:** `fs-people-prefill-client-id`, `fs-people-prefill-worker-id`, `fs-projects-prefill-project-id` + `fs-projects-prefill-payment-id` (paired). Project Detail consumes the project-id + payment-id pair with ref-based single-fire scroll-flash mirroring same-component `goToPaymentRow` pattern.
- **`$1,310 Received` hotfix shipped (`472583c`)** — direction filter + parseFloat normalization on `paymentsReceived` aggregation. Mirrors gold-standard `summarizePayments` helper pattern. The `$1,310` figure turned out to be legitimate `direction: 'received'` test-data records from Test Client; drill-through itself revealed the truth.

### Field Service Phase 1 + 2.1-2.4 (shipped 2026-04-30 through 2026-05-08, dogfood-verified — carry-forward)

- **CO math primitive (DEC-193):** `signChangeOrder` + `voidChangeOrder` server functions; FSProject.total_budget recomputes from CO `amount` (canonical), not `total` (display).
- **Feature flag canonicalization (DEC-194):** `features_json` is the single source of truth; all reads through `getFeatures(profile)`.
- **Management Fee distinct from O&P (DEC-195):** Two first-class features, both subtotal-only, never stack. Display order: **Subtotal → Management Fee → Insurance Fee → O&P → Other → Tax → Total**.
- **Cache invalidation discipline (DEC-196 + DEC-199 + DEC-202):** bare-array form banned, list/detail key pairs travel together. Refresh-on-save universal.
- **Opt-in default for billing-shape toggles (DEC-197).**
- **Universal capture surface (Log).** Daily Log + Sub Payment + Client Payment.
- **Project Detail financial header.** Contract / Received / Paid Out / Net Cash banner. Contract Total derived read-time from linked estimate (DEC-206).
- **printNode helper (DEC-198) + variable-layer print discipline (DEC-210).**
- **Required-field UX standard (DEC-200).**
- **Empty-field derivation through links (DEC-206).** `useProjectLinkedEstimates.js` hook + `deriveProjectClient` companion.
- **Trade-grouped estimates as platform default (Phase 2.1).** `flat_layout` field name (renamed twice; matches semantic now after Phase 2.2's `group_by_trade` rename).
- **Per-estimate taxonomy snapshot architecture (Phase 2.2).** `FSEstimate.trade_categories_snapshot` field captures workspace's taxonomy at estimate creation time. Documents are frozen-identity at the trade-categories layer (companion to DEC-203 Two-World Architecture).
- **Four locked taxonomy presets (Phase 2.2):** General Contractor (13-trade), CSI MasterFormat (16-division), Simple Three-Bucket, Service Provider — Hourly.
- **Vendor role + primary_trade_id + business_name on workers_json (Phase 2.3).** Three first-class roles: worker / subcontractor / vendor. (`primary_trade_id` stripped post-Phase-2.5 rollback per DEC-218.)
- **`<SubVendorPicker>` typeahead component (Phase 2.4)** at `src/components/fieldservice/SubVendorPicker.jsx`. Built on cmdk + Popover. First cmdk consumer in the codebase; second is Phase 1.0's LineItemPicker.
- **Stable `id` field on workers_json items (Phase 2.4 §0a).**
- **Phase 2.5 ROLLED BACK** per DEC-218 (Half-done isn't done). Two scaffolding pieces preserved with rollback-context docstrings: `deriveLineTrade` pure function, `peopleMap` extension on `useWorkspacePeople`.

### Process discipline

- **No-debrief-without-commit-hash (DEC-208).**
- **Spec citation re-verification (DEC-212 + DEC-219).**
- **Time-logging for AI build sessions (DEC-211).** Calibration data accumulating; today added 11 rows (#64-#74). Pattern continues: build flavors at familiar-pattern composition compress 16-30x; audits hold at estimated wallclock; spec patches compress to ~minutes once Find/Replace boundaries are clear.
- **`rls.update` must be absent on `asServiceRole`-written entities (DEC-215).** Critical safety rail; do not re-add.
- **Base44 `object`-typed array fields require `{items: [...]}` wrap at write boundary (DEC-216).** Read tolerance via `parseWrappedArray`.
- **shadcn `<Select>` width discipline (DEC-217).** In-row layouts: `w-auto min-w-[N] flex-shrink-0`. Standalone form fields: `w-full`.
- **Half-done isn't done (DEC-218).** Feature-evaluation discipline; removal beats iteration when reliability is partial. Foundational PROJECT-BRAIN principle.
- **DEC citation hygiene (DEC-219).** Mycelia verifies every DEC citation against canonical DECISIONS.md before locking spec text.

### Strategic principles in force (carry-forward)

- **Two-World Architecture (DEC-203)** — foundational principle.
- **Stewardship Space (DEC-201)** — strategic principle, future workspace.
- **Nursery Model (DEC-204) + Mycelia-as-bank (DEC-205).**
- **Documents architecture inversion (DEC-213)** — Project Detail Documents section landed; Client Detail + tab restructuring queued.
- **FSPayment edit deferred (DEC-214) — RE-OPENED via Phase 1.0 commit 2 spec.** Edit + delete + cleared-payment immutability ship in commit 2 when KI #28 resolves. DEC-214's deferral note remains accurate as historical context; the architectural conversation is now happening via the commit 2 build.
- **Per-line rollup contractor-only on ClientPortal for fixed-price (DEC-220, NEW today).** Two-World Architecture at the trust boundary.
- **Client-as-Hub architecture** — spec at `Spec-Repo/spaces/field-service/CLIENT-AS-HUB-SPEC.md`. Phase 3 candidate.

### Phase 4.2-tiles (parallel workstream, last shipped 2026-04-28)

- Phase 4.2-tiles structurally complete: tiles-1 through tiles-4 + cleanup. Tiles-5 queued.

### Cross-cutting

- **Multi-machine infrastructure live (DEC-181).**
- **Single-source documentation policy (DEC-182).**
- **Schema-conformance discipline (DEC-167 / DEC-177 / DEC-178).**
- **Mylane Agent v2, smart routing, shell containment** — all live.
- **Health score:** 87/100 (unchanged).

## Migration Plan (DEC-175 + DEC-207) — DISCUSSION OPENED 2026-05-09

- **Original plan:** Phase 6 (Region foundation backfill window per DEC-172) AND Bari reliability AND Phase 2 architectural sign-off (gates per DEC-207). Phase 2 sign-off completed 2026-05-08 morning; Phase 2.1-2.4 substreams complete; Bari reliability gate continues.
- **Doron framing 2026-05-09 (after 3 Base44 incidents in 100 minutes):** *"I am getting over base44 and the issues we are having. Perhaps it is time we start to work on migration."*
- **Mycelia recalibration:** 30-50 combined hours (Hyphae + Doron) rather than the multi-month framing. Sequencing: complete "Bari working well" first (Phase 1.0 commit 2 + Phase 2.6.1 + 2.6.2 + polish + KI #27), then migrate. Custody trial 2026-05-19 respected as constraint.
- **Migration audit deferred to dedicated future session** — substantive enough for standalone scope.
- **Target stack:** Supabase + Vercel.
- **Sandbox:** `lanecountyrecess.com`. `locallane.app` stays on Base44 until cutover.

## Field Instrument (sibling product)

- FIELD-INSTRUMENT-SEED.md committed to `private/` root 2026-04-26. v0.1 protocol live-tested 2026-04-24. Standalone LLC under Mycelia LLC.
- DEC-184 — Field Instrument as first Supabase + Vercel build.

## What Just Shipped (May 9 afternoon — this ship-it cycle)

**community-node:**

| Commit | Content |
|---|---|
| `472583c` | Drill-through hotfix — direction filter + parseFloat on `paymentsReceived` aggregation in FieldServiceHome.jsx (~3 min wallclock) |
| `14ba199` | Drill-through Seedlings A+B build — 6 tile drillConfigs + `useConsumePrefill` hook extraction + "This Month" → "Spent This Month" rename + 3 new prefill keys + Project Detail consumer wiring (~9 min wallclock) |
| `cb7292a` | Diag-ping #1 marker (deploy verification) |
| `212be2f` | Diag-ping #1 revert (Outcome C confirmed) |
| `04162a8` | **Phase 1.0 commit 1** — line-item attribution + per-line rollup + projectSpent honest math + soft-delete schema (12 files, +746/-42; ~13 min wallclock) |
| `ecdf140` | Diag-ping #2 marker (post-schema-error verification) |
| (this ship-it) | Diag-ping #2 revert + uncommitted Base44 prompt for commit 1.5 schema + ACTIVE-CONTEXT/SESSION-LOG/STATUS-TRACKER/LAUNCH-CHECKLIST/DECISIONS docs sync per DEC-182 |

**Spec-Repo:**

| Commit | Content |
|---|---|
| (Phase 1.0 patch 002, earlier afternoon) | Eight attribution Qs + seven edit/delete Qs + Option Z combined phasing (§12 + §13 + §14 + §15) |
| `f4e179f` | Patch 003 — citation hygiene fixes + cascade atomicity callout + DEC-219 enforcement update |
| `4d6c0fb` | Patch 004 — §13.6 Material/Labor attribution scope + §12 Q6 amendment |
| `0dbe54e` | Patch 005 — §13.6 Pattern A/B/C/D enumeration |
| (this ship-it) | DEC-220 appended + ACTIVE-CONTEXT/SESSION-LOG/STATUS-TRACKER/LAUNCH-CHECKLIST docs sync per DEC-182 |

## Decisions Ratified Today (May 9)

- **DEC-218** — Half-done isn't done (foundational principle; promoted from session principle to formal DEC + PROJECT-BRAIN principle). Ratified morning.
- **DEC-219** — DEC citation verification before locking spec text (Mycelia hygiene). Ratified morning; enforcement gap captured in spec patch 003 §15 (operational discipline going forward).
- **DEC-220** — Per-line rollup contractor-only on ClientPortal for fixed-price contracts. Ratified afternoon. First of eight Q-locks from `LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md` §12 row 1; only Q1 platform-wide enough to merit a DEC.

## Strategic Clarifications Still in Force

- **Phase 3.5 (Direct Doors)** deferred to post-migration per DEC-179.
- **Phase 5 (Pre-Migration Cleanup)** between Phase 4.5 and Phase 6 per DEC-180; KI #29 + #30 + #31 are pre-migration cleanup targets.
- **Payment infrastructure** deferred to post-migration.
- **Phase 6 migration** further gated on Bari reliability + Phase 2 sign-off (DEC-207). Migration discussion opened 2026-05-09; audit deferred to dedicated future session.

## Field Service Node — Phase 1.0 commit 1 + drill-through complete; commit 1.5 + commit 2 deferred on KI #28

Bari is the first external paying user; Phase 1.0 commit 1 dogfood-verified at production level. Per-line rollup view operational. Patricia's EST-2026-005 ($182,013.69, 30+ line items) renders correctly under all phases' new architecture. Sub picker integration ships; LineItemPicker on Sub Payment + Client Payment forms; per-line attribution available from day one (no backfill ever needed).

## Items Needing Doron's Verification

(From today's afternoon commits — production verification owed via Base44 Act-As-User preview after Doron publishes Base44 final state.)

1. **Phase 1.0 commit 1 LineItemPicker UX** — open Sub Payment + Client Payment forms, confirm picker renders between Reference and Notes; type-ahead works against project's estimate line items; "No line items available — Unallocated" graceful degradation when project has no estimate.
2. **Phase 1.0 commit 1 per-line rollup view** — open Project Detail Financial Ledger; new section renders below the existing category rollup with Estimated / Billed / Cost / Variance per line item + Unallocated row at bottom.
3. **Phase 1.0 commit 1 projectSpent honest math** — Spent tile shows new caption "Materials + labor + sub payments"; drill-in modal lists materials + labor + sub payments combined; Spent value reflects all three streams.
4. **Drill-through Seedlings A** — click each of 6 Desk Home tiles, confirm popup opens with constituent records; row click navigates to source. "Spent This Month" tile label visible.
5. **Diag-ping #2 outcome** — confirm sky-blue badge no longer visible at top of Desk Home (this ship-it cycle reverts it).
6. **Patricia signing-flow regression check (still owed from Phase 2.1)** — verify in-platform signing on a non-Patricia test estimate before retiring KI #22 workaround. Optional but valuable.

## Phase 1.0 commit 1.5 + commit 2 Up Next (deferred to next session)

**Commit 1.5 (queued, Base44 schema gate FAILED at 16:11 PT):**

- Material/Labor LineItemPicker on Daily Log materials + labor entry rows
- FSMaterialEntry.line_item_id + FSLaborEntry.line_item_id write-path additions
- Per-line rollup view expansion: Cost column to include attributed FSMaterialEntry + FSLaborEntry contributions
- Build prompt at `base44-prompts/PHASE-1-0-COMMIT-1-5-MATERIAL-LABOR-ATTRIBUTION.md` (uncommitted; bundled into this ship-it cycle as audit-trail artifact for next session)
- Spec at `0dbe54e` (Spec-Repo); ratified §13.6 + Pattern A/B/C/D enumeration
- Retry next session when Base44 schema agent recovers

**Commit 2 (queued, KI #28 expanded — gates Gate 2 across all four entities):**

- `<RowActionsMenu>` primitive composing shadcn DropdownMenu
- `<ConfirmDeleteDialog>` primitive composing shadcn alert-dialog
- `withAuditLog(operation, entityType, entityId, beforeRecord)` server function — atomic audit log writes
- `softDeleteWithCascade(entityType, entityId)` server function — single transactional cascade for FSDailyLog parent + FSMaterialEntry/FSLaborEntry children
- Edit/delete UI on all four cost-tracking entities (FSPayment, FSMaterialEntry, FSLaborEntry, FSDailyLog)
- Cleared-payment immutability + Reverse minimum-viable flow per spec §14.3
- Per spec §14.1 Z-split — independent commit between commit 1 and commit 1.5 architecturally; sequenced after commit 1.5 builds for blast-radius management

## Known Issues (Carried Forward + NEW)

1. `community-node/docs/migration-research.md` — supposed to be deleted post-DEC-175; still present.
2. **DECISIONS.md drift** between Spec-Repo and community-node — re-synced this ship-it per DEC-182. Mirror-perfect post-cycle.
3. Stray Cursor references in Spec-Repo outside today's PROJECT-BRAIN scope.
4. Persistent Base44 SDK 404 console spam (gates dev-preview verification; production verification via Base44 Act-As-User preview).
5. Duplicate `DC` key React warning in Radix Select.
6. `Business.categories` field empty in Base44 (DEC-176) — pending Phase 5 cleanup.
7. FSDocumentTemplate `rls.update` creator-only — workaround documented. Action item under DEC-215.
8. Phase 2 FieldServiceProfile + User `security.update: true` with no RLS — wide-open by design; may revisit post-migration.
9. Base44 publish blocker — escalation `95a004a0` still open.
10. Base44 auto-push behavior — DEC-162 working agreement mitigates.
11. Overlay z-indices hardcoded (z-50/55/60).
12. ClaimBusiness + BusinessEditDrawer cleanup pending (Phase 5).
13. Footer renders on non-MyLane pages.
14. JoinFieldService welcome-card "Go to desk" soft-broken.
15. Engagement Read permission set to authenticated; row-level scoping in query logic.
16. Permit edit/inspection labels use `text-xs text-muted-foreground/70` instead of `LABEL_CLASS`.
17. `FieldServiceReport.jsx` still uses direct `window.print()`.
18. Shared invalidation helpers (`src/utils/fsInvalidations.js`) — Living Feet candidate.
19. Query-key naming drift (3 inconsistencies).
20. **Estimate edit lifecycle gating** — partial closure via `isEstimateLocked` + `isChangeOrderLocked` extractions; full closure remains a deeper architectural conversation.
21. **Drift visibility question** (2026-05-07).
22. **Patricia signing-flow bug — STRUCTURALLY UNBLOCKED 2026-05-08** as side-effect of DEC-215. Verification on a non-Patricia test estimate pending.
23. Light-theme `--primary-foreground` collision with bg-white wrapper.
24. ~~Vite stale dev-server error in `FieldServiceProjects.jsx:331`~~ — RESOLVED 2026-05-09.
25. **`subs_enabled` feature flag gates BOTH Subs AND Vendors sections** in FieldServicePeople — sensible default but worth a per-section gate eventually.
26. **`FSPayment.rls.update` is PRESENT** — DEC-215 prerequisite blocker. Phase 1.0 commit 2 needs this resolved + the same on FSMaterialEntry, FSLaborEntry, FSDailyLog (rolled into KI #28).
27. **workers_json privacy on public ClientPortal** (2026-05-09 morning) — ClientPortal exposes contractor's full sub roster via portal_token. Fix is server-side (`getPublicFieldServiceProfile`); ~30-45 min build. Defer until directory exposure escalates.
28. **NEW — Base44 platform incidents (multi-symptom).** Three incidents in 100 minutes 2026-05-09 afternoon: (a) Security panel won't load — gates Gate 2 `rls.update` removal across all four cost-tracking entities; blocks commit 2 build; (b) Schema agent timeout/error — Request ID `0432acde-c8e7-42d4-b92d-8d5947f6fb3c`; rolled back commit 1.5 schema additions; blocks commit 1.5 build; (c) Deploy pipeline slowness — initial commit 1 publish lag confirmed via diag-ping cycle. Multiple symptoms suggest broader platform stability issue rather than isolated single surface. Awaiting Base44 recovery.
29. **NEW — Exposed Secrets findings (Base44 Security panel review).** Hardcoded admin user IDs in `migrationHelpers` + `reparentBusiness` server functions. Pre-migration cleanup target.
30. **NEW — `voidChangeOrder` server function lacks auth check** (Unauthenticated Backend Functions finding). Pre-migration cleanup target.
31. **NEW — `manageNetworkApplication` hardcoded email auth** (Unauthenticated Backend Functions finding). Pre-migration cleanup target.

## Organism Milestones (this window — May 9 afternoon)

- **Phase 1.0 commit 1 shipped + production-verified** — line-item attribution mechanism + per-line rollup view + projectSpent honest math + soft-delete schema land at production with Bari/Patricia data unaffected by the changes. ~13 min Hyphae build wallclock; calibration trend continues at 16-23x compression for familiar-pattern composition work.
- **Drill-through Seedlings A+B closed end-to-end** — 6 Desk Home tiles now drill through with same primitive Project Detail uses. `useConsumePrefill` hook extracted (Living Feet at 5+ inline consumers). "$1,310 Received" diagnostic surfaced legitimate test data via the drill-through itself, exactly as predicted.
- **Spec evolution discipline at scale** — four sequential Spec-Repo patches in one afternoon (002, 003, 004, 005), each responsive to a real signal (Doron's Q-locks → Hyphae's sign-off audit → Doron's walkthrough surfacing material/labor asymmetry → Hyphae's audit on phantom Pattern 2/4 references). DEC-219 working as designed across the patch sequence.
- **Three new DECs ratified** — DEC-218 (foundational principle), DEC-219 (Mycelia hygiene), DEC-220 (Two-World Architecture at ClientPortal trust boundary).
- **Migration discussion opened** — Doron's third-incident framing surfaces willingness to start migration work. Mycelia recalibrates from multi-month to 30-50 combined hours. Audit deferred to dedicated future session.
- **First "ship-it cycle deferred mid-build" pattern** — commit 1.5 spec ratified + build prompt ready + Base44 prompt drafted + schema attempt failed; pattern is "wait for platform, ship when ready" rather than "force through partial state". DEC-218 working as designed at the operational level.

## In Flight

None. Phase 1.0 commit 1 production-verified; commit 1.5 spec-ratified, build deferred on KI #28; commit 2 spec-ratified, build deferred on KI #28; Phase 2.6.1 + 2.6.2 specs ratified, build queued.

## Active Blockers

- **KI #28 — Base44 platform recovery.** Gates commit 1.5 schema retry AND commit 2 Gate 2 `rls.update` removal across all four cost-tracking entities. No code work proceeds against these commits until KI #28 resolves.

## Upcoming Priorities

1. **Phase 1.0 commit 1.5 build** — when Base44 schema agent recovers from KI #28. Retry of `base44-prompts/PHASE-1-0-COMMIT-1-5-MATERIAL-LABOR-ATTRIBUTION.md` (FSMaterialEntry.line_item_id + FSLaborEntry.line_item_id additions). Then ~30-90 min Hyphae build (Material/Labor LineItemPicker + write paths + rollup expansion).
2. **Phase 1.0 commit 2 build** — when KI #28 fully resolves AND Gate 2 (rls.update removal on all four cost-tracking entities) clears. Edit/delete + cleared-payment immutability + Reverse minimum-viable + cascade-delete server function. Realistic ~3.5-5h Hyphae build per audit.
3. **Phase 2.6.1 build** (~3-4.5h focused build with @dnd-kit + ~1h Doron-in-loop verification, single commit). Spec at `2b8686d`. Three-component decomposition; entry-form-plus-groups workflow on FSEstimate alone.
4. **Phase 2.6.2 build** (~2-3h focused build) — FSChangeOrder schema additions + backfill migration (MIGRATION_SECRET kept live from Phase 2.5 rollback) + CO surface turn-on.
5. **Phase 2 closes** after 2.6.1 + 2.6.2.
6. **Migration audit** — dedicated session to scope the 30-50 hour Hyphae+Doron migration to Supabase + Vercel.
7. **Five-tile drill-through verification** — deferred from morning.
8. **Patricia signing-flow regression check** (Doron, optional).

Open queue (carry-forward):

**Small wins:**
- Client Detail Documents section (per DEC-213).
- `<RecordSection>` primitive extraction (four-instance threshold met).
- `useDrillInNavigators` hook extraction (five-instance threshold met).
- `<TradeGroupedItemsTable />` component extraction.
- `src/utils/fsInvalidations.js` helper file.
- `migrationRunner` factory.
- `appendToWorkersJson(profile, newPerson)` helper.
- KI #27 fix (`getPublicFieldServiceProfile` server function, ~30-45 min).
- KI #29 + #30 + #31 fixes (pre-migration cleanup, Phase 5 territory).

**Medium architectural:**
- Estimate edit lifecycle gating discipline conversation (KI #20 — partial closure done).
- Documents tab restructuring (DEC-213 second half).
- Cross-entity link chain audit (per DEC-206 footnote).
- Client-as-Hub Phase 3 candidate (spec captured 2026-05-08).

**Phase 3+ (real architectural conversations needed first):**
- 8 open questions on Log-Line-Item Attribution Proposal — collapsed to zero today; Phase 1.0 builds resolve the proposal end-to-end over commits 1 + 1.5 + 2.
- Returns and refunds.
- Client Communication tab on Project Detail.
- Light-theme print collision fix.
- FieldServiceReport.jsx printNode migration.
- Drift visibility question.

**Carry-forward not specific to today:** Estimate Types expansion; Insurance toggle as %; Hourly rate verification; PDF formatting polish; Documents UX session; Dan Sikes logo Gemini variants; Nursery launch session; Phase 4.2-tiles-5 / 4.2-tiles-7 / Per-business workspace wiring / Phase 4.6 / 4.7 / Phase 5 / Phase 6; Engagement scoped-query server function; Field Instrument as first Supabase + Vercel build (DEC-184); NODE-LAB-MODEL.md phase-review note for Field Service crossing production-shaped; Newsletter "The Good News."
