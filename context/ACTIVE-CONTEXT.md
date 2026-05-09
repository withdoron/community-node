# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-05-09 (Phase 2.5 build → rollback + migration round-trip closed; Phase 2.6 spec authored + sign-off audited + patched; DEC-218 "Half-done isn't done" + DEC-219 DEC citation hygiene ratified; Phase 2.6.1 build queued for tomorrow)

## Current Focus

**Phase 2.5 round-trip closed end-to-end today.** Phase 2.5 (empty-field trade derivation via name-bridging) shipped at `95ccfb1` and rolled back at `197805e` + `cc0f845` after Doron's screen-walk surfaced two architectural realities the spec didn't account for: single `primary_trade_id` per sub couldn't survive taxonomy switching (Tony Tile maps to "Tile" in GC but no name match in CSI MasterFormat — exact-name-match bridge silently soft-fails cross-taxonomy), AND the line item creation flow has the trade dropdown visually before the sub picker (users pick the trade manually before derivation has a chance to fire). The auto-derivation feature isn't a priority right now and the single-trade-per-sub model collapses across taxonomies; pulled cleanly until per-taxonomy mapping work in Phase 3+. Doron's framing of the rollback decision: **"Half-done isn't done."** Promoted to DEC-218 + foundational PROJECT-BRAIN principle.

