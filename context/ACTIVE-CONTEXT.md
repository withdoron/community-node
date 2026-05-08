# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-05-07 (Bari-focused dogfood loop + empty-field derivation + Phase 2 architectural investigation)

## Current Focus

**Today landed three structural arcs.** (1) **Bari-focused dogfood loop** — fourteen feature/fix commits across the day (PDF darkness, Contract Total derivation, drillable tiles, Home tab tile nav, per-row drill nav, projects-list grouping derivation, sweep across 5 sibling surfaces, Documents section on Project Detail, payment scroll-and-flash). Bari's platform is in solid dogfood-ready shape; Patricia signing $182K ADU contract via PDF + hand-signature workaround. (2) **Empty-field derivation through links promoted to platform discipline** (DEC-206) — three primary commits, sweep across 5 sibling surfaces, `useProjectLinkedEstimates.js` hook extracted, codified in CLAUDE.md (`a11ae64`). (3) **Phase 2 architectural investigation completed in parallel Hyphae session** — output at `Spec-Repo/spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md` (uncommitted in working tree, hand-merged when Doron signs off). Three approaches proposed; Approach A recommended; twelve open questions for Doron. Build prompts come AFTER sign-off.

**Strategic shift mid-session:** from "stop platform work for migration" to "fix Bari's experience first, migrate after" (DEC-207). Phase 6 Supabase migration deferred until Bari reliability + Phase 2 sign-off both gate-clear. Today's patterns are portable across migration.

**Nine new DECs ratified today:** DEC-206 (empty-field derivation), DEC-207 (migration deferred), DEC-208 (no debrief without commit hash), DEC-209 (honest navigation > pretend navigation), DEC-210 (print-fidelity at variable layer), DEC-211 (time-logging for AI build sessions), DEC-212 (spec citation re-verification), DEC-213 (Documents architecture inversion), DEC-214 (FSPayment edit deferred to Phase 2 financial-layer).

**Tomorrow's first move:** Doron reviews `Spec-Repo/spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md` and answers the five load-bearing open questions (approach choice, taxonomy presets, CSI codes optional/absent, Patricia data migration, markup mode deferral). After sign-off, focused Phase 2 build prompts come from Mycelia. Then return to the open queue (Estimate Types, Insurance toggle, Hourly rate verification, PDF formatting polish, Documents UX session, Log→Project line-item attribution sign-off, Dan Sikes logo Gemini variants).

## Active Architecture

### Field Service Phase 1 (shipped 2026-04-30, dogfood-verified through 2026-05-07)

- **CO math primitive (DEC-193):** `signChangeOrder` + `voidChangeOrder` server functions; FSProject.total_budget recomputes from CO `amount` (canonical), not `total` (display).
- **Feature flag canonicalization (DEC-194):** `features_json` is the single source of truth; all reads through `getFeatures(profile)`. Eight flags in FEATURE_DEFAULTS.
- **Management Fee distinct from O&P (DEC-195):** Two first-class features, both subtotal-only, never stack. Display order locked: **Subtotal → Management Fee → Insurance Fee → O&P → Other → Tax → Total**.
- **Cache invalidation discipline (DEC-196 + DEC-199 + DEC-202):** `invalidateFSProfiles(queryClient, userId)` helper. Bare-array form canonically banned; list/detail key pairs travel together. Refresh-on-save universal across the platform.
- **Opt-in default for billing-shape toggles (DEC-197):** Five fee/insurance toggles default `false`; four standard infrastructure flags default `true`.
- **Universal capture surface (Log) — Phase 1 Item 4:** Daily Log + Sub Payment + Client Payment, write FSPayment with proper direction + party fields.
- **Project Detail financial header (Phase 1 Item 5):** Contract / Received / Paid Out / Net Cash banner. Today: Contract Total derived read-time from linked estimate (DEC-206).
- **Polish primitives:** `CurrencyInput` (10 sites), `scrollToTopOf` helper.
- **CO Void schema + UX:** Two-step typed-VOID confirmation; voided records preserved as legal artifact; `signed | accepted` filter naturally excludes them.
- **printNode helper (DEC-198):** canonical print mechanism in iframe-wrapped surfaces. Triple-title-set covers Chrome's filename source in deep-nested iframes. Variable-layer print-fidelity discipline added today (DEC-210).
- **Required-field UX standard (DEC-200):** asterisk + client-side toast, no Base44 schema errors leak to user.

### Today's structural patterns (load-bearing for future builds)

