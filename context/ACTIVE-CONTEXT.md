# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-05-23 (Plant 1 Day One close-out — community-node enters maintenance mode for Bari per DEC-223)

## Current Focus

**community-node is in maintenance mode for Bari.** Per DEC-223 (ratified 2026-05-23 in Spec-Repo, mirrored to this repo at commit `3787ccd`), LocalLane is being rebuilt fresh in `withdoron/locallane` on Supabase + Vercel rather than migrated from this Base44 codebase. community-node continues to run `locallane.app` for Bari as his Field Service workspace. No new feature work lands here. Cutover to Plant 1 happens at the end of the Plant 1 session sequence, not as a deadline.

**Plant 1 is the active development frontier.** It lives at `~/Documents/GitHub/locallane/` (`withdoron/locallane`). Deployed at `locallane.vercel.app`. Stack: Next.js 15 + React 19 + Supabase + Tailwind v3 + Sentry.

## Canonical Context Lives in Spec-Repo

For the live state of the gardener-pair's work and the Plant 1 session sequence, read:

- `~/Documents/GitHub/Spec-Repo/context/ACTIVE-CONTEXT.md` — Plant 1 state RIGHT NOW
- `~/Documents/GitHub/Spec-Repo/context/SESSION-LOG.md` — running timeline (includes the full 2026-05-23 Day One entry)
- `~/Documents/GitHub/Spec-Repo/platform/MWP-PROTOCOL.md` — Plant 1 per-session protocol
- `~/Documents/GitHub/Spec-Repo/platform/REBUILD-SCOPE.md` — Plant 1 operational document
- `~/Documents/GitHub/Spec-Repo/platform/DECISIONS.md` — DEC-223 + full DEC history (canonical)

## What's Live in community-node (last shipped state)

**Phase 1.0 commit 1 (`04162a8`, 2026-05-09 — production-verified by Doron).** Line-item attribution on FSPayment + per-line rollup view on Project Detail Financial Ledger + `projectSpent` includes settled FSPayment(paid) + soft-delete schema across FSPayment / FSMaterialEntry / FSLaborEntry / FSDailyLog. Bari's Patricia ADU project ($182,013.69, 30+ line items) renders correctly. LineItemPicker visible on Sub Payment + Client Payment forms; per-line rollup renders Estimated / Billed / Cost / Variance per line + Unallocated row; Spent tile captioned "Materials + labor + sub payments."

**Carries forward from earlier shipped work:** CO math primitive (DEC-193), feature flag canonicalization via `features_json` (DEC-194), Management Fee distinct from O&P (DEC-195), cache-invalidation discipline (DEC-196 + DEC-199 + DEC-202), opt-in fee toggles (DEC-197), `printNode` for iframe-isolated print (DEC-198), variable-layer print discipline (DEC-210), required-field UX standard (DEC-200), empty-field derivation through links (DEC-206), trade-grouped estimates default (Phase 2.1), per-estimate taxonomy snapshot (Phase 2.2), four locked taxonomy presets, workers_json vendor/subcontractor/worker roles (Phase 2.3), `<SubVendorPicker>` typeahead (Phase 2.4), Phase 4.2-tiles cockpit, business switcher + directory visibility + profile editors + Desk vocabulary + structured `service_area` + multi-category + SDK wrap (Phase 3), per-line rollup contractor-only on ClientPortal (DEC-220), `rls.update`-must-be-absent structural rule (DEC-215), `{items: [...]}` wrap for object-typed array fields (DEC-216), shadcn `<Select>` width discipline (DEC-217).

## What's Paused (and Where Each Feature Reappears in Plant 1)

- **Phase 1.0 commit 1.5** (Material/Labor line-item attribution). Spec ratified, Base44 schema agent failure 2026-05-09 ~16:11 PT was the immediate blocker; KI #28 is now moot per the rebuild pivot. Reappears in Plant 1 Session 8 as a native Supabase implementation (line-item attribution everywhere from day one).
- **Phase 1.0 commit 2** (Edit/delete on cost-tracking entities + cleared-payment immutability + Reverse minimum-viable + cascade-delete server function). Spec ratified, blocked on KI #28 (now moot). FSPayment edit form (DEC-214 deferral) reappears in Plant 1 Session 8.
- **Phase 2.6.1 + 2.6.2** (Line item entry redesign + CO parity). Specs ratified, build queued. Both reappear in Plant 1 Session 7 with the entry-form-plus-groups workflow built in from day one.
- **Phase 4.2-tiles-5 through tiles-7** (Settings + Profile workspace surfaces + Personal symmetry). Paused; Plant 1 handles the equivalent via Sessions 4-6.
- **All Phase 5 + Phase 6 + Round 2 work** — moot. The rebuild plan supersedes the migration plan. Plant 1's Sessions 1-10 (then 11+) replace this roadmap.

## Active Blockers for community-node

- **None.** No active development; bug-fix-only mode for Bari.

## Bari Status

Bari runs his real Field Service work on `locallane.app` (this Base44 codebase) as before. Patricia Heath ADU project ($182K signed) is live. No disruption from the Plant 1 pivot. Doron continues his $500/mo retainer relationship with Bari in the same operational shape. Cutover decision lives at end of Plant 1 session sequence per DEC-223.

## Known Mirror Drift

- **community-node DECISIONS.md missing DEC-221 + DEC-222** — both exist in Spec-Repo canonical. Drift acknowledged in DEC-223 mirror commit (`3787ccd`). Focused reconciliation pass owed; not bundled with regular Plant 1 work.

## What's Next for community-node

- Bug-fix-only mode until Bari's cutover.
- Drift-reconciliation pass (separate focused session) when scoped.
- No new DECs land here as primary commits — they land in Spec-Repo and mirror back to this repo only as part of explicit drift-reconciliation passes.

## DEC-182 Mirror Policy Update

DEC-182 (Single-Source Documentation, Scheduled Drift Sync) remains the operating policy. However, with community-node entering maintenance mode for Bari, the *cadence* shifts: mirror updates of `context/` files happen as deliberate focused passes, not on every Spec-Repo edit. Today's Day One close-out is the first instance — community-node's SESSION-LOG and ACTIVE-CONTEXT entries are **scoped** (community-node-specific framing) rather than verbatim mirrors of Spec-Repo's full Day One entry. Canonical narrative continues to live in Spec-Repo.

**Active paying members: 1 (Bari, on this Base44 codebase).**
