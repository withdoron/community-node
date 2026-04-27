# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-25 (Phase 3 closed — Builds F + G + H shipped, Base44 schema fix, multi-machine infrastructure live)

## Current Focus

**Round 1 Phase 3 is closed.** Eight community-node builds (1-patch, 2, B, C, D, E, F, G, H) plus one Spec-Repo architecture-amendments commit landed across two days (2026-04-24 marathon + 2026-04-25 closeout). The cockpit-native business switcher is functional end-to-end, public surfaces filter on `listed_in_directory`, profile Settings has editors for every previously-uneditable rendered field, "Jobsite" is gone from the user-visible vocabulary in favor of "Desk," cockpit and workspace content both center cleanly on wide viewports, `service_area` is structured `array<slug>` with a matching Base44 dashboard schema, and multi-category support is live end-to-end via `subcategories[]` with the SDK wrap foundation in `src/api/` validated by its first real consumer. Bari Swartz is the first external paying user ($500 retainer, 2026-04-24). **Today (2026-04-25)** also brought the multi-machine infrastructure migration — Mac mini up as primary alongside MacBook Pro, paths aligned at `~/Documents/GitHub/`, all four repos on SSH on both machines. **Phase 4 is next.**

## Active Architecture

- **Cockpit-native business switcher live (DEC-168):** `useActiveBusiness()` hook + `localStorage` key `locallane.activeBusinessId`. Spinner renders nested switcher spinner accessed by tapping the space-name pill; only wakes when `isMultiBusiness`. Build 1 commit-handler patch (`c0d7c3f`) made center-tile commits fire reliably.
- **Directory visibility (Build 2):** `src/utils/directoryVisibility.js` is the single filter helper. Public surfaces (`Directory.jsx`, `NetworkPage.jsx`, `Home.jsx`) all read through it. Build F.3 (`bb76fbc`) patched the Directory pill filter to drive off the new `subcategories[]` shape.
- **Profile Settings editors (Build B):** universal `services[]` structured editor, tagline, photos gallery, accepts toggles, empty-state nudge. Subtitle ladder on `BusinessProfile`: tagline → category label → "New to LocalLane."
- **Desk vocabulary (Build C, DEC-170):** user-visible "Jobsite" replaced with "Desk" in MyLane label + welcome map + HomeFeed priority spinner. `FieldServiceAgent` persona text intentionally preserved.
- **Cockpit + workspace centering (Builds D + H):** dead `panel-open` margin-right rule removed (Build D); workspace content layer matched the same fix (Build H, `9c3d080`). Clean centering at 375 → 2560 px across both layers.
- **Service area structured (Build E, DEC-174):** `src/config/laneCountyTowns.js` exports a 21-town curated list. `service_area` on Business is `array<slug>`. Base44 dashboard schema now matches (DEC-178 fix applied 2026-04-25). Legacy strings preserved verbatim with owner-only "(legacy)" annotation.
- **Multi-category support (Build F, DEC-176/177):** `subcategories[]` is the canonical multi-category shape (DEC-055). `SlugMultiSelect` (renamed from TownMultiSelect in F.2) is the reusable component. `src/api/` SDK wrap is the new entity-access layer; `updateProfile()` wraps the `updateBusiness` server function path (DEC-177 — write-path conformance, not just field-shape conformance). First migration-prep seam-hardening per DEC-175.
- **Desk tile icon (Build G):** HardHat → Briefcase. Cosmetic; HardHat read as Field Service-specific for what is now the universal Desk surface.
- **Architecture v4.1 closure (`955f8e2`):** DEC-169 (folder architecture), DEC-170 (Home collapses into Desk), DEC-171 (path-based direct doors Round 1), DEC-172 (Region as first-class entity), DEC-173 (resurface before rebuild).
- **Production Business tree (Phase 2 state preserved):** Mycelia, LLC → LocalLane / TCA / Recess; Red Umbrella is Bari's peer; sandbox archived. 9 Phase 2 AuditLog rows still reversible.
- **Two-tier FSDocumentTemplate (DEC-163), business-first branding (DEC-164), template preview (DEC-165), Bari's contracts loaded (DEC-166), schema-conformance audit protocol (DEC-167)** — all live from 2026-04-23.
- **Mylane Agent v2, smart routing, shell containment** — all live, no regressions from any Phase 3 build.
- **Health score:** 87/100 (unchanged).