- **Empty-field derivation through links (DEC-206):** `useProjectLinkedEstimates.js` hook + `deriveProjectClient` companion. Three-instance threshold met. Direct field always wins; empty falls through to linked entity; pure read-time, no auto-write back. Same shape applies to other entity link chains (team↔workspace, sub↔FSPeople, FSPayment.party_name↔FSClient) — audit when next touching.
- **localStorage cross-tab prefill — fourth instance:** `fs-document-prefill-id` + `fs-document-prefill-project-id` join `fs-log-prefill-type`, `fs-log-prefill-log-id`, `fs-estimate-prefill-id`. DEC-148 threshold crossed; `useConsumePrefill` hook extraction queued.
- **Entity-rollup section family on Project Detail — fourth instance:** Documents joins Permits / Change Orders / Recent Payments. `<RecordSection>` primitive extraction queued.
- **Drill-in navigator helper family — fifth instance:** `goToPaymentRow` joins `goToEstimatePreview`, `goToLogForRecord`, `goToCOOnPage`, `onLogPayment`. `useDrillInNavigators` hook extraction queued.
- **Honest navigation > pretend navigation (DEC-209):** when destination action isn't supported, no navigation is more honest than half-navigation; when honest navigation IS available (scroll-and-highlight to existing on-page section), take it instead of closing modal silently.
- **Print-fidelity at the variable layer (DEC-210):** change one CSS variable, every consumer benefits; attribute selector handles Tailwind alpha-modifier classes that bypass the variable layer.

### Process discipline

- **No-debrief-without-commit-hash (DEC-208):** every build debrief leads with the commit hash; uncommitted work surfaces explicitly with "⚠ work not yet committed." Codified in CLAUDE.md.
- **Spec citation re-verification (DEC-212):** Mycelia re-reads cited spec sections from canonical before writing prompts that depend on them. Extension of DEC-151 (Spec Review Protocol) to spec citations, not just codebase audits.
- **Time-logging for AI build sessions (DEC-211):** start time, end time, commit count, complexity tag, scope-expansion flag per Hyphae session. Calibration substrate; ~4-6 weeks until estimates become reliable.

### Strategic principles in force (carry-forward)

- **Two-World Architecture (DEC-203)** — foundational principle in PROJECT-BRAIN.md. Inside organism: relational. Outside: legal/protected. Bridge: honest translation. Decision filter for every future build.
- **Stewardship Space (DEC-201)** — strategic principle, future workspace. Steward-mediated pricing. Compensation tied to active circulation.
- **Nursery Model (DEC-204) + Mycelia-as-bank (DEC-205)** — Mycelia LLC as sovereign nursery; transplant rather than exit; explicit annual capital allocation budget.
- **Documents architecture inversion (DEC-213)** — documents live where they're used; flat global list dissolves into inbox + templates + search.
- **FSPayment edit deferred (DEC-214)** — tied to Phase 2 financial-layer sign-off (Log-Line-Item Attribution + Spent redefinition + returns/refunds).

### Phase 4.2-tiles (parallel workstream, last shipped 2026-04-28)

- Phase 4.2-tiles structurally complete: tiles-1 through tiles-4 + cleanup. Tiles-5 (Settings + Profile workspace surfaces + pricing-structure design) queued.
- Engagement entity built in Base44 (DEC-192). Doron-Bari retainer is the first instance pending UI build.

### Cross-cutting

- **Multi-machine infrastructure live (DEC-181)** — Mac mini primary, MacBook Pro 2017 secondary.
- **Single-source documentation policy (DEC-182)** — Spec-Repo canonical; community-node mirrors refreshed per ship-it.
- **Schema-conformance discipline (DEC-167 / DEC-177 / DEC-178)** — code-level changes pair with Base44 prompts.
- **Mylane Agent v2, smart routing, shell containment** — all live.
- **Health score:** 87/100 (unchanged).

## Migration Plan (DEC-175 + DEC-207)

