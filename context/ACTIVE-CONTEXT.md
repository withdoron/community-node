# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-05-04 (evening) (Platform-wide invalidation sweep + Two-World Architecture + Nursery Model spec)

## Current Focus

**Today landed three structural arcs.** (1) **Platform-wide React Query invalidation sweep** (commits `60ebb11` + `e7bd500`) closed 56 silent bare-array invalidations across 21 files plus 6 list/detail coverage gaps in FS surfaces — Doron's long-standing dogfood complaint that "lots of places need a refresh after creation" is now resolved universally. (2) **Stewardship Space spec** (DEC-201, morning) captured the role Doron is already running with Bari and Dan as a future first-class workspace. (3) **Two-World Architecture (DEC-203) + Nursery Model spec (DEC-204) + Mycelia-as-bank (DEC-205)**, all from a single evening conversation prompted by Gina's emerging charcuterie business — three wedding inquiries from her Instagram, no marketing spend, food-art-tier work. The Two-World principle landed at PROJECT-BRAIN.md as a top-level foundational principle alongside Circulation Over Extraction and Dark Until Explored. Phase 1 Field Service is dogfood-verified end-to-end; refresh-on-save is universal.

**Eight new DECs ratified across May 1–4:** DEC-198 (printNode), DEC-199 (list/detail invalidation pairs), DEC-200 (required-field UX), DEC-201 (Stewardship), DEC-202 (invalidation sweep + bare-array banned), DEC-203 (Two-World Architecture), DEC-204 (Nursery Model), DEC-205 (Mycelia-as-bank explicit budget).

**Three new strategic specs in spec-repo:** `spaces/stewardship/STEWARDSHIP-SPACE.md`, `spaces/nursery/NURSERY-MODEL.md`, plus the Two-World section integrated into `context/PROJECT-BRAIN.md`. None of the three has a community-node mirror — strategic specs live in spec-repo canonical only.

**Tomorrow's first move:** spot-check the eight invalidation-sweep verification items in Base44 Act-As-User preview (Estimates create/edit, Client detail edit, CO sign/void, Convert estimate to project, Payment logging, Recommendations, Frequency Station seeds, Admin business edits). Then return to the open queue (Estimate Types, Insurance toggle thinking, Hourly rate verification, PDF formatting polish, Documents UX session, Log→Project line-item attribution, Dan Sikes logo Gemini variants).

## Active Architecture

### Field Service Phase 1 (shipped 2026-04-30, dogfood-verified through 2026-05-04 + invalidation sweep)

- **CO math primitive (DEC-193):** `signChangeOrder` + `voidChangeOrder` server functions; FSProject.total_budget recomputes from CO `amount` (canonical), not `total` (display).
- **Feature flag canonicalization (DEC-194):** `features_json` is the single source of truth; all reads through `getFeatures(profile)`. Eight flags in FEATURE_DEFAULTS.
- **Management Fee distinct from O&P (DEC-195):** Two first-class features, both subtotal-only, never stack. Display order locked: **Subtotal → Management Fee → O&P → Other → Tax → Total**.
- **Cache invalidation discipline (DEC-196 + DEC-202):** `invalidateFSProfiles(queryClient, userId)` helper. Bare-array form canonically banned; list/detail key pairs travel together (DEC-199 → audit-and-fix sweep at DEC-202). Refresh-on-save restored platform-wide.
- **Opt-in default for billing-shape toggles (DEC-197):** Five fee/insurance toggles default `false`; four standard infrastructure flags default `true`.
- **Universal capture surface (Log) — Phase 1 Item 4:** Daily Log + Sub Payment + Client Payment, write FSPayment with proper direction + party fields.
- **Project Detail financial header (Phase 1 Item 5):** Contract / Received / Paid Out / Net Cash banner.
- **Polish primitives:** `CurrencyInput` (10 sites), `scrollToTopOf` helper.
- **CO Void schema + UX:** Two-step typed-VOID confirmation; voided records preserved as legal artifact; `signed | accepted` filter naturally excludes them.
- **printNode helper (DEC-198):** canonical print mechanism in iframe-wrapped surfaces. Triple-title-set covers Chrome's filename source in deep-nested iframes.
- **Required-field UX standard (DEC-200):** asterisk + client-side toast, no Base44 schema errors leak to user.

### Phase 1 dogfood-fix rounds (May 1–3) + invalidation sweep (May 4)

