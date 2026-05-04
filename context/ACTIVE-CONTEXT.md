# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-05-04 (Phase 1 functionally complete + dogfood-verified through three bug-fix rounds; Stewardship Space spec captured)

## Current Focus

**Field Service Phase 1 is functionally complete and dogfood-verified.** Across the May 1–3 window, three bug-fix rounds closed every Phase 1 dogfood-surfaced issue Doron hit while running real estimates against Bari (Red Umbrella, Patricia Heath ADU build, EST-2026-005 ~30 line items) and Dan Sikes (Contractor Daily field tester). All fixes verified by Doron in Base44 Act-As-User preview as of 2026-05-04. Bari's Patricia Heath estimate is entered, generates a correct multi-page PDF in the live published surface, and is ready for Bari's pre-send cleanup.

**Four new DECs ratified across the window** (DEC-198 through DEC-201): `printNode` helper as canonical print mechanism in iframe-wrapped surfaces; list/detail query-key invalidation pairs travel together; required-field UX standard with asterisk + client-side toast; Stewardship Space as strategic principle.

**Stewardship Space spec captured** (`Spec-Repo/spaces/stewardship/STEWARDSHIP-SPACE.md`, DEC-201). Strategic principle, not a build commitment — full architectural shape of the Steward role, the Stewardship Space as a future workspace alongside Field Service / Recess / Harvest / Creative Alliance / Gathering Circle, steward-mediated pricing, and the TCA-to-stewardship developmental pipeline. Build sequencing: post-Phase 6 Supabase migration; pre-migration Doron-as-steward runs the role informally for Bari and Dan with the architectural shape already settled.

**Tomorrow's first move:** Estimate invalidation sweep (covers `saveMutation`'s bare-array `invalidateQueries` form per DEC-196 and the per-project FSChangeOrder key gap per DEC-199 — same root-cause family, one focused sweep). Parallel queue: Insurance toggle as % (held for Doron thinking), Hourly rate verification, Estimate Types expansion (deferred Phase 1 architectural feature), PDF formatting polish (dedicated session), Log → Project surface architecture with line-item attribution (Phase 2 milestone), Dan Sikes logo Gemini variants, Documents UX session (Doron noticed Document creation requires a client and questioned whether it should — held for the dedicated session, not a bug fix).

## Active Architecture

### Field Service Phase 1 (shipped 2026-04-30, dogfood-verified through 2026-05-04)

- **CO math primitive (DEC-193):** `signChangeOrder` + `voidChangeOrder` server functions; FSProject.total_budget recomputes from CO `amount` (canonical), not `total` (display).
- **Feature flag canonicalization (DEC-194):** `features_json` is the single source of truth; all reads through `getFeatures(profile)`. Eight flags in FEATURE_DEFAULTS.
- **Management Fee distinct from O&P (DEC-195):** Two first-class features, both subtotal-only, never stack. Display order locked: **Subtotal → Management Fee → O&P → Other → Tax → Total**.
- **Cache invalidation discipline (DEC-196):** `invalidateFSProfiles(queryClient, userId)` helper targets the actual subscriber queryKey (`['mylane-profiles-v2', userId]`), not the previously-stale `['fs-profiles']`. Living Feet helper across 10 invalidation sites.
- **Opt-in default for billing-shape toggles (DEC-197):** Five fee/insurance toggles default `false`; four standard infrastructure flags default `true`.
- **Universal capture surface (Log) — Phase 1 Item 4:** Daily Log + Sub Payment + Client Payment, write FSPayment with proper direction + party fields.
- **Project Detail financial header (Phase 1 Item 5):** Contract / Received / Paid Out / Net Cash banner.
- **Polish primitives:** `CurrencyInput` (10 sites), `scrollToTopOf` helper.
- **CO Void schema + UX:** Two-step typed-VOID confirmation; voided records preserved as legal artifact; `signed | accepted` filter naturally excludes them.

### Phase 1 dogfood-fix rounds (May 1–3, dogfood-verified May 4)

#### May 1 — PDF saga (commits `83faaba`, `ca7e9df`, `e91b696`, `8fec399`)

- **VoiceInput import regression** (`83faaba`) — restored after `e72e28c` regression.
- **First PDF fix attempt** (`ca7e9df`) — `:has()`-based @media print stylesheet + filename via `document.title` swap; verified against synthetic DOM, worked in standalone render.
- **`printNode` helper** (`e91b696`) — when first fix failed inside Base44's Act-As-User preview iframe (parent document was being printed, content clipped to iframe element height), routed all "print this DOM subtree" surfaces through a fresh hidden iframe with copied stylesheets and `iframe.contentWindow.print()`. Sidesteps parent-frame constraints. FSDocument migrated.
- **Lesson** (`8fec399`) — saved to `community-node/CLAUDE.md`: synthetic DOM verification is not production verification when the rendering surface is non-standard. Now captured as DEC-198.