- **Trigger:** Phase 6 (Region foundation backfill window per DEC-172) AND Bari reliability AND Phase 2 architectural sign-off (per DEC-207's added gates).
- **Target stack:** Supabase + Vercel.
- **Sandbox:** `lanecountyrecess.com`. `locallane.app` stays on Base44 during construction.
- **AI:** retire all 8 Base44 agents at migration; build single warm-presence companion fresh.
- **Stewardship + Nursery build window:** post-migration. Pre-migration both roles run informally — Doron-as-steward serving Bari and Dan; Mycelia LLC as nursery for Gina (first adult-tier).

## Field Instrument (sibling product, separate from LocalLane)

- **FIELD-INSTRUMENT-SEED.md committed to `private/` root 2026-04-26**. v0.1 protocol live-tested 2026-04-24 with Pedrom Rejai. Standalone LLC under Mycelia LLC, sibling to LocalLane.
- **DEC-184** — Field Instrument as first Supabase + Vercel build.

## What Just Shipped (May 7)

**Commits across community-node (in order):**
- `488973e` — PDF font darkness via variable-level overrides
- `e950fd5` — Contract Total derivation + drillable tiles + ProjectTileDrillIn.jsx
- `f55975c` — V2 PDF darkness — alpha-modifier handling
- `ed75cdf` — Single print dialog idempotency guard
- `3328c79` — Syntax error repair (printNode template literal)
- `82503b0` — CLAUDE.md no-debrief-without-commit-hash
- `2111d11` — Bidirectional estimate-project link
- `72dc441` — Home tab tile navigation (4 of 6)
- `18a9ecc` — Per-row drill-into-source navigation
- `5f35c0f` — Projects list grouping client derivation
- `2aaef46` — Empty-field derivation sweep + useProjectLinkedEstimates hook
- `a11ae64` — CLAUDE.md empty-field derivation pattern
- `193f4e8` — Documents section on Project Detail
- `fae9b01` — Payment drill-in scroll-and-flash on Recent Payments

**Commits across Spec-Repo (this ship-it):**
- This commit — `platform/DECISIONS.md` (DEC-206 through DEC-214 appended), `context/ACTIVE-CONTEXT.md` (refresh), `context/SESSION-LOG.md` (May 7 entry), `platform/STATUS-TRACKER.md` (row), `platform/checklists/LAUNCH-CHECKLIST.md` (items).

**Commits across private (this ship-it):**
- This commit — strategic context files for migration deferral, time-logging discipline, spec re-verification, FSPayment edit deferral, Documents architecture inversion, Phase 2 investigation framing pushbacks, Bari's surfaced needs.

**Mirrored to community-node (this commit):**
- `context/PROJECT-BRAIN.md` synced (no foundational changes today).
- `context/ACTIVE-CONTEXT.md` synced.
- `context/SESSION-LOG.md` synced.

**Phase 2 proposal status:** uncommitted in Spec-Repo working tree at `spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md`. Awaiting Doron's review tomorrow morning. Hand-merged after sign-off.

## Decisions Ratified Today (May 7)

- **DEC-206** — Empty-field derivation through links.
- **DEC-207** — Migration deferred pending Bari reliability + Phase 2 sign-off.
- **DEC-208** — No debrief without commit hash.
- **DEC-209** — Honest navigation > pretend navigation.
- **DEC-210** — Print-fidelity discipline at the variable layer.
- **DEC-211** — Time-logging for AI build sessions.
- **DEC-212** — Spec citation re-verification (extends DEC-151).
- **DEC-213** — Documents architecture inversion (live where used).
- **DEC-214** — FSPayment edit capability deferred to Phase 2 financial-layer.

## Strategic Clarifications Still in Force

- **Phase 3.5 (Direct Doors) deferred to post-migration** per DEC-179.
- **Phase 5 (Pre-Migration Cleanup)** between Phase 4.5 and Phase 6 per DEC-180.
- **Payment infrastructure deferred to post-migration.** Membership gate (DEC-155) and Stripe Connect both move to the post-migration window.
- **Phase 6 migration further gated** on Bari reliability + Phase 2 sign-off per DEC-207.

## Field Service Node — Production-Shaped + Dogfood-Stable + Empty-Field Derivation Universal

Bari is the first external paying user; Phase 1 Field Service is dogfood-verified end-to-end + refresh-on-save universal + empty-field derivation universal across project↔client surfaces. Score ~95/100. Bari's Patricia Heath estimate (EST-2026-005, 30+ line items, ADU build at 88154 5th St Veneta, total ~$182K) signed via PDF + hand-signature workaround (separate signing-flow bug — FSEstimate Update permissions blocking unauthenticated client signing). Per-business Desk wiring still owed for tiles-5+ (Field Service workspace assumes personal scope today; `MyLaneDrillView.jsx:53` resolves `fieldServiceProfiles?.[0]`).

## Items Needing Doron's Verification in Base44 Act-As-User Preview (today's commits)

- **PDF darkness end-to-end** — open Bari's Patricia Heath estimate, generate PDF, confirm muted-foreground and foreground-soft text are darker, no alpha-modifier classes leak through pale.
- **Contract Total derivation** — open a project linked to a signed estimate; confirm Contract Total tile reads from the estimate's signed total + signed COs, not stored `total_budget`.
- **Drillable tiles** — tap each financial header tile; confirm drill-in modal opens with right rows + math; tap math input on derived tiles re-targets drill-in.
- **Bidirectional link derivation** — open project with `client_id` empty but linked-estimate's `client_id` set; confirm client name shows on Project Detail header, list cards, drill-in subtitles.
- **Documents section on Project Detail** — Test Project shows Documents section; document card click navigates to Documents tab detail view; "+ Add Document" navigates to create flow with project + derived client pre-selected.
- **Payment drill-in scroll-and-flash** — Received tile → row click → modal closes, Recent Payments scrolls into view, matching row rings primary-gold ~1.5s. Same for Paid Out.
- **Mobile viewport** — exercise above at phone width; confirm 44px tap targets preserved.

## Phase 2 Architectural Review (Tomorrow Morning)

Doron reads `Spec-Repo/spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md`. Five load-bearing questions:

1. **Approach A vs B vs C** — recommendation: A (Light Promotion + Sub Picker).
2. **Trade taxonomy presets** — three proposed (Bari General Contractor 13-trade / CSI MasterFormat 16-division / Simple Three-Bucket); fourth for service_provider workspaces?
3. **CSI codes optional or absent** — recommendation: optional, off by default.
4. **Patricia's existing data after default flip** — recommendation: leave Unallocated, Bari assigns when ready.
5. **Markup modes** — recommendation: defer per-trade and per-line markup to Phase 3.

After sign-off, focused Phase 2 build prompts come from Mycelia.

## Known Issues (Carried Forward)

1. **`community-node/docs/migration-research.md`** — supposed to be deleted post-DEC-175; still present.
2. **DECISIONS.md drift** between Spec-Repo (now DEC-214) and community-node (last continuous entry DEC-148; DECs 198–214 appended at the end with mirror-gap notice) — pre-existing.
3. **Stray Cursor references in Spec-Repo** outside today's PROJECT-BRAIN scope. Queued for May Monthly Sharpening.
4. **Persistent Base44 SDK 404 console spam** on every page load — source unknown, not user-visible.
5. **Duplicate `DC` key React warning** in Radix Select — cosmetic seedling.
6. **`Business.categories` field empty in Base44** (DEC-176) — pending Phase 5 cleanup.
7. **FSDocumentTemplate `rls.update` creator-only** — workaround documented.
8. **Phase 2 FieldServiceProfile + User `security.update: true` with no RLS** — wide-open by design for migration.
9. **Base44 publish blocker** — escalation request `95a004a0` still open. Recurring throughout the day; Kathy's workaround required for every code commit to land on `locallane.app`.
10. **Base44 auto-push behavior** — DEC-162 working agreement mitigates.
11. **Overlay z-indices hardcoded** — z-50/55/60; refactor when third stacked-overlay scenario appears.
12. **ClaimBusiness + BusinessEditDrawer cleanup** pending (Phase 5 candidate per DEC-180).
13. **Footer renders on non-MyLane pages** — limited purpose now.
14. **JoinFieldService welcome-card "Go to desk"** soft-broken (gracefully degrades to no-op).
15. **Engagement Read permission** set to authenticated; row-level scoping in query logic. RLS replaces post-Supabase-migration.
16. **Permit edit/inspection labels** use `text-xs text-muted-foreground/70` instead of `LABEL_CLASS` — visual inconsistency vs the rest of FS forms. Standardize when next touching that file.
17. **`FieldServiceReport.jsx` still uses direct `window.print()`** — low risk; should migrate to `printNode` for consistency.
18. **Shared invalidation helpers** (`src/utils/fsInvalidations.js` with `invalidateEstimates`, `invalidateProjects`, `invalidateLogs`, plus today's `invalidateDocuments`) — strong Living Feet candidate.
19. **Query-key naming drift** — three inconsistencies worth standardizing eventually.
20. **Estimate edit lifecycle gating** (NEW) — drill-in opens estimate as preview (read-only), not edit. Per Doron: "we don't want someone saving changes to a signed and approved estimate." Worth promoting to a full lifecycle gate on the Edit button itself in a future commit.
21. **Drift visibility question** (NEW) — when derivation works perfectly, contractors don't realize their records have empty fields. Visible "derived from estimate" badge or auto-backfill on first view. Conversation when contractor confusion surfaces.
22. **Patricia signing-flow bug** (NEW, carry-forward from May 7) — FSEstimate Update permissions blocking unauthenticated client signing. Patricia using PDF + hand-signature workaround. Separate from today's commits; needs its own fix-or-design pass.
23. **Light-theme `--primary-foreground` collision with bg-white wrapper** (NEW) — latent bug for any future light-theme user printing. Variable-layer fix already in place but not exercised against light theme yet.

## Organism Milestones (this window)

- **Bari-focused dogfood loop closed (May 7).** Patricia signed Bari's $182K ADU contract on the platform via PDF + hand-signature workaround. Every commit today made Bari's surface more reliable.
- **Empty-field derivation pattern formalized as platform discipline (DEC-206).** Three-instance threshold met; sweep across 5 sibling surfaces; helper extracted; codified in CLAUDE.md.
- **Phase 2 architectural investigation complete + awaiting sign-off.** Three approaches proposed; Approach A recommended; twelve open questions for Doron; three structural framing pushbacks (Spec Review Protocol DEC-151 working as designed).
- **Process discipline tightened (DEC-208 + DEC-211 + DEC-212).** Three real-time corrections to drift surfaced during the day.
- **Migration deferral formalized (DEC-207).** Phase 6 gated on Bari reliability + Phase 2 sign-off.

## In Flight

**Phase 2 Unified Architecture Proposal** (uncommitted in Spec-Repo working tree at `spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md`). Awaiting Doron's review tomorrow morning. Hand-merged on sign-off.

## Active Blockers

None.

## Upcoming Priorities

1. **Doron reviews Phase 2 proposal + answers five open questions.** Tomorrow morning.
2. **Verify today's commits in Base44 Act-As-User preview** (PDF darkness, Contract Total derivation, drillable tiles, link derivation, Documents section, payment scroll-and-flash).
3. **Phase 2 build prompts after sign-off** — focused build prompts based on the chosen approach.

Open queue (carry-forward, time estimates DELIBERATELY OMITTED until DEC-211 data accumulates):

**Small wins:**
- Client Detail Documents section (per DEC-213).
- `useConsumePrefill` hook extraction (DEC-148 threshold met).
- `<RecordSection>` primitive extraction (four-instance threshold).
- `useDrillInNavigators` hook extraction (five-instance threshold).
- `src/utils/fsInvalidations.js` helper file.
- DEC-193 backfill consideration (one-shot script for `original_budget` immutability).

**Medium architectural:**
- Estimate edit lifecycle gating discipline conversation.
- Documents tab restructuring (DEC-213 second half).
- Cross-entity link chain audit (per DEC-206 footnote).

**Phase 2 (post-architectural sign-off):**
- Trade-grouped collapsible estimates as platform default.
- Sub picker on workers_json blob (autocomplete).
- Empty-field derivation: line item trade derives from linked sub's primary trade.

**Phase 3+ (real architectural conversations needed first):**
- FSPayment edit capability (DEC-214 deferred work).
- 8 open questions on Log-Line-Item Attribution Proposal (Doron sign-off pending).
- Returns and refunds.
- Client Communication tab on Project Detail (Bari's surfaced need).
- Light-theme print collision fix.
- FieldServiceReport.jsx printNode migration.
- Drift visibility question.

**Carry-forward not specific to today:**
- Estimate Types expansion (Base44 + Hyphae prompts queued) — `fixed_price` / `flat_fee` / `time_and_materials` enum + 4 supporting fields.
- Insurance toggle as % — held for Doron thinking.
- Hourly rate verification — confirm FSDailyLog labor rate reads from the right setting.
- PDF formatting polish — dedicated session.
- Documents UX session — Doron's question about whether Documents should require a client.
- Dan Sikes logo Gemini variants — separate workstream.
- Nursery launch session — capital allocation budget number, plain-language understanding template draft, consulting fee rate, backup commercial kitchens. Before Gina's first event lands.
- Phase 4.2-tiles-5 — Settings + Profile workspace surfaces + pricing-structure design.
- Phase 4.2-tiles-7 (queued) — Personal Profile + Settings architectural symmetry.
- Per-business workspace wiring for Profile/Desk/Finance/Team.
- JoinFieldService welcome-card "Go to desk" button fix.
- Phase 4.6 / 4.7 — Resurface pass + Desk rename mechanical.
- Phase 5 (NEW) — Pre-migration cleanup per DEC-180.
- Phase 6 — Onboarding fork + Region backfill + Pattern C+ migration window (DEC-175 + DEC-207 gates).
- Post-migration — Stewardship Space build, Nursery Model build, Membership gate (DEC-155), Direct Doors (DEC-179), Stripe Connect.
- Engagement scoped-query server function owed during tiles-5+; will retire during Supabase migration.
- Field Instrument as first Supabase + Vercel build (DEC-184) — develops in slow hours.
- NODE-LAB-MODEL.md phase-review note for Field Service crossing production-shaped (private repo).
- Newsletter "The Good News" — wake dormant accounts.
