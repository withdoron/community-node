# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-05-08 (Phase 2.1 complete: trade-grouping default flip + Unallocated bucket + DEC-215 structural rule for `asServiceRole` writes)

## Current Focus

**Phase 2.1 closed end-to-end today.** Trade-grouping is the platform default (`flat_layout: false`); Unallocated bucket renders for line items without a trade tag; field rename `is_insurance_estimate` → `flat_layout` complete with values inverted via one-shot migration script (`migrate-flat-layout-inversion`, 5 records, 5 AuditLog rows, idempotent). Verified end-to-end via Act-As-User preview as Bari — Patricia's EST-2026-005 renders correctly, toggling "Flat layout" off shows all 30 lines under Unallocated, tagging the Framing line splits into its own group ($11,000 subtotal), total $182,013.69 unchanged across both modes.

**DEC-215 ratified today** — promoted DEC-095 amendment from FieldServiceProfile-specific quirk to a structural rule. When `asServiceRole` writes are involved, the entity's `rls.update` key must be **absent** (not relaxed). Three-instance evidence (FieldServiceProfile fixed 2026-04-23, FSEstimate fixed 2026-05-08, Business as working comparable). Critical safety rail: do not re-add `rls.update` to FSEstimate as part of any future restore — re-adding silently re-breaks every `asServiceRole` write that targets the entity (migrations, signEstimate, etc.).

**Side-effect win:** removing `rls.update` from FSEstimate also structurally resolved **Known Issue #22** (Patricia signing-flow bug). Same root cause as the migration block; the PDF + hand-signature workaround can retire once in-platform signing is verified on a non-Patricia test estimate.

**Tomorrow's first move (Phase 2.2):** taxonomy presets build. The 4 locked presets — Bari General Contractor (13-trade), CSI MasterFormat (16-division), Simple Three-Bucket, Service Provider — Hourly. The seam is `src/utils/fsTradeCategories.js` (extracted today as a Living Feet move when ClientPortal became the second consumer of `getTradeCategories`).

## Active Architecture

### Field Service Phase 2.1 (shipped 2026-05-08, dogfood-verified end-of-day)

- **Trade-grouped estimates as platform default (DEC-206 + 2026-05-08).** `is_insurance_estimate` → `flat_layout` rename + inversion. New estimates default to `flat_layout: false` (trade-grouped). Existing estimates preserved their visual via the migration script (5 records inverted from `flat_layout: false` → `true` to maintain flat render under new code).
- **Unallocated bucket render.** `groupedByTrade` memo keyed by `tc.id` (was: `tc.name`); untagged items collect under sentinel `{ id: '__unallocated__', name: 'Unallocated', order: -1 }` which floats to top. Renders only when at least one untagged item exists; disappears when all items are tagged. Same logic in EstimatePreview + ClientPortal (mirrored render).
- **Living Feet extraction:** `getTradeCategories` + `DEFAULT_TRADE_CATEGORIES` to `src/utils/fsTradeCategories.js`. Two consumers today; Phase 2.2's preset system will be the third (one-file edit).
- **Toggle UI relabeled** "Flat layout — Render line items as a single table, without trade groups." Gated by `xactimate_enabled` per existing convention.
- **Header simplified** from "INSURANCE ESTIMATE" / "ESTIMATE" conditional to plain "ESTIMATE" — insurance-specific labeling deferred to a future per-estimate setting (Phase 2.2 territory).

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
- **Time-logging for AI build sessions (DEC-211).** Calibration data accumulating; first six-row table logged in today's SESSION-LOG entry. Pattern emerging: Hyphae stamps track wallclock for bugfix/execution flavors, exceed wallclock for build/investigation flavors (Hyphae stamps include audit + verification cycle; wallclock starts at handoff and ends at debrief).
- **`rls.update` must be absent on `asServiceRole`-written entities (DEC-215).** Critical safety rail; do not re-add.

### Strategic principles in force (carry-forward)

- **Two-World Architecture (DEC-203)** — foundational principle.
- **Stewardship Space (DEC-201)** — strategic principle, future workspace.
- **Nursery Model (DEC-204) + Mycelia-as-bank (DEC-205).**
- **Documents architecture inversion (DEC-213)** — Project Detail Documents section landed (`193f4e8`); Client Detail + tab restructuring queued.
- **FSPayment edit deferred (DEC-214)** — tied to Phase 2 financial-layer sign-off.

### Phase 4.2-tiles (parallel workstream, last shipped 2026-04-28)

- Phase 4.2-tiles structurally complete: tiles-1 through tiles-4 + cleanup. Tiles-5 queued.

### Cross-cutting

- **Multi-machine infrastructure live (DEC-181).**
- **Single-source documentation policy (DEC-182).**
- **Schema-conformance discipline (DEC-167 / DEC-177 / DEC-178).**
- **Mylane Agent v2, smart routing, shell containment** — all live.
- **Health score:** 87/100 (unchanged).