#### May 3 — Bug bundle (commits `cb26d4e`, `60c72cd`, `bdd90e4`, `a0c8a56`)

- **Log rollup query-key gap** (`cb26d4e`) — FSLog mutation invalidated `fs-materials-all` / `fs-labor-all` but not the per-project keys `fs-project-materials` / `fs-project-labor` / `fs-project-photos` that the project DETAIL view's `projectSpent` rollup subscribes to. Detail-view totals stayed stale until React Query's 5-min staleTime expired. Closed by adding the per-project keys to the FSLog invalidation list. Now captured as DEC-199.
- **Tab nav reset** (`cb26d4e`) — `MyLaneDrillView` is the platform's single workspace tab nav; tap-on-active was a state no-op leaving inner components parked in detail/form/edit views. Added `tabResetKey` integer that bumps on tap-on-active and threads into the rendered `TabComponent`'s `key` prop, force-remounting the inner component so its internal `view` state resets. One-change-covers-all-workspaces.
- **PDF filename triple-set** (`cb26d4e`) — yesterday's `printNode` fixed page-clipping but the filename in deep-nested iframes (Base44 top → app preview iframe → printNode iframe) was still falling back to a parent-frame title. Triple-set covers every reachable angle: `<title>` tag in iframe HTML, `iframe.contentDocument.title` via JS after `document.close()`, and the parent app's `document.title` swapped for print duration. Now part of DEC-198.
- **Required-field UX audit + fixes** (`bdd90e4`) — Doron hit a raw Base44 schema error on Daily Log's empty Work Completed textarea (tasks_completed required at entity level, neither marked nor validated). Audited every Field Service form for the same gap shape. Six fields fixed across five forms (Daily Log tasks_completed, Estimate title, Document Template title + content, Permit Inspection type, Change Order title). Now captured as DEC-200.
- **CLAUDE.md seedlings** (`60c72cd`, `a0c8a56`) — list/detail query-key pair pattern, tab nav tap-on-active reset pattern, printNode triple-title-set rationale, canonical asterisk pattern with explicit decline of a shared `<RequiredField>` wrapper.

#### May 4 — Verification + strategic capture