## Migration Plan (DEC-175 — Pattern C+)

- **Trigger:** Phase 6 (Region foundation backfill window). One fragility cost, not two.
- **Target stack:** Supabase + Vercel.
- **Sandbox:** `lanecountyrecess.com`. `locallane.app` stays on Base44 during construction.
- **AI:** retire all 8 Base44 agents at migration. Build a single warm-presence companion fresh, designed from Bari's "AI tour guide" framing.
- **Seam hardening:** Build F bundled the SDK wrap into `src/api/`, validated end-to-end (multi-category was the first consumer). `updateProfile()` wraps the server-function write path per DEC-177.
- **Reference:** `community-node/docs/migration-research.md` (commit `78fc8c7`; flagged for cleanup).

## Multi-Machine Infrastructure (DEC-181, new today)

- **Primary:** Mac mini (more powerful, eventual Clawbot host).
- **Secondary:** MacBook Pro 2017 (mobility, field visits to Bari).
- **Both machines:** GitHub Desktop, Claude Desktop, Claude Code (Hyphae) v2.1.119, Node.js v24.15.0 with `~/.npm-global` prefix, SSH keys to github.com/withdoron, all four repos at `~/Documents/GitHub/` (community-node, Spec-Repo, private, ephraim-games), all remotes SSH.
- **Discipline:** pull as the first action of any session, push after every commit. Already standard, now load-bearing for multi-machine.
- **Today's smoke test:** path-alignment commit (`29351e4` Spec-Repo) shipped from the mini via Hyphae; this closeout commit is the second loop. Round-trip works.

## What Just Shipped (2026-04-25, Phase 3 closeout + multi-machine)

1. **Build F.1 (`946b9eb`):** SDK wrap foundation + businessCategories config hoist.
2. **Build F.2 (`cd8d700`):** TownMultiSelect → SlugMultiSelect rename (generalization for subcategories use).
3. **Build F.3 (`bb76fbc`):** SlugMultiSelect wired into BusinessSettings + Directory pill filter patch + `updateProfile()` wrap amendment per DEC-177. Closes Build F.
4. **Build G (`a2c46b5`):** Desk tile icon HardHat → Briefcase.
5. **Build H (`9c3d080`):** workspace content centering on wide viewports. Closes Phase 3.
6. **Base44 schema fix:** `Business.service_area` field type `string` → `array<string>` (DEC-178).
7. **Path alignment commit (`29351e4` Spec-Repo):** `~/Documents/LocalLane/` → `~/Documents/GitHub/` across docs.
8. **DEC-176 through DEC-181** recorded in this Spec-Repo closeout commit.

## Strategic Clarifications (today)

- **Phase 3.5 (Direct Doors) deferred to post-migration** per DEC-179. Bari has redumbrellaservices.com — no farmers-market URL pressure. Direct Doors will be built once on the post-migration stack, not twice.
- **New Phase 5 (Pre-Migration Cleanup) added** per DEC-180. Inserted between Phase 4.5 and Phase 6.
- **Payment infrastructure deferred to post-migration.** Membership gate (was Phase 5, DEC-155) and Stripe Connect (was Round 2) move to the post-migration window.

## Field Service Node — Production-Shaped

Bari is the first external paying user. Multi-category classification working end-to-end after Build F. Score nudged to ~95/100. Node now considered production-shaped given paying-user dependency. **Flag:** NODE-LAB-MODEL.md (private repo) likely needs a phase-review note — Field Service may have crossed a node-phase threshold. Not updated this session (private repo, separate scope).