- **May 1 PDF saga** — VoiceInput import fix (`83faaba`), first PDF fix attempt (`ca7e9df`), `printNode` helper (`e91b696`), CLAUDE.md "synthetic DOM verification is not production verification" lesson (`8fec399`).
- **May 3 bug bundle + UX audit** — log rollup query-key gap closed + tab nav reset + PDF filename triple-set (`cb26d4e`), CLAUDE.md seedlings (`60c72cd`), required-field UX audit + fixes across 5 forms (`bdd90e4`), CLAUDE.md canonical asterisk pattern (`a0c8a56`).
- **May 4 morning** — verification + Stewardship Space spec capture + ship-it docs (`e0e89ca` Spec-Repo, `43f7a3e` community-node).
- **May 4 evening — invalidation sweep + Two-World + Nursery** — platform-wide audit closed 56 bare-array no-ops + 6 list/detail coverage gaps (`60ebb11`); CLAUDE.md sub-lessons added (`e7bd500`); Two-World Architecture in PROJECT-BRAIN; Nursery Model spec captured at `spaces/nursery/`.

### Strategic principles captured today

- **Stewardship Space (DEC-201)** — strategic principle, future workspace alongside Field Service / Recess / Harvest / Creative Alliance. Steward-mediated pricing. Compensation tied to active circulation. No passive income. Spec at `Spec-Repo/spaces/stewardship/STEWARDSHIP-SPACE.md`. Build sequencing: post-Phase 6 Supabase migration; pre-migration Doron-as-steward runs the role informally with Bari and Dan.
- **Two-World Architecture (DEC-203)** — foundational principle in PROJECT-BRAIN.md. Inside the organism: plain-language understanding, fee allocations, sovereignty-preserved. Outside: legal contracts, insurance, regulatory compliance. Bridge: honest translation, no confusion of layers. Theologically grounded ("as within so without," Luke 17:21, mustard seed parable, many-rooms image). Decision filter for every future build.
- **Nursery Model (DEC-204)** — strategic principle. Mycelia LLC as sovereign nursery for life-aligned businesses. Transplant rather than exit. Market-rate fee allocations rather than gifts. Contractors not employees. Sovereignty preserved by structural design. First adult-tier participant: Gina's charcuterie business. Spec at `Spec-Repo/spaces/nursery/NURSERY-MODEL.md`. Build sequencing: post-Phase 6.
- **Mycelia as its own bank (DEC-205)** — explicit annual capital allocation budget for nursery participants. Capital advances repaid via revenue-percentage agreements. Downside risk borne by Mycelia per nursery agreement. Budget dollar amount pending the focused nursery launch session.

### Phase 4.2-tiles (parallel workstream, last shipped 2026-04-28)

- Phase 4.2-tiles structurally complete: tiles-1 through tiles-4 + cleanup. Tiles-5 (Settings + Profile workspace surfaces + pricing-structure design) queued.
- Engagement entity built in Base44 (DEC-192). Doron-Bari retainer is the first instance pending UI build.

### Cross-cutting

- **Multi-machine infrastructure live (DEC-181)** — Mac mini primary, MacBook Pro 2017 secondary.
- **Single-source documentation policy (DEC-182)** — Spec-Repo canonical; community-node mirrors refreshed per ship-it.
- **Schema-conformance discipline (DEC-167 / DEC-177 / DEC-178)** — code-level changes pair with Base44 prompts.
- **Mylane Agent v2, smart routing, shell containment** — all live, no regressions from May fixes or sweep.
- **Health score:** 87/100 (unchanged).

## Migration Plan (DEC-175 — Pattern C+)

- **Trigger:** Phase 6 (Region foundation backfill window).
- **Target stack:** Supabase + Vercel.
- **Sandbox:** `lanecountyrecess.com`. `locallane.app` stays on Base44 during construction.
- **AI:** retire all 8 Base44 agents at migration; build single warm-presence companion fresh.
- **Stewardship + Nursery build window:** post-migration. Pre-migration both roles run informally — Doron-as-steward serving Bari and Dan; Mycelia LLC as nursery for Gina (first adult-tier).

## Field Instrument (sibling product, separate from LocalLane)

- **FIELD-INSTRUMENT-SEED.md committed to `private/` root 2026-04-26**. v0.1 protocol live-tested 2026-04-24 with Pedrom Rejai. Standalone LLC under Mycelia LLC, sibling to LocalLane.
- **DEC-184** — Field Instrument as first Supabase + Vercel build.

## What Just Shipped (May 4 evening)

**Commits across community-node:**
- `60ebb11` — platform-wide invalidation sweep (21 files, 56 bare-array fixes + 6 coverage-gap fixes).
- `e7bd500` — CLAUDE.md sub-lessons (audit cadence, list-vs-detail asymmetry, bare-prefix invalidation).
- This ship-it commit — context/PROJECT-BRAIN.md sync (Two-World addition mirrored from canonical), context/ACTIVE-CONTEXT.md sync, context/SESSION-LOG.md sync, DECISIONS.md DEC-202 through DEC-205 appended, STATUS-TRACKER.md row, LAUNCH-CHECKLIST.md items checked.