- **All May 1–3 fixes verified by Doron in Base44 Act-As-User preview:** tab nav reset works, log rollup updates immediately on save, required-field UX shows the right toasts, PDF filename works correctly on the live surface (Doron's own estimates). Only remaining filename quirk is in deep iframe nesting in Act-As-User preview specifically — a debug-surface artifact, not a user-facing bug.
- **Stewardship Space spec captured** (`Spec-Repo/spaces/stewardship/STEWARDSHIP-SPACE.md`) — DEC-201. Strategic principle: a Steward is a real person in a real community who uses LocalLane for their own work AND serves as local contact for other businesses in their geography. Pricing is steward-mediated. Compensation tied to active circulation (no passive income). The Stewardship Space is a future workspace alongside Field Service / Recess / Harvest / Creative Alliance / Gathering Circle. Build sequencing: post-Phase 6 Supabase migration. Three operational tensions named for future sessions (pricing-as-bottleneck, transparency between businesses, incentive risk on percentage-of-dynamic-pricing).

### Phase 4.2-tiles (parallel workstream, last shipped 2026-04-28)

- Phase 4.2-tiles structurally complete: tiles-1 (generic Tile primitive), tiles-2 (BreadcrumbPath), tiles-3 (TilesCockpit at root), tiles-4 (per-business folder rendering, space-type catalog), plus cleanup (Field Service removed from Personal). Six commits in community-node, six in Spec-Repo on 2026-04-28.
- Engagement entity built in Base44 (DEC-192). Doron-Bari retainer is the first instance pending UI build.
- Tiles-5 queued: Settings + Profile workspace surfaces + pricing-structure design conversation.

### Cross-cutting

- **Multi-machine infrastructure live (DEC-181)** — Mac mini primary, MacBook Pro 2017 secondary.
- **Single-source documentation policy (DEC-182)** — Spec-Repo canonical; community-node mirrors refreshed per ship-it.
- **Schema-conformance discipline (DEC-167 / DEC-177 / DEC-178)** — code-level changes pair with Base44 prompts.
- **Mylane Agent v2, smart routing, shell containment** — all live, no regressions from May fixes.
- **Health score:** 87/100 (unchanged).

## Migration Plan (DEC-175 — Pattern C+)

- **Trigger:** Phase 6 (Region foundation backfill window).
- **Target stack:** Supabase + Vercel.
- **Sandbox:** `lanecountyrecess.com`. `locallane.app` stays on Base44 during construction.
- **AI:** retire all 8 Base44 agents at migration; build single warm-presence companion fresh, designed from Bari's "AI tour guide" framing.
- **Stewardship Space build window:** post-migration, after the Supabase entity model lands. Pre-migration the role runs informally with Doron-as-steward serving Bari and Dan.

## Field Instrument (sibling product, separate from LocalLane)

- **FIELD-INSTRUMENT-SEED.md committed to `private/` root 2026-04-26**. v0.1 protocol live-tested 2026-04-24 with Pedrom Rejai. Standalone LLC under Mycelia LLC, sibling to LocalLane.
- **DEC-184** — Field Instrument as first Supabase + Vercel build, develops in slow hours alongside Phase 4/5.

## What Just Shipped (May 1–4 window)

**Commits across community-node:**
1. **2026-05-01** — `83faaba` (VoiceInput import fix), `ca7e9df` (first PDF fix attempt — :has stylesheet + document.title swap), `e91b696` (printNode helper, FSDocument migrated), `8fec399` (CLAUDE.md synthetic-DOM-verification lesson).
2. **2026-05-03** — `cb26d4e` (log rollup invalidation, tab nav reset, PDF filename triple-set), `60c72cd` (CLAUDE.md seedlings: query-key pair, tab nav reset, printNode triple-title), `bdd90e4` (required-field UX audit + fixes across 5 forms), `a0c8a56` (CLAUDE.md canonical asterisk pattern).
3. **2026-05-04** — Doc-only ship-it commit (this one).

**Commits across Spec-Repo:**
- **2026-05-04** — Stewardship Space spec placement (`spaces/stewardship/STEWARDSHIP-SPACE.md`), DEC-198 through DEC-201, ACTIVE-CONTEXT refresh, SESSION-LOG append, STATUS-TRACKER row, LAUNCH-CHECKLIST shipped items.

## Decisions Ratified Across the Window

- **DEC-198** — `printNode` helper as canonical print mechanism in iframe-wrapped surfaces.
- **DEC-199** — List/detail query-key invalidation pairs travel together.
- **DEC-200** — Required-field UX standard: asterisk + client-side toast, no schema errors leak to user.
- **DEC-201** — Stewardship Space as strategic principle (future workspace, steward-mediated pricing, compensation tied to active circulation).

## Strategic Clarifications Still in Force

- **Phase 3.5 (Direct Doors) deferred to post-migration** per DEC-179.
- **Phase 5 (Pre-Migration Cleanup)** between Phase 4.5 and Phase 6 per DEC-180.
- **Payment infrastructure deferred to post-migration.** Membership gate (DEC-155) and Stripe Connect both move to the post-migration window.

## Field Service Node — Production-Shaped + Dogfood-Verified

Bari is the first external paying user; Phase 1 Field Service is dogfood-verified end-to-end. Multi-category classification working post-Build F. Score ~95/100. **Bari's Patricia Heath estimate (EST-2026-005, ~30 line items, ADU build at 88154 5th St Veneta, total ~$170K) is entered, generates correct multi-page PDF, ready for Bari's pre-send cleanup.** Per-business Desk wiring still owed for tiles-5+ (Field Service workspace assumes personal scope today; `MyLaneDrillView.jsx:53` resolves `fieldServiceProfiles?.[0]`).

## Known Issues (Carried Forward)

1. **`community-node/docs/migration-research.md`** — supposed to be deleted post-DEC-175; still present.
2. **DECISIONS.md drift** between Spec-Repo (DEC-201) and community-node (last full entry DEC-148) — pre-existing; new DECs from this window appended to community-node copy with the gap noted at the append point.
3. **Stray Cursor references in Spec-Repo** outside today's PROJECT-BRAIN scope. Queued for May 4 Monthly Sharpening.
4. **Persistent Base44 SDK 404 console spam** on every page load — source unknown, not user-visible.
5. **Duplicate `DC` key React warning** in Radix Select — cosmetic seedling.
6. **`Business.categories` field empty in Base44** (DEC-176) — pending Phase 5 cleanup.
7. **FSDocumentTemplate `rls.update` creator-only** — workaround documented.
8. **Phase 2 FieldServiceProfile + User `security.update: true` with no RLS** — wide-open by design for migration; post-migration membership gate re-tightens.
9. **Base44 publish blocker** — escalation request `95a004a0` still open.
10. **Base44 auto-push behavior** — DEC-162 working agreement mitigates.
11. **Overlay z-indices hardcoded** — z-50/55/60; refactor when third stacked-overlay scenario appears.
12. **ClaimBusiness + BusinessEditDrawer cleanup** pending (Phase 5 candidate per DEC-180).
13. **Footer renders on non-MyLane pages** — limited purpose now.
14. **JoinFieldService welcome-card "Go to desk"** soft-broken (gracefully degrades to no-op).
15. **Engagement Read permission** set to authenticated; row-level scoping in query logic. RLS replaces post-Supabase-migration.
16. **Estimate `saveMutation` bare-array `invalidateQueries(['fs-estimates', ...])`** — silent no-op per DEC-196. After saving a new estimate, the list query may not refresh. Same root cause family as the log rollup bug. Closed in next sweep.
17. **FSChangeOrder per-project query key `['fs-change-orders', selectedProject?.id]`** may not be invalidated by all CO mutation paths. Same sweep candidate.
18. **Permit edit/inspection labels** use `text-xs text-muted-foreground/70` instead of `LABEL_CLASS` — visual inconsistency vs the rest of FS forms. Standardize when next touching that file.
19. **`FieldServiceReport.jsx` still uses direct `window.print()`** — low risk (its own tab, not Act-As preview), but should migrate to `printNode` for consistency when next touched.

## Organism Milestones (this window)

- **Phase 1 Field Service dogfood-verified.** Three rounds of bug-fix-and-confirm closed every issue Doron hit. The dogfood loop's bug-find-fix-verify cadence proved the architecture under real usage.
- **printNode helper (DEC-198)** is now the platform's canonical print mechanism for iframe-wrapped surfaces — handles Base44 Act-As-User preview, future embedded hosts, and the eventual Supabase + Vercel sandbox without re-fix.
- **List/detail invalidation pair rule (DEC-199)** added as a structural rule that prevents a class of silent staleness bugs from recurring.
- **Required-field UX standard (DEC-200)** captured as a single canonical pattern; six dogfood-surfaced gaps closed in one audit pass.
- **Stewardship Space spec captured (DEC-201)** — names the role Doron is already running in miniature with Bari and Dan, projects it forward for when communities need stewards Doron doesn't personally know.
- **Synthetic-DOM-verification-is-not-production-verification** lesson saved to CLAUDE.md and DEC-198. The May 1 PDF saga shipped a fix that was correct in isolation but failed in the actual Base44 iframe context — discipline rule for non-standard surfaces now codified.

## In Flight

None. Session window closed in a settled state.

## Active Blockers

None.

## Upcoming Priorities

1. **Estimate invalidation sweep** — covers FieldServiceEstimates `saveMutation`'s bare-array `invalidateQueries` (DEC-196 family) and the per-project FSChangeOrder key gap (DEC-199 family). Same root-cause family, one focused sweep.
2. **Insurance toggle as %** — held for Doron thinking. Small architectural design question about how insurance work surfaces on estimates.
3. **Hourly rate verification** — Doron flagged uncertainty about whether the FSDailyLog labor rate is reading from the right setting. Quick check.
4. **Estimate Types expansion** — deferred Phase 1 architectural feature. Multi-category line items, type-specific templates.
5. **PDF formatting polish** — dedicated session. Currently functional but not styled to brand.
6. **Log → Project surface architecture with line-item attribution** — Phase 2 milestone. How do log entries map to project line items for cost-tracking precision?
7. **Dan Sikes logo Gemini variants** — separate workstream, parallel to Field Service work.
8. **Documents UX session** — Doron noticed Document creation requires a client and questioned whether it should. Held for the dedicated session.
9. **Phase 4.2-tiles-5** — Settings + Profile workspace surfaces + pricing-structure design conversation.
10. **Phase 4.2-tiles-7 (queued)** — Personal Profile + Settings architectural symmetry.
11. **Per-business workspace wiring** for Profile/Desk/Finance/Team — Field Service requires a business-scoped resolver.
12. **JoinFieldService welcome-card "Go to desk" button** fix.
13. **Phase 4.6** — Resurface pass.
14. **Phase 4.7** — Desk rename mechanical pass.
15. **Phase 5 (NEW)** — Pre-migration cleanup per DEC-180.
16. **Phase 6** — Onboarding fork + Region backfill + Pattern C+ migration window (DEC-175).
17. **Post-migration** — Stewardship Space build, Membership gate (DEC-155), Direct Doors (DEC-179), Stripe Connect.
18. **Engagement scoped-query server function** owed during tiles-5+; will retire during Supabase migration.
19. **Field Instrument as first Supabase + Vercel build (DEC-184)** — develops in slow hours alongside Phase 4/5.
20. **NODE-LAB-MODEL.md phase-review note** for Field Service crossing production-shaped (private repo).
21. **Newsletter "The Good News"** — wake dormant accounts.
