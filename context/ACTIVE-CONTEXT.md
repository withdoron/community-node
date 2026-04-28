# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-28 (Phase 4.2-tiles structurally complete — tiles-1 through tiles-4 + cleanup all shipped; Engagement entity built; eight new DECs ratified)

## Current Focus

**Phase 4.2-tiles is structurally complete.** Tile cockpit is the v1 default for all users; spinner and compass cockpits are gated behind `COCKPIT_PICKER_ALLOWLIST` (DEC-147 pattern + new DEC-188). Six tile-cockpit sub-builds shipped today across community-node + Spec-Repo per DEC-183 path-walking — generic Tile primitive, BreadcrumbPath component, tile cockpit at root, per-business folder rendering, plus a Field-Service-from-Personal cleanup. First consumer of `Business.enabled_spaces` (Phase 4.1's dormant field) lit up in tiles-4. Two regression fixes (joyCoinCost TDZ, network-undefined defensive gap) caught and shipped in flight, both surfaced when tile cockpit routed more users through the Events flow. Engagement entity created in Base44 with one Read permission deviation noted (Base44 multi-field OR limitation; row-level scoping moves to query logic, RLS replaces post-migration). Engagements design fully closed (DEC-192). **Tomorrow's first move:** Phase 4.2-tiles-5 — Settings + Profile workspace surfaces + pricing-structure design conversation.

## Active Architecture

- **Phase 4.2-tiles structurally complete (2026-04-28)** — tiles-1 (generic Tile primitive at `src/components/ui/Tile.jsx`), tiles-2 (BreadcrumbPath at `src/components/ui/BreadcrumbPath.jsx`), tiles-3 (TilesCockpit at `src/components/mylane/TilesCockpit.jsx`, default for all users with allowlist-gated picker), tiles-4 (per-business folder rendering, space-type catalog at `src/config/spaceTypes.js`, DEC-148/DEC-168 retired for tile users) plus cleanup (Field Service removed from Personal — Desk is a business-only space per the city/buildings metaphor). Six commits in community-node, six in Spec-Repo today.
- **Space-type catalog (DEC-190)** — `src/config/spaceTypes.js` is the third living-feet config in the codebase (alongside `folderTree.js` and `folderPredicates.js`). Eight entries: `profile`, `settings`, `desk`, `finance`, `team`, `kitchen`, `property`, `events`. Profile + Settings flagged `universal: true` per DEC-186. Helper `resolveBusinessSpaces(business)` unions universal pair with `enabled_spaces` and dedupes. First consumer is `TilesCockpit`'s per-business space tile grid.
- **Cockpit picker pattern (DEC-188)** — `COCKPIT_PICKER_ALLOWLIST` in `MyLaneSurface.jsx` parallels the existing `MYLANE_AGENT_ALLOWLIST`. Allowlisted users see the AccountOverlay's three-option cockpit toggle (tiles → spinner → compass); non-allowlisted users see no toggle (DEC-147 — no placeholder). Force-migration in MyLaneSurface mount effect bumps non-allowlisted users from spinner/compass to tiles.
- **Uniform navigation pattern (DEC-191)** — for tile cockpit users, every root tile descends into the render layer. Directory and Events render their page content inline (not as DEC-148 overlays). Businesses descends to a tile grid of owned businesses (not the DEC-168 lateral switcher). Spinner cockpit users (allowlisted only) keep both DEC-148 overlays and DEC-168 switcher exactly as before.
- **Engagement entity built in Base44 (2026-04-28)** — design fully closed via DEC-192. First instance (Doron-Bari retainer) pending entity availability + UI build. Read permission deviation: row-level scoping in query logic, not schema-level (Base44 multi-field OR limitation). Pattern: post-Supabase migration, RLS policy `(auth.uid() = initiator_id) OR (auth.uid() = recipient_id)` replaces this workaround. Engagements remains a parallel workstream not yet integrated into Phase 4 sequencing.
- **Phase 4 fully-planned state (2026-04-26 evening) — superseded by tile pivot today.** `PHASE-4-MIGRATION-PLAN.md` Sections 8.13–8.17 capture the new tiles sequence. Original 4.2b/4.3/4.4/4.5 absorbed into Phase 4.2-tiles. Phase 4.6/4.7 unchanged. Section 8.18 (next) will document tiles-5 when it ships.
- **Path-walking cadence (DEC-183) held** — six sub-builds today, each inspected before the next was scoped. Tiles-1 produced the primitive that compounded into tiles-3 and tiles-4 cleanly. The third living-feet config (`spaceTypes.js`) emerged naturally from tiles-4's design rather than being pre-engineered.
- **Multi-machine infrastructure live (DEC-181)** — Mac mini primary, MacBook Pro 2017 secondary. Today's full session ran from the mini.
- **Single-source documentation policy (DEC-182)** — Spec-Repo is canonical. `community-node/context/` mirrors are refreshed by drift-sync passes. Today's session-end commit syncs the mirror.
- **Schema-conformance discipline (DEC-167 / DEC-177 / DEC-178)** — code-level Base44 entity changes ship paired with Base44 prompts. Today's Engagement entity creation was a Base44-only change (no code yet); future Engagement code work will read from this entity.
- **Mylane Agent v2, smart routing, shell containment** — all live, no regressions from tiles work.
- **Health score:** 87/100 (unchanged).

## Migration Plan (DEC-175 — Pattern C+)

- **Trigger:** Phase 6 (Region foundation backfill window). One fragility cost, not two.
- **Target stack:** Supabase + Vercel.
- **Sandbox:** `lanecountyrecess.com`. `locallane.app` stays on Base44 during construction.
- **AI:** retire all 8 Base44 agents at migration. Build a single warm-presence companion fresh, designed from Bari's "AI tour guide" framing.
- **Seam hardening:** Build F bundled the SDK wrap into `src/api/`, validated end-to-end. `updateProfile()` wraps the server-function write path per DEC-177.
- **Reference:** `community-node/docs/migration-research.md` (commit `78fc8c7`; flagged for cleanup).

## Field Instrument (sibling product, seed-stage, separate from LocalLane)

- **FIELD-INSTRUMENT-SEED.md committed to `private/` root 2026-04-26** (`e00bcda`). Originally drafted 2026-04-12.
- **v0.1 protocol live-tested 2026-04-24** with Pedrom Rejai. Successful — both AIs hit the protocol's posture. Pedrom's AI flagged a framing-bias failure mode.
- **Standalone LLC under Mycelia LLC**, sibling to LocalLane.
- **Companion artifacts** still on laptop; commit alongside `alibi-protocol` GitHub repo setup once Pedrom responds.

## Multi-Machine Infrastructure (DEC-181)

- **Primary:** Mac mini.
- **Secondary:** MacBook Pro 2017 (mobility, field visits to Bari).
- **Discipline:** pull as the first action of any session, push after every commit.

## What Just Shipped (2026-04-28 — Phase 4.2-tiles + Engagements + cleanup)

**Morning + afternoon (single coherent arc):**

1. **Tile cockpit design pivot — Section 5 + 8.13 (`a96ae43` Spec-Repo):** Section 5 sequence updated; Phase 4.2-tiles absorbed 4.2b/4.3/4.4/4.5. Section 8.13 added — eleven locked design decisions.
2. **Engagements design close (`406154b` private):** Three resolved open questions + two architectural flags. Engagements design now structurally locked + all detail questions resolved.
3. **Phase 4.2-tiles-1 — Generic Tile primitive (`a3ac463` community-node, `4598419` Spec-Repo):** New `src/components/ui/Tile.jsx` (121 lines). BusinessCard refactored to wrap it (201 → 184 lines). Three import sites unchanged.
4. **Phase 4.2-tiles-2 — BreadcrumbPath component (`caae822` community-node, `081882b` Spec-Repo):** New `src/components/ui/BreadcrumbPath.jsx` (121 lines). Cockpit-agnostic, two presentation modes. Composes shadcn primitives (DEC-173).
5. **Phase 4.2-tiles-3 — Tile cockpit at root (`77571b7` community-node, `65ff952` Spec-Repo):** New `TilesCockpit.jsx` (158 lines). main.jsx default flipped to tiles. MyLaneSurface +178/-30: COCKPIT_PICKER_ALLOWLIST, force-migration, tileLeafSelected state, AccountOverlay toggle gated.
6. **joyCoinCost TDZ fix (`34bc25a` community-node):** Three derivation lines moved up. Root cause: Base44 auto-builder commit 2026-04-22.
7. **Network undefined fix (`ae2d723` community-node):** Optional-chained four `event.x` reads above the `if (!event) return null;` guard.
8. **Phase 4.2-tiles-4 — Per-business folder rendering + uniform navigation (`84a9889` community-node, `8b94ec1` Spec-Repo):** New `src/config/spaceTypes.js` (123 lines). TilesCockpit grew to 338 lines. MyLaneSurface +150/-54. Dev Lab removed from folder tree. DEC-148/DEC-168 retired for tile users. First consumer of `enabled_spaces`.
9. **Engagement entity (Base44):** All fields per spec. One Read permission deviation noted.
10. **Cleanup — Field Service removed from Personal (`2c01950` community-node, `1551f30` Spec-Repo):** 3 files +14/-14. Briefcase import dropped, `has_field_service_profile` predicate dropped, HomeFeed Estimates card-builder removed. Field Service workspace component preserved for tiles-5+ wiring.

**Decisions ratified today:**

- **DEC-185** — Phase 4.2-tiles design pivot.
- **DEC-186** — Settings as a universal space.
- **DEC-187** — Category-driven tile accents preserved; no `brand_color` v1.
- **DEC-188** — Cockpit picker dev-allowlist via `COCKPIT_PICKER_ALLOWLIST`.
- **DEC-189** — Hybrid-mode breadcrumb component.
- **DEC-190** — Space-type catalog principle.
- **DEC-191** — Uniform navigation; DEC-148/DEC-168 retired for tile users.
- **DEC-192** — Engagements design fully closed.

## Strategic Clarifications (still in force)

- **Phase 3.5 (Direct Doors) deferred to post-migration** per DEC-179.
- **Phase 5 (Pre-Migration Cleanup)** between Phase 4.5 and Phase 6 per DEC-180.
- **Payment infrastructure deferred to post-migration.** Membership gate (DEC-155) and Stripe Connect both move to the post-migration window.

## Field Service Node — Production-Shaped

Bari is the first external paying user. Multi-category classification working end-to-end after Build F. Score ~95/100. Node now considered production-shaped given paying-user dependency. **NODE-LAB-MODEL.md phase-review note still owed** (private repo, deliberate review pending).

**New flag for tiles-5+ planning:** Field Service workspace assumes personal scope today. `MyLaneDrillView.jsx:53` resolves `fieldServiceProfiles?.[0]` — the user's first PERSONAL profile. Per-business Desk wiring needs a business-scoped resolver. Meaningfully more work than a simple dispatch. **Bari's Estimates surface is dark in HomeFeed until tiles-5 wires per-business Desk** (real-user signal blackout window; path-walking acceptable).

## Known Issues

1. **`community-node/docs/migration-research.md`** — supposed to be deleted post-DEC-175; still present.
2. **DECISIONS.md drift** between Spec-Repo and community-node — pre-existing.
3. **Stray Cursor references in Spec-Repo** outside today's PROJECT-BRAIN scope. Queued for May 4 Monthly Sharpening.
4. **Persistent Base44 SDK 404 console spam** on every page load — source unknown, not user-visible.
5. **Duplicate `DC` key React warning** in Radix Select — cosmetic seedling.
6. **`Business.categories` field empty in Base44** (DEC-176) — pending Phase 5 cleanup.
7. **FSDocumentTemplate `rls.update` creator-only** — workaround documented.
8. **Phase 2 FieldServiceProfile + User `security.update: true` with no RLS** — wide-open by design for migration; post-migration membership gate re-tightens.
9. **Base44 publish blocker** — escalation request `95a004a0` still open.
10. **Base44 auto-push behavior** — DEC-162 working agreement mitigates. Today produced no auto-pushes (entity creation only, no schema changes touched code).
11. **Overlay z-indices hardcoded** — z-50/55/60; refactor when third stacked-overlay scenario appears.
12. **ClaimBusiness + BusinessEditDrawer cleanup** pending (Phase 5 candidate per DEC-180).
13. **Footer renders on non-MyLane pages** — limited purpose now.
14. **JoinFieldService welcome-card "Go to desk"** soft-broken (gracefully degrades to no-op). New today after Field Service removed from Personal. Same shape as existing `'business'` welcome no-op from Section 8.12.
15. **Engagement Read permission** set to authenticated; row-level scoping in query logic. RLS replaces post-Supabase-migration.

## Organism Milestones (this session)

- **Phase 4.2-tiles structurally complete (2026-04-28):** tile cockpit is the v1 default; six sub-builds shipped end-to-end. Foundation for the city/buildings architectural metaphor (Section 8.13) operational. First consumer of `Business.enabled_spaces` lit up.
- **Space-type catalog operational:** `src/config/spaceTypes.js` joins `folderTree.js` and `folderPredicates.js` as the third living-feet config. Future Engagements-as-folder, per-business event spaces, etc. plug in without refactor.
- **Engagement entity built in Base44.** Doron-Bari retainer becomes the first live instance once UI ships.
- **Two regressions surfaced and fixed in flight** — joyCoinCost TDZ from a 2026-04-22 Base44 auto-commit, network-undefined defensive gap exposed by tile cockpit routing. Pattern (Base44 auto-commits warrant code review) saved to SuperMemory.

## In Flight

None. Session closed in a settled state.

## Active Blockers

None.

## Upcoming Priorities

1. **Phase 4.2-tiles-5 — Settings + Profile workspace surfaces + pricing-structure design (TOMORROW'S FIRST MOVE).** Pre-build design conversation about Profile/Settings split-point + pricing-model shape. Pricing field architecture in `spaceTypes.js` (null for now); charging deferred until Stripe integration. Then BusinessSettings lifted from the dashboard tab into a Settings space surface; BusinessProfilePage wired as the Profile space surface.
2. **Phase 4.2-tiles-6 (was tiles-6 in original sequence, retained):** Cockpit picker allowlist gate cleanup or extension as needed. Tile becomes default by force; this build primarily re-verifies the picker behavior and may extract a shared `DEV_USER_ALLOWLIST` if a third allowlist constant lands.
3. **Phase 4.2-tiles-7 (queued):** Personal Profile + Settings — architectural symmetry. Adds `enabled_spaces` (or equivalent) field to User entity in Base44. Personal's Profile + Settings spaces. Public/private toggle. Foundation for user reviews. 2-3 sub-builds.
4. **Per-business workspace wiring** for Profile/Desk/Finance/Team — Field Service specifically needs a business-scoped resolver (`MyLaneDrillView.jsx:53`). Each space type considered carefully in tiles-5+.
5. **JoinFieldService welcome-card** "Go to desk" button fix — small cleanup adjacent to tiles-5 Desk wiring.
6. **Phase 4.6** — Resurface pass (Admin folder, feedback affordance, others) per Section 20 sweep.
7. **Phase 4.7** — Desk rename mechanical pass (~92 strings, ~40 files). Last in Phase 4 per DEC-183 — structural moves rename strings before the mechanical pass would have caught them.
8. **Phase 5 (NEW)** — Pre-migration cleanup per DEC-180. Catalog accumulating; cataloging sweep before migration starts.
9. **Phase 6** — Onboarding fork + Region backfill + Pattern C+ migration window (DEC-175).
10. **Post-migration** — Membership gate (DEC-155); Direct Doors (DEC-179); Stripe Connect.
11. **Engagement scoped-query server function** owed during tiles-5+ area; will retire during Supabase migration.
12. **Field Instrument as first Supabase + Vercel build (DEC-184)** — develops in slow hours alongside Phase 4/5.
13. **May 4 Monthly Sharpening** — Cursor reference sweep; `community-node/docs/migration-research.md` cleanup; DECISIONS.md drift audit + merge session.
14. **NODE-LAB-MODEL.md phase-review note** for Field Service crossing production-shaped (private repo).
15. **Newsletter "The Good News"** — wake dormant accounts.