**Commits across Spec-Repo:**
- This ship-it commit — `spaces/nursery/NURSERY-MODEL.md` (new), `context/PROJECT-BRAIN.md` (Two-World section integrated), `platform/DECISIONS.md` (DEC-202–205), `context/ACTIVE-CONTEXT.md` (refresh), `context/SESSION-LOG.md` (May 4 evening entry), `platform/STATUS-TRACKER.md` (row), `platform/checklists/LAUNCH-CHECKLIST.md` (items).

## Decisions Ratified Across the May Window

- **DEC-198** — `printNode` helper as canonical print mechanism in iframe-wrapped surfaces.
- **DEC-199** — List/detail query-key invalidation pairs travel together.
- **DEC-200** — Required-field UX standard: asterisk + client-side toast, no schema errors leak to user.
- **DEC-201** — Stewardship Space as strategic principle.
- **DEC-202** — React Query invalidation sweep complete; bare-array form canonically banned.
- **DEC-203** — Two-World Architecture as foundational principle.
- **DEC-204** — Nursery Model strategic principle (Mycelia LLC as sovereign nursery for life-aligned businesses).
- **DEC-205** — Mycelia as its own bank for nursery participants — explicit capital allocation budget.

## Strategic Clarifications Still in Force

- **Phase 3.5 (Direct Doors) deferred to post-migration** per DEC-179.
- **Phase 5 (Pre-Migration Cleanup)** between Phase 4.5 and Phase 6 per DEC-180.
- **Payment infrastructure deferred to post-migration.** Membership gate (DEC-155) and Stripe Connect both move to the post-migration window.

## Field Service Node — Production-Shaped + Dogfood-Verified + Refresh-Restored

Bari is the first external paying user; Phase 1 Field Service is dogfood-verified end-to-end + refresh-on-save restored platform-wide. Score ~95/100. Bari's Patricia Heath estimate (EST-2026-005, ~30 line items, ADU build at 88154 5th St Veneta, total ~$170K) is entered, generates correct multi-page PDF, ready for Bari's pre-send cleanup. Per-business Desk wiring still owed for tiles-5+ (Field Service workspace assumes personal scope today; `MyLaneDrillView.jsx:53` resolves `fieldServiceProfiles?.[0]`).

## Items Needing Doron's Verification in Base44 Act-As-User Preview

From the May 4 evening invalidation sweep — these are the surfaces where the bug fix is structurally correct but only Doron can confirm the user-facing refresh-on-save behavior in the production iframe context:

1. **Estimates** — create a new estimate, return to the list, confirm it appears without refresh. Edit an estimate's title, confirm new title shows in list. Click "Send for Signature," confirm status pill updates immediately.
2. **Client edit from detail view** — open a client's detail page, edit name + phone, save. Tap Clients tab → confirm row shows new name and phone without reload.
3. **Change Order sign/void** — confirm `total_budget` updates and CO row shows new status everywhere displayed.
4. **Convert estimate to project** — confirm new project appears in Projects list and estimate's status updates.
5. **Payment logging** — log a Sub Payment, return to FieldServiceHome, confirm Net Cash updates. Return to Project Detail, confirm Paid Out metric updates.
6. **Recommendations** ([Recommend.jsx](src/pages/Recommend.jsx)) — give a Nod or Vouch, return to Directory listing, confirm badge appears without reload. *Possibly the longest-standing silent bug — 12 silent no-ops in one file.*
7. **Frequency Station** — submit a seed, confirm it appears in My Seeds without reload.
8. **Admin Business edits** — edit a business in the admin panel, confirm list shows the updated row without reload.

## Known Issues (Carried Forward)