**`primary_trade_id` field stripped from workers_json items via migration** (`migrate-strip-primary-trade-id`, 4 records scanned, 1 actual data strip — Doron's "Cabinetry & Countertops" test data on Consulting with Doron — 4 AuditLog rows, idempotent re-run confirmed). Patricia's data and Bari's Red Umbrella record completely untouched. **Two scaffolding pieces preserved** with rollback-context docstrings: `deriveLineTrade` pure function (now disconnected from render path but documented for future revisit), `peopleMap` extension on `useWorkspacePeople` (independently valuable Phase 2.6 polish target).

**Phase 2.6 spec authored, sign-off audited, and patched.** New file at `Spec-Repo/spaces/field-service/PHASE-2-6-LINE-ITEM-ENTRY-REDESIGN.md` (`abb3916` + patch 001 at `2b8686d`). 13 locked design decisions covering an entry-form-plus-groups workflow redesign — replaces stacked editable rows with single entry-point at top + collapsible trade groups below + drag-and-drop reorder + inline edit + signed-doc lockdown UX. Three-component decomposition (`<LineItemForm>` + `<LineItemsByTrade>` + `<LineItemRow>`). **Phase 2.6.1 / 2.6.2 split** per Hyphae audit: 2.6.1 ships entry-form-plus-groups on FSEstimate alone (~3-4.5h focused build), 2.6.2 follows with FSChangeOrder schema additions (`group_by_trade`, `taxonomy_preset_id`, `trade_categories_snapshot`, `trade_group_order`) + backfill migration (~2-3h). @dnd-kit selected for drag-and-drop. CSI MasterFormat uses preset-defined order; all other presets default to insertion order; user drag overrides per-estimate.

**Tomorrow's first move:** Phase 2.6.1 build kicks off from the build-ready spec at `2b8686d`. Single commit, single ship.

## Active Architecture

### Field Service Phase 2.1 (shipped 2026-05-08 morning, dogfood-verified end-of-day)

- **Trade-grouped estimates as platform default.** `is_insurance_estimate` → `flat_layout` rename + value inversion. Phase 2.2 then renamed `flat_layout` → `group_by_trade` (with another value invert) so the field name now matches the live semantic.
- **Unallocated bucket render.** `groupedByTrade` memo keyed by `tc.id`; sentinel `__unallocated__` floats to top when at least one untagged item exists.
- **Living Feet extraction:** `getTradeCategories` + `DEFAULT_TRADE_CATEGORIES` to `src/utils/fsTradeCategories.js`.

### Field Service Phase 2.2 (shipped 2026-05-08 mid-day, dogfood-verified)

- **Per-estimate taxonomy snapshot architecture.** `FSEstimate.trade_categories_snapshot` field captures the workspace's taxonomy at estimate creation time. Renders read snapshot first, fall back to workspace working list (`getEstimateTradeCategories(estimate, profile)` in `fsTradeCategories.js`). Documents are frozen-identity at the trade-categories layer (companion to DEC-203 Two-World Architecture; pattern candidate "Frozen Document Identity").
- **Four locked taxonomy presets** (`tradeTaxonomyPresets.js`): General Contractor (13-trade), CSI MasterFormat (16-division), Simple Three-Bucket, Service Provider — Hourly. Each preset has a stable id slug; estimates carry the slug in `taxonomy_preset_id` for retrospect.
- **`isEstimateLocked()` extraction** (DEC-148 derivation discipline; 5 inline gates → 1 helper at `src/utils/fsEstimateLifecycle.js`).
- **`pre-migration-rls-audit.js` Living Feet helper** (codifies DEC-215 audit pattern).
- **Phase 2.2 polish (4 commits):** preset rename + dropdown shadcn theming (`88132a3`), line-item dropdown shadcn + preview staleness (`a6f9875` + `d02ed1f`), description regression fix (`47e00b8` — DEC-217 trigger), print pagination (`3729bc7`).

### Field Service Phase 2.3 (shipped 2026-05-08 afternoon, dogfood-verified)

- **Vendor role added to workers_json.** Three first-class roles: worker / subcontractor / vendor. Vendor color: fuchsia (`bg-fuchsia-500/20 text-fuchsia-400`). Permissions guide updated: vendor entry added.
- **`primary_trade_id` field on every workers_json item** (workspace-current taxonomy reference; sentinel `__no_primary_trade__` for unset). Phase 2.5 will derive line-item trades by name-bridging this against estimate snapshots.
- **`business_name` canonical** — renamed from `company_name`. Reused across subcontractor + vendor roles. Migration #3 walked 4 FieldServiceProfile records, renamed 2 items.
- **Living Feet pre-work bundled (`fe1415d`):** `WORKERS_ROLES` constant (drives badge map + role select + Vendors section filter), `parseWrappedArray` helper at `src/utils/wrapShape.js` (DEC-216 read-tolerance), `useWorkspacePeople(profile, role?)` hook.

### Field Service Phase 2.4 (shipped 2026-05-08 late afternoon)

- **`<SubVendorPicker>` typeahead component** at `src/components/fieldservice/SubVendorPicker.jsx`. Built on cmdk (`src/components/ui/command.jsx` — was shipped, unused; Phase 2.4 is the first consumer in the codebase) + Popover. Replaces `sub_name` text input (LineItemsEditor; covers FSEstimate AND FSChangeOrder via shared component) and `payee_name` text input (FSPayment Sub Payment).
- **`<QuickAddPersonModal>` slim form** for adding new sub/vendor without leaving the picker flow. Per Phase 2 §7.7: name + role + business_name + primary_trade_id only. Phone/email/hourly_rate/notes/projects go through the full PersonModal in FieldServicePeople.
- **Workers_json items have stable `id` field** (Phase 2.4 §0a — closes Phase 2.3 implementation gap). Migration `migrate-add-workers-json-ids` walked 4 records, assigned ids to 2 items via `worker_${ts}_${counter}` pattern. New records get ids client-side via `newWorkerId()` in `fsWorkersRoles.js`. `claimWorkspaceSpot` extended to dual-match: id first, name fallback for legacy invite codes.
- **Dual-write semantics on line items.** Active estimate: picker writes both `sub_person_id` (FK to workers_json) AND `sub_name` (denormalized text mirror). Live-read of name from workers_json by id. Locked estimate (`isEstimateLocked()` true): picker disabled; frozen `sub_name` text only (DEC-193 immutability).
- **`isChangeOrderLocked()` extraction** at `fsEstimateLifecycle.js` (Phase 2.4 §0b — companion to `isEstimateLocked`). 5 inline lock-gate sites in FieldServiceProjects.jsx replaced with helper calls; 6 status-discrimination sites preserved inline.
- **FSPayment.party_id semantic broadened.** Same field, now references workers_json item id when party_type is sub/vendor (was: FSClient FK only). Description-only Base44 update applied; no field-type or permissions change. NO backfill on existing FSPayment records (natural workflow handles per Phase 2 §7.8).

### Field Service Phase 1 (shipped 2026-04-30, dogfood-verified through 2026-05-08)

(Carry-forward — unchanged today.)

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
- **Localstorage cross-tab prefill** — four uses now (`fs-log-prefill-type`, `fs-log-prefill-log-id`, `fs-estimate-prefill-id`, `fs-document-prefill-id` + `fs-document-prefill-project-id`).
- **Entity-rollup section family on Project Detail** — Recent Payments / Permits / Change Orders / Documents — four-instance threshold met.
- **Drill-in navigator helper family** — `goToEstimatePreview`, `goToLogForRecord`, `goToCOOnPage`, `goToPaymentRow`, `onLogPayment` — five-instance threshold met.
- **Honest navigation > pretend navigation (DEC-209).**

### Process discipline

- **No-debrief-without-commit-hash (DEC-208).**
- **Spec citation re-verification (DEC-212).**
- **Time-logging for AI build sessions (DEC-211).** Calibration data accumulating; today added 13 rows to the table (six rows from morning, plus seven from Phase 2.2-2.4). Pattern continues: investigation flavors track wallclock closely; build flavors with multi-substream scope diverge (Hyphae stamps include audit + verification overhead).
- **`rls.update` must be absent on `asServiceRole`-written entities (DEC-215).** Critical safety rail; do not re-add.
- **Base44 `object`-typed array fields require `{items: [...]}` wrap at write boundary (DEC-216).** Read tolerance via `parseWrappedArray`.
- **shadcn `<Select>` width discipline (DEC-217).** In-row layouts: `w-auto min-w-[N] flex-shrink-0`. Standalone form fields: `w-full`.

### Strategic principles in force (carry-forward)

- **Two-World Architecture (DEC-203)** — foundational principle.
- **Stewardship Space (DEC-201)** — strategic principle, future workspace.
- **Nursery Model (DEC-204) + Mycelia-as-bank (DEC-205).**
- **Documents architecture inversion (DEC-213)** — Project Detail Documents section landed (`193f4e8`); Client Detail + tab restructuring queued.
- **FSPayment edit deferred (DEC-214)** — tied to Phase 2 financial-layer sign-off.
- **Client-as-Hub architecture (NEW today)** — spec captured at `Spec-Repo/spaces/field-service/CLIENT-AS-HUB-SPEC.md`. Phase 3 candidate. Same documents-are-frozen-identity discipline as Phase 2.2 snapshot, applied at the client/project level.

### Phase 4.2-tiles (parallel workstream, last shipped 2026-04-28)

- Phase 4.2-tiles structurally complete: tiles-1 through tiles-4 + cleanup. Tiles-5 queued.

### Cross-cutting

- **Multi-machine infrastructure live (DEC-181).**
- **Single-source documentation policy (DEC-182).**
- **Schema-conformance discipline (DEC-167 / DEC-177 / DEC-178).**
- **Mylane Agent v2, smart routing, shell containment** — all live.
- **Health score:** 87/100 (unchanged).

## Migration Plan (DEC-175 + DEC-207)

- **Trigger:** Phase 6 (Region foundation backfill window per DEC-172) AND Bari reliability AND Phase 2 architectural sign-off (gates per DEC-207). Phase 2 sign-off completed 2026-05-08 morning; Phase 2.1-2.4 substreams complete; Bari reliability gate continues.
- **Target stack:** Supabase + Vercel.
- **Sandbox:** `lanecountyrecess.com`. `locallane.app` stays on Base44.

## Field Instrument (sibling product)

- FIELD-INSTRUMENT-SEED.md committed to `private/` root 2026-04-26. v0.1 protocol live-tested 2026-04-24. Standalone LLC under Mycelia LLC.
- DEC-184 — Field Instrument as first Supabase + Vercel build.

## What Just Shipped (May 8)

**Spec-Repo (this ship-it cycle):**
- This commit — `platform/DECISIONS.md` (DEC-216 + DEC-217 appended), `context/ACTIVE-CONTEXT.md` (full refresh), `context/SESSION-LOG.md` (May 8 continuation entry appended), `platform/STATUS-TRACKER.md` (Phase 2.2-2.4 milestone row), `platform/checklists/LAUNCH-CHECKLIST.md` (items checked off), `spaces/field-service/CLIENT-AS-HUB-SPEC.md` (NEW seedling spec).
- Earlier today (`67b11df`) — Phase 2 proposal sign-off (status header + §13 + closing line). Earlier this morning ship-it (`4feee98`) — Phase 2.1 close-out.

**community-node (this section, post-Phase 2.1 ship-it `c0796f6`):**

Phase 2.2 architecture commits:
- `f466c07` — `isEstimateLocked()` Living Feet extraction (5 sites → 1 helper)
- `6305063` — `tradeTaxonomyPresets.js` config (4 locked presets)
- `44a3866` — per-estimate snapshot architecture bundle (helper + EMPTY_ESTIMATE + creation seam + Settings UI + editor picker)
- `ff1d6da` — migration scripts + `pre-migration-rls-audit.js` Living Feet helper
- `49c0bfb` — wrap-shape correction on snapshot field (DEC-216 trigger)

Phase 2.2 polish:
- `88132a3` — preset rename + Phase 2.2 dropdowns shadcn-themed
- `a6f9875` — line-item kind/trade dropdowns shadcn-themed
- `d02ed1f` — save mutation cache race fix (preview staleness, DEC-130 pattern)
- `47e00b8` — line-item description regression fix (DEC-217 trigger)
- `3729bc7` — print pagination fix

Phase 2.3:
- `fe1415d` — Living Feet pre-work (WORKERS_ROLES + parseWrappedArray + useWorkspacePeople)
- `054e402` — migration script + helper action (`migrate-company-name-to-business-name`)
- `8236545` — code-side rename `company_name` → `business_name` (post-migration)
- `b282e88` — Vendors `<Section>` + role-conditional fields + primary_trade_id picker + permissions guide entry

Phase 2.4:
- `2472e39` — workers_json id migration (`add_workers_json_ids`) + EMPTY_PERSON id field + PersonModal id generation + claimWorkspaceSpot dual-match
- `0467db5` — `isChangeOrderLocked()` Living Feet extraction (5 sites → 1 helper)
- `ff7e741` — SubVendorPicker (cmdk) + QuickAddPersonModal + LineItemsEditor integration + FSPayment Sub Payment integration

This commit (mirror sync) — `context/PROJECT-BRAIN.md` (carry-forward), `context/ACTIVE-CONTEXT.md`, `context/SESSION-LOG.md`, `DECISIONS.md`, `STATUS-TRACKER.md`, `checklists/LAUNCH-CHECKLIST.md` synced from Spec-Repo. CLAUDE.md notes pointing to DEC-216 (wrap-shape) + DEC-217 (Select width).

**Migration log (cumulative, 2026-04-23 forward):**

| Date | Migration | Records | AuditLog rows | Status |
|---|---|---|---|---|
| 2026-04-23 | Phase 2 production migration | varied | 9 | Complete |
| 2026-04-23 | Bari template loading | 2 | 2 | Complete |
| 2026-05-08 | migrate-flat-layout-inversion (Phase 2.1) | 5 | 5 | Complete (idempotent re-run confirmed) |
| 2026-05-08 | migrate-flat-layout-rename (Phase 2.2) | 6 | 6 | Complete (idempotent re-run confirmed) |
| 2026-05-08 | migrate-trade-categories-snapshot-backfill (Phase 2.2) | 6 | 6 | Complete (idempotent re-run confirmed) |
| 2026-05-08 | migrate-company-name-to-business-name (Phase 2.3) | 4 | 4 | Complete (2 items renamed; idempotent re-run confirmed) |
| 2026-05-08 | migrate-add-workers-json-ids (Phase 2.4 §0a) | 4 | 4 | Complete (2 items received fresh ids; idempotent re-run confirmed) |

## Decisions Ratified Today (May 8)

- **DEC-215** — `rls.update` must be absent on entities receiving `asServiceRole` writes (structural rule, three-instance threshold met). Ratified morning.
- **DEC-216** — Base44 `object`-typed array fields require `{items: [...]}` wrap at write boundary (five-instance evidence: line_items, trade_categories_json, trade_categories_snapshot, workers_json, phase_labels). `parseWrappedArray` at `src/utils/wrapShape.js` is the canonical reader. Ratified afternoon.
- **DEC-217** — shadcn `<Select>` defaults to `w-full`; in-row layouts use `w-auto min-w-[N] flex-shrink-0`, standalone form fields use `w-full`. Failure mode caught in commit `47e00b8`. Ratified afternoon.

## Strategic Clarifications Still in Force

- **Phase 3.5 (Direct Doors)** deferred to post-migration per DEC-179.
- **Phase 5 (Pre-Migration Cleanup)** between Phase 4.5 and Phase 6 per DEC-180.
- **Payment infrastructure** deferred to post-migration.
- **Phase 6 migration** further gated on Bari reliability + Phase 2 sign-off (DEC-207). Phase 2 sign-off done; Phase 2.1-2.4 substreams complete; Bari reliability gate continues.

## Field Service Node — Phase 2.1 + 2.2 + 2.3 + 2.4 Complete

Bari is the first external paying user; Phase 2.1-2.4 dogfood-verified at production-build level (EXIT=0 across all commits). Score ~95/100 (no change). Patricia's EST-2026-005 ($182,013.69, 30+ line items) renders correctly under all four phases' new architecture. Sub picker integration ships; Bari can autocomplete sub names from workers_json instead of free-typing. Per-business Desk wiring still owed for tiles-5+ (carry-forward).

## Items Needing Doron's Verification

(From today's afternoon commits — production verification owed via Base44 Act-As-User preview after Doron publishes Base44 final state.)

1. **Phase 2.4 SubVendorPicker UX in LineItemsEditor** — open any sub line item, picker should render. Type a name → matches filter. Type unmatched name → "+ Add" affordance. Quick-add modal saves and auto-selects.
2. **Phase 2.4 SubVendorPicker UX in FSPayment Sub Payment** — same picker, role={['subcontractor','vendor']}, auto-syncs party_type from picked person's role.
3. **Phase 2.4 dual-write verification** — pick a sub on a line item; confirm `sub_person_id` and `sub_name` both write; reload; confirm picker shows live name from workers_json.
4. **Phase 2.4 stale-id handling** — if a sub is deleted from People while referenced on a saved estimate, the line item should render `sub_name` text + "(deleted)" hint.
5. **Phase 2.4 isChangeOrderLocked refactor regression check** — locked CO badges still render emerald; counted-COs filter still works on Project Detail Contract Total.
6. **Patricia signing-flow regression check (still owed)** — with `rls.update` removed from FSEstimate (DEC-215), signEstimate should now succeed. Verify in-platform signing on a non-Patricia test estimate before retiring KI #22 workaround. Optional but valuable.

## Phase 2.6.1 Up Next

Build kicks off tomorrow from spec at `2b8686d`:

- **Replace LineItemsEditor with three new components** — `<LineItemForm>` (shared field set: category, trade, description with voice, sub picker conditional, qty, unit price, computed amount), `<LineItemsByTrade>` (entry form + groups + state + empty state + subtotal strip), `<LineItemRow>` (asymmetric two-line/single-line, click-to-expand into inline edit).
- **Workflow shape:** single entry form at top, Submit button with sticky "Keep trade for next entry" checkbox, submitted lines drop into trade groups below. Click any row to inline-edit (no modal). Subcontractor rows render two-line (description + sub name); other categories render single-line (description + qty × price + amount). Asymmetry IS the cue — no pills, no color codes.
- **Drag-and-drop** via `@dnd-kit/core` + `@dnd-kit/sortable` (~30KB). Group-level drag (reorder trade groups), within-group line drag (reorder lines), DragOverlay for visual feedback, keyboard sensor for accessibility. Cross-group movement happens via edit-and-change-trade only — line snaps to new group with brief highlight pulse.
- **Group ordering:** CSI MasterFormat preset uses preset order; all other presets default to insertion order; user drag overrides per estimate via new `trade_group_order` field on FSEstimate (DEC-216 wrap shape).
- **Validation discipline (DEC-200):** inline error styling, Submit disabled until valid. Legacy line handling — Patricia's `sub_name`-only items force SubVendorPicker re-pick on inline edit (Phase 2 §7.8 natural-workflow reconciliation, Doron's locked Option C).
- **Lockdown UX:** confirm dialog on edit click for signed estimates, three buttons (Cancel / Edit anyway / Create change order). "Edit anyway" writes silent markers `edited_after_lock` + `edited_at` + `edited_by` on the line item (DEC-216 wrap shape tolerates without Base44 schema change).
- **`peopleMap` extension on `useWorkspacePeople`** preserved through Phase 2.5 rollback as scaffolding — Phase 2.6.1 polish target migrates four duplicate `parseWorkers` inline helpers to it.

**Phase 2.6.2 follows after 2.6.1 lands.** FSChangeOrder gets `group_by_trade`, `taxonomy_preset_id`, `trade_categories_snapshot`, `trade_group_order` fields + backfill migration (single-secret protocol — MIGRATION_SECRET kept live from today's rollback) + CO surface turn-on with same UX as Estimates.

## Known Issues (Carried Forward)

1. `community-node/docs/migration-research.md` — supposed to be deleted post-DEC-175; still present.
2. **DECISIONS.md drift** between Spec-Repo and community-node — this ship-it cycle re-syncs them per DEC-182 (was 0-1 line off pre-cycle; mirror-perfect after).
3. Stray Cursor references in Spec-Repo outside today's PROJECT-BRAIN scope.
4. Persistent Base44 SDK 404 console spam (gates dev-preview verification; production verification via Base44 Act-As-User preview).
5. Duplicate `DC` key React warning in Radix Select.
6. `Business.categories` field empty in Base44 (DEC-176) — pending Phase 5 cleanup.
7. FSDocumentTemplate `rls.update` creator-only — workaround documented. **Action item under DEC-215:** when FSDocumentTemplate next needs `asServiceRole` writes, remove `rls.update` (don't relax it).
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
20. **Estimate edit lifecycle gating** (surfaced 2026-05-07) — partial closure today via `isEstimateLocked` + `isChangeOrderLocked` extractions; full closure remains a deeper architectural conversation.
21. **Drift visibility question** (2026-05-07).
22. **Patricia signing-flow bug — STRUCTURALLY UNBLOCKED 2026-05-08** as side-effect of DEC-215. Verification on a non-Patricia test estimate pending; PDF + hand-signature workaround can retire after that confirmation.
23. Light-theme `--primary-foreground` collision with bg-white wrapper.
24. **~~Vite stale dev-server error in `FieldServiceProjects.jsx:331`~~ — RESOLVED 2026-05-09.** Yesterday's `projectIdToEstimate` redeclaration phantom from May 8 4:20 PT cleared on its own when the dev server was restarted after the Phase 2.5 rollback. New Vite dev server compiled cleanly with no errors.
25. **`subs_enabled` feature flag gates BOTH Subs AND Vendors sections** in FieldServicePeople — sensible default but worth a per-section gate eventually if a contractor wants subs but not vendor records.
26. **`FSPayment.rls.update` is PRESENT** — DEC-215 prerequisite blocker for any future `asServiceRole` writes targeting FSPayment (e.g., a backfill of `party_id` on existing payments). Phase 2.4 doesn't trigger this (no asServiceRole writes against FSPayment in this build).
27. **workers_json privacy on public ClientPortal** (NEW 2026-05-09) — ClientPortal reads the full FieldServiceProfile entity which includes `workers_json` (sub names + business_names; `primary_trade_id` stripped post-rollback). FieldServiceProfile has `permissions.read: true`. Anyone with a `portal_token` URL can fetch the contractor's full sub roster — Bari's competitive list of subs is exposed. Phase 2.5 didn't widen this exposure (read was already returning workers_json before Phase 2.5), but the issue is real. Fix is server-side: add a `getPublicFieldServiceProfile` server function that strips `workers_json` and returns only what ClientPortal needs (`business_name`, `brand_color`, `workspace_name`, `trade_categories_json`, `features_json`). Estimated build: ~30-45 min. Defer until directory exposure escalates or Bari complains.

## Organism Milestones (this window)

- **Phase 2.5 round-trip closed end-to-end** — build → ship → rollback → migration → idempotent confirm in ~2.5 hours (~10:00–11:35 PT). First "build then deliberately roll back" cycle on the platform. Promoted "Half-done isn't done" from session principle to formal DEC-218 + foundational PROJECT-BRAIN principle.
- **Phase 2.6 spec authored + sign-off audited + patched + build-ready** in one session arc. Hyphae's exploratory architecture audit (~45 min) + sign-off audit (~25 min) caught the load-bearing CO parity gap and three hallucinated/wrong DEC references before Phase 2.6.1 build kickoff. DEC-219 ratified as Mycelia hygiene rule for DEC citation verification.
- **Six migrations applied cumulatively** — `migrate-flat-layout-inversion`, `migrate-flat-layout-rename`, `migrate-trade-categories-snapshot-backfill`, `migrate-company-name-to-business-name`, `migrate-add-workers-json-ids`, `migrate-strip-primary-trade-id` (today). All running through the shared `migrationHelpers` Deno function with the `pre-migration-rls-audit.js` Living Feet helper as the discipline gate. `MIGRATION_SECRET` kept live across rollback → Phase 2.6.2 sequence (single-secret protocol).
- **Two structural DECs ratified** — DEC-216 (wrap-shape rule) and DEC-217 (shadcn Select width discipline) on 2026-05-08. Today added DEC-218 (Half-done isn't done — feature-evaluation discipline) and DEC-219 (DEC citation verification — Mycelia hygiene).
- **First cmdk consumer in the codebase (Phase 2.4)** — `<SubVendorPicker>` lit up the shipped-but-unused Command primitive.
- **Phase 2.3 implementation gap closed (Phase 2.4 §0a)** — workers_json items now have stable `id` field.
- **Client-as-Hub architectural direction captured** (Phase 3 candidate spec at `Spec-Repo/spaces/field-service/CLIENT-AS-HUB-SPEC.md`).
- **Phase 2.6 line-item entry redesign spec captured** at `Spec-Repo/spaces/field-service/PHASE-2-6-LINE-ITEM-ENTRY-REDESIGN.md` — supersedes original Phase 2.6 polish scope from Phase 2 sign-off doc §7.8 reconciliation.

## In Flight

None. Phase 2.5 round-trip closed; Phase 2.6 spec build-ready; Phase 2.6.1 queued for tomorrow.

## Active Blockers

None.

## Upcoming Priorities

1. **Phase 2.6.1 build** (~3-4.5h focused build with @dnd-kit + ~1h Doron-in-loop verification, single commit). Spec at `2b8686d`. Build queued for 2026-05-10. Three-component decomposition (`<LineItemForm>` + `<LineItemsByTrade>` + `<LineItemRow>`); entry-form-plus-groups workflow on FSEstimate alone; @dnd-kit drag-and-drop; confirm dialog for signed-doc edit interception; soft-delete-with-undo. Bundles `parseWorkers` deduplication via `peopleMap` as polish target.
2. **Phase 2.6.2 build** (~2-3h focused build) — FSChangeOrder schema additions (`group_by_trade`, `taxonomy_preset_id`, `trade_categories_snapshot`, `trade_group_order`) + backfill migration (`migrate-strip-primary-trade-id` MIGRATION_SECRET kept live from today's rollback) + CO surface turn-on with same UX as Estimates. Follows after 2.6.1 lands.
3. **Patricia signing-flow regression check** (Doron, optional) — verify in-platform signing on a non-Patricia test estimate before retiring KI #22 workaround.
4. **Phase 2 closes** after 2.6.1 + 2.6.2.

Open queue (carry-forward):

**Small wins:**
- Client Detail Documents section (per DEC-213).
- `useConsumePrefill` hook extraction (DEC-148 threshold met).
- `<RecordSection>` primitive extraction (four-instance threshold met).
- `useDrillInNavigators` hook extraction (five-instance threshold met).
- `<TradeGroupedItemsTable />` component extraction (NEW today — 2 consumers, 3rd likely Phase 2.6).
- `src/utils/fsInvalidations.js` helper file.
- `migrationRunner` factory (5 runners share shape; threshold met; defer until next runner write).
- `appendToWorkersJson(profile, newPerson)` helper at 2-instance threshold (PersonModal + Phase 2.4 quick-add).

**Medium architectural:**
- Estimate edit lifecycle gating discipline conversation (KI #20 — partial closure today).
- Documents tab restructuring (DEC-213 second half).
- Cross-entity link chain audit (per DEC-206 footnote).
- Client-as-Hub Phase 3 candidate (spec captured today).

**Phase 3+ (real architectural conversations needed first):**
- FSPayment edit capability (DEC-214 deferred work).
- 8 open questions on Log-Line-Item Attribution Proposal.
- Returns and refunds.
- Client Communication tab on Project Detail (Bari's surfaced need).
- Light-theme print collision fix.
- FieldServiceReport.jsx printNode migration.
- Drift visibility question.

**Carry-forward not specific to today:** Estimate Types expansion; Insurance toggle as %; Hourly rate verification; PDF formatting polish; Documents UX session; Dan Sikes logo Gemini variants; Nursery launch session; Phase 4.2-tiles-5 / 4.2-tiles-7 / Per-business workspace wiring / Phase 4.6 / 4.7 / Phase 5 / Phase 6; Engagement scoped-query server function; Field Instrument as first Supabase + Vercel build (DEC-184); NODE-LAB-MODEL.md phase-review note for Field Service crossing production-shaped; Newsletter "The Good News."