## Migration Plan (DEC-175 + DEC-207)

- **Trigger:** Phase 6 (Region foundation backfill window per DEC-172) AND Bari reliability AND Phase 2 architectural sign-off (gates per DEC-207). Phase 2 sign-off completed today; Bari reliability gate continues.
- **Target stack:** Supabase + Vercel.
- **Sandbox:** `lanecountyrecess.com`. `locallane.app` stays on Base44.

## Field Instrument (sibling product)

- FIELD-INSTRUMENT-SEED.md committed to `private/` root 2026-04-26. v0.1 protocol live-tested 2026-04-24. Standalone LLC under Mycelia LLC.
- DEC-184 — Field Instrument as first Supabase + Vercel build.

## What Just Shipped (May 8)

**Spec-Repo (this ship-it cycle):**
- This commit — `platform/DECISIONS.md` (DEC-215 appended), `context/ACTIVE-CONTEXT.md` (full refresh), `context/SESSION-LOG.md` (May 8 entry appended), `platform/STATUS-TRACKER.md` (Phase 2.1 milestone row), `platform/checklists/LAUNCH-CHECKLIST.md` (items checked off, KI #22 status updated).
- Earlier today (`67b11df`) — Phase 2 proposal sign-off (status header + §13 + closing line).

**community-node:**
- `6c3573f` — Field rename `is_insurance_estimate` → `flat_layout` + migration script.
- `4996051` — Unallocated bucket render + Living Feet extraction.
- `cecec99` — ClientPortal hooks order fix (Rules of Hooks compliance, post Base44 preview catch).
- `fe774fc` (Base44 auto-sync) — FSEstimate.jsonc post-rename schema.
- (Later Base44 auto-sync — FSEstimate.jsonc post-rls.update-removal + security.update restore.)
- This commit (mirror sync) — `context/PROJECT-BRAIN.md`, `context/ACTIVE-CONTEXT.md`, `context/SESSION-LOG.md`, `DECISIONS.md`, `STATUS-TRACKER.md`, `checklists/LAUNCH-CHECKLIST.md` synced from Spec-Repo. CLAUDE.md note pointing to DEC-215 (rls.update structural rule).

**Migration log:**

| Date | Migration | Records | AuditLog rows | Status |
|---|---|---|---|---|
| 2026-04-23 | Phase 2 production migration | varied | 9 | Complete |
| 2026-04-23 | Bari template loading | 2 | 2 | Complete |
| 2026-05-08 | migrate-flat-layout-inversion | 5 | 5 | Complete (idempotent re-run confirmed) |

## Decisions Ratified Today (May 8)

- **DEC-215** — `rls.update` must be absent on entities receiving `asServiceRole` writes (structural rule, three-instance threshold met).

## Strategic Clarifications Still in Force

- **Phase 3.5 (Direct Doors)** deferred to post-migration per DEC-179.
- **Phase 5 (Pre-Migration Cleanup)** between Phase 4.5 and Phase 6 per DEC-180.
- **Payment infrastructure** deferred to post-migration.
- **Phase 6 migration** further gated on Bari reliability + Phase 2 sign-off (DEC-207). Phase 2 sign-off done; Bari reliability gate continues.

## Field Service Node — Phase 2.1 Complete + Verified

Bari is the first external paying user; Phase 2.1 dogfood-verified via Act-As-User preview today. Score ~95/100 (no change). Patricia's EST-2026-005 ($182,013.69, 30+ line items) renders flat by default (visual preserved), Unallocated bucket appears when toggled to trade-grouped, math is layout-independent. Per-business Desk wiring still owed for tiles-5+ (carry-forward).

## Items Needing Doron's Verification

(From today's commits — all checked except Patricia's in-platform signing test.)

1. ✅ EST-2026-005 (Patricia ADU) renders flat by default.
2. ✅ Toggle "Flat layout" OFF on Patricia's estimate → all 30 lines under "Unallocated" bucket at top.
3. ✅ Tag Framing line → splits into Framing group ($11,000 subtotal); Unallocated reduces; total unchanged.
4. ✅ New estimate → trade-grouping default; Unallocated until tagged.
5. ✅ Toggle ON regression check — flat render restores.
6. ✅ Mobile viewport, PDF/print, ClientPortal — all rendering correctly.
7. ✅ AuditLog has 5 `flat_layout_inverted` rows post-migration.
8. **Pending — Patricia signing-flow regression check.** With `rls.update` removed from FSEstimate, signEstimate should now succeed. Before retiring the PDF + hand-signature workaround for KI #22, verify in-platform signing on a non-Patricia test estimate. Optional but valuable.

## Phase 2.2 Up Next

Build prompt forthcoming for taxonomy presets:
- Bari General Contractor — 13-trade list (Bari's 2017 historical Excel format).
- CSI MasterFormat — 16-division list (insurance / commercial work).
- Simple Three-Bucket — minimal (Materials / Labor / Other-shaped).
- Service Provider — Hourly — for Doron's consulting workspace and similar service-provider archetypes (suggested seed: Strategy / Build / Audit / Documentation / Meeting / Review / Travel & Expenses / Other; Hyphae uses judgment on final list).
- CSI codes optional, off by default (per Q4 — workspace setting flips them on per-estimate).
- Settings preset picker UI + "Reset to preset" action with confirm dialog.
- The seam is `src/utils/fsTradeCategories.js`. Replace `DEFAULT_TRADE_CATEGORIES` with a `PRESETS` map; add a workspace field for selected preset id.

## Known Issues (Carried Forward)

1. `community-node/docs/migration-research.md` — supposed to be deleted post-DEC-175; still present.
2. **DECISIONS.md drift** between Spec-Repo (now DEC-215) and community-node (last continuous entry DEC-148; DECs 198–215 appended at the end with mirror-gap notice) — pre-existing.
3. Stray Cursor references in Spec-Repo outside today's PROJECT-BRAIN scope.
4. Persistent Base44 SDK 404 console spam.
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
20. **Estimate edit lifecycle gating** (surfaced 2026-05-07) — discipline conversation.
21. **Drift visibility question** (2026-05-07).
22. **Patricia signing-flow bug — STRUCTURALLY UNBLOCKED 2026-05-08** as side-effect of DEC-215 (rls.update removed from FSEstimate). signEstimate should now succeed. Verification on a non-Patricia test estimate pending; PDF + hand-signature workaround can retire after that confirmation.
23. Light-theme `--primary-foreground` collision with bg-white wrapper.

## Organism Milestones (this window)

- **Phase 2.1 closed end-to-end** — first complete Phase 2 substream. Sign-off → build → migration → verification → restore in ~96 minutes wallclock.
- **DEC-215 promoted from amendment to structural rule** — three-instance threshold met (FieldServiceProfile + FSEstimate + Business). Pattern naming compounds: future migrations inherit the audit checklist.
- **KI #22 (Patricia signing-flow) structurally unblocked** as side-effect — two-for-one outcome.
- **Calibration data accumulating** — first six-row table in SESSION-LOG; Hyphae stamps vs Doron-wallclock distinction emerging.

## In Flight

None. Phase 2.1 complete + restored; Phase 2.2 awaiting build prompt.

## Active Blockers

None.

## Upcoming Priorities

1. **Phase 2.2 — taxonomy presets** (the four locked answers). New focused Hyphae build prompt. Seam at `src/utils/fsTradeCategories.js`.
2. **Patricia signing-flow regression check** (Doron, optional) — verify in-platform signing on a non-Patricia test estimate before retiring KI #22 workaround.
3. **Phase 2.3 — `workers_json` extension** (vendor role + primary_trade_id + business_name).
4. **Phase 2.4 — `<SubVendorPicker>` component** + integration on three surfaces (LineItemsEditor `sub_name`, FSPayment Sub Payment, FSDailyLog labor row).
5. **Phase 2.5 — empty-field trade derivation** from sub's primary trade.
6. **Phase 2.6 — optional reconciliation script** for existing inline `sub_name` strings.

Open queue (carry-forward):

**Small wins:**
- Client Detail Documents section (per DEC-213).
- `useConsumePrefill` hook extraction (DEC-148 threshold met).
- `<RecordSection>` primitive extraction (four-instance threshold met).
- `useDrillInNavigators` hook extraction (five-instance threshold met).
- `<TradeGroupedItemsTable />` component extraction (NEW today — 2 consumers, 3rd likely Phase 2.4).
- `src/utils/fsInvalidations.js` helper file.

**Medium architectural:**
- Estimate edit lifecycle gating discipline conversation.
- Documents tab restructuring (DEC-213 second half).
- Cross-entity link chain audit (per DEC-206 footnote).

**Phase 3+ (real architectural conversations needed first):**
- FSPayment edit capability (DEC-214 deferred work).
- 8 open questions on Log-Line-Item Attribution Proposal.
- Returns and refunds.
- Client Communication tab on Project Detail (Bari's surfaced need).
- Light-theme print collision fix.
- FieldServiceReport.jsx printNode migration.
- Drift visibility question.

**Carry-forward not specific to today:** Estimate Types expansion; Insurance toggle as %; Hourly rate verification; PDF formatting polish; Documents UX session; Dan Sikes logo Gemini variants; Nursery launch session; Phase 4.2-tiles-5 / 4.2-tiles-7 / Per-business workspace wiring / Phase 4.6 / 4.7 / Phase 5 / Phase 6; Engagement scoped-query server function; Field Instrument as first Supabase + Vercel build (DEC-184); NODE-LAB-MODEL.md phase-review note for Field Service crossing production-shaped; Newsletter "The Good News."