1. **`community-node/docs/migration-research.md`** — supposed to be deleted post-DEC-175; still present.
2. **DECISIONS.md drift** between Spec-Repo (now DEC-205) and community-node (last continuous entry DEC-148; DECs 198–205 appended at the end with mirror-gap notice) — pre-existing.
3. **Stray Cursor references in Spec-Repo** outside today's PROJECT-BRAIN scope. Queued for May Monthly Sharpening.
4. **Persistent Base44 SDK 404 console spam** on every page load — source unknown, not user-visible.
5. **Duplicate `DC` key React warning** in Radix Select — cosmetic seedling.
6. **`Business.categories` field empty in Base44** (DEC-176) — pending Phase 5 cleanup.
7. **FSDocumentTemplate `rls.update` creator-only** — workaround documented.
8. **Phase 2 FieldServiceProfile + User `security.update: true` with no RLS** — wide-open by design for migration.
9. **Base44 publish blocker** — escalation request `95a004a0` still open.
10. **Base44 auto-push behavior** — DEC-162 working agreement mitigates.
11. **Overlay z-indices hardcoded** — z-50/55/60; refactor when third stacked-overlay scenario appears.
12. **ClaimBusiness + BusinessEditDrawer cleanup** pending (Phase 5 candidate per DEC-180).
13. **Footer renders on non-MyLane pages** — limited purpose now.
14. **JoinFieldService welcome-card "Go to desk"** soft-broken (gracefully degrades to no-op).
15. **Engagement Read permission** set to authenticated; row-level scoping in query logic. RLS replaces post-Supabase-migration.
16. **Permit edit/inspection labels** use `text-xs text-muted-foreground/70` instead of `LABEL_CLASS` — visual inconsistency vs the rest of FS forms. Standardize when next touching that file.
17. **`FieldServiceReport.jsx` still uses direct `window.print()`** — low risk; should migrate to `printNode` for consistency.
18. **Shared invalidation helpers** (`src/utils/fsInvalidations.js` with `invalidateEstimates`, `invalidateProjects`, `invalidateLogs`) — strong Living Feet candidate; four-key set repeats 8x at FSEstimate alone. Deferred to a separate refactor commit (not bundled with the bug-fix sweep).
19. **Query-key naming drift** — three inconsistencies worth standardizing eventually: profile-scoped vs bare key forms; `['fs-payments', projectId]` vs `['fs-payments-all']`; three names for "photos for one project" (`fs-client-photos`, `fs-project-photos`, `fs-timeline-photos`). Document for now, restructure later.

## Organism Milestones (this window)

- **Phase 1 Field Service dogfood-verified + refresh-on-save universal.** Three rounds of bug-fix-and-confirm closed every issue Doron hit. The dogfood loop's bug-find-fix-verify cadence proved the architecture under real usage.
- **printNode helper (DEC-198)** is now the platform's canonical print mechanism for iframe-wrapped surfaces.
- **List/detail invalidation pair rule (DEC-199)** + **invalidation sweep (DEC-202)** added as structural rules + audit-completed state that prevents a class of silent staleness bugs from recurring.
- **Required-field UX standard (DEC-200)** captured as a single canonical pattern.
- **Stewardship Space (DEC-201) and Nursery Model (DEC-204)** specs captured.
- **Two-World Architecture (DEC-203)** named at the foundational level as the principle the platform's economic + relational structure rests on.
- **Mycelia-as-bank discipline (DEC-205)** — explicit capital allocation budget rather than ad-hoc allocations.

## In Flight

None. Session window closed in a settled state.

## Active Blockers

None.

## Upcoming Priorities

1. **Verify the eight invalidation-sweep items in Base44 Act-As-User preview (Doron's task — list above).** First move tomorrow.
2. **Estimate Types expansion** (Base44 + Hyphae prompts queued) — `fixed_price` / `flat_fee` / `time_and_materials` enum + 4 supporting fields.
3. **Insurance toggle as %** — held for Doron thinking.
4. **Hourly rate verification** — confirm FSDailyLog labor rate reads from the right setting.
5. **PDF formatting polish** — dedicated session.
6. **Documents UX session** — Doron's question about whether Documents should require a client.
7. **Log → Project surface architecture with line-item attribution** — Phase 2 milestone.
8. **Dan Sikes logo Gemini variants** — separate workstream.
9. **Shared invalidation helpers refactor** — Living Feet, separate commit.
10. **Query-key naming drift cleanup** — separate commit.
11. **Nursery launch session** — capital allocation budget number, plain-language understanding template draft, consulting fee rate, backup commercial kitchens. Before Gina's first event lands.
12. **Phase 4.2-tiles-5** — Settings + Profile workspace surfaces + pricing-structure design.
13. **Phase 4.2-tiles-7 (queued)** — Personal Profile + Settings architectural symmetry.
14. **Per-business workspace wiring** for Profile/Desk/Finance/Team.
15. **JoinFieldService welcome-card "Go to desk" button** fix.
16. **Phase 4.6 / 4.7** — Resurface pass + Desk rename mechanical.
17. **Phase 5 (NEW)** — Pre-migration cleanup per DEC-180.
18. **Phase 6** — Onboarding fork + Region backfill + Pattern C+ migration window (DEC-175).
19. **Post-migration** — Stewardship Space build, Nursery Model build, Membership gate (DEC-155), Direct Doors (DEC-179), Stripe Connect.
20. **Engagement scoped-query server function** owed during tiles-5+; will retire during Supabase migration.
21. **Field Instrument as first Supabase + Vercel build (DEC-184)** — develops in slow hours.
22. **NODE-LAB-MODEL.md phase-review note** for Field Service crossing production-shaped (private repo).
23. **Newsletter "The Good News"** — wake dormant accounts.