## Known Issues

1. **`community-node/docs/migration-research.md`** was supposed to be deleted post-decision per its own ephemeral note; still present in main as of `78fc8c7`. Cleanup owed in a future community-node commit.
2. **DECISIONS.md drift** between Spec-Repo and community-node — pre-existing, not touched today. Future: dedicated audit/merge session.
3. **community-node `context/` files diverged** from Spec-Repo (`ACTIVE-CONTEXT.md`, `STATUS-TRACKER.md`, `SESSION-LOG.md`, `PROJECT-BRAIN.md` all dated 2026-04-15). Same pattern as DECISIONS.md drift; same recommendation — dedicated session.
4. **Persistent Base44 SDK 404 console spam** on every page load — source unknown, not user-visible, root-cause investigation seedling logged.
5. **Duplicate `DC` key React warning** in Radix Select (likely state-code Select) — cosmetic seedling logged.
6. **`Business.categories` field empty in Base44** (DEC-176) — added in error during Build F verify, left in place pending Phase 5 cleanup.
7. **FSDocumentTemplate `rls.update` creator-only** — workaround documented; logged in private/TECH-DEBT.md.
8. **Phase 2 FieldServiceProfile + User `security.update: true` with no RLS** — wide-open by design for migration; post-migration membership gate re-tightens. Logged.
9. **Base44 publish blocker** — escalation request `95a004a0` still open. Affects DEC-115 deploy of Mylane write capability. No new agent writes blocked by this for the Phase 3 builds.
10. **Base44 auto-push behavior** — DEC-162 working agreement mitigates; expect "File changes" commits any entity-change session.
11. **Overlay z-indices hardcoded** — z-50/55/60; refactor when third stacked-overlay scenario appears.
12. **ClaimBusiness route + BusinessEditDrawer claim URLs** — co-presence model retires this; cleanup pending (Phase 5 candidate per DEC-180).
13. **Footer renders on non-MyLane pages** — limited purpose now.

## Organism Milestones (this session)

- **Multi-machine infrastructure live (2026-04-25):** Mac mini up as primary alongside MacBook Pro. First Hyphae session from the mini doubled as round-trip smoke test (path-alignment commit shipped from mini, will be pulled on laptop).
- **Phase 3 closed (2026-04-25):** All planned Round 1 Phase 3 builds shipped.
- **Active paying members: 1** (Bari, $500 retainer 2026-04-24).

## In Flight

None. Phase 3 closed in a settled state.

## Active Blockers

None.

## Upcoming Priorities

1. **Phase 4** — Desk implementation rename + business-scoped rendering (DEC-160, DEC-156); MyLaneSurface hook reordering; MyLaneDrillView latent bug fix; eslint-plugin-react-hooks exhaustive-deps enforcement; resurfacing buried surfaces per DEC-173.
2. **Phase 4.5** — Seedlings (Admin Impersonation, post-migration welcome flow).
3. **Phase 5 (NEW)** — Pre-migration cleanup per DEC-180 (dead code, vestigial patterns, unused entities, archetype/main_category/sub_category_id consolidation, walking-the-app cleanup findings).
4. **Phase 6** — Onboarding fork + Region backfill + **Pattern C+ migration window** (DEC-175).
5. **Post-migration** — Membership gate ($9/mo per entity, DEC-155); Direct Doors (DEC-179, was Phase 3.5); Stripe Connect (real money flow + legacy grace population per DEC-159).
6. **Carryovers** — `community-node/docs/migration-research.md` cleanup; DECISIONS.md drift audit + merge session; community-node `context/` doc-drift audit.
7. **NODE-LAB-MODEL.md phase-review note** for Field Service (private repo, separate session).
8. **Newsletter "The Good News"** — wake dormant accounts.
