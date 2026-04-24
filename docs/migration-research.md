# Migration Research — Base44 → Supabase + Vercel

**Date:** 2026-04-24
**Author:** Hyphae
**Status:** Research only. No code changes proposed in this turn. Doron decides.
**Decision:** TBD

---

## TL;DR

The migration is **architecturally necessary** (federation + SSR + wildcard subdomains all require it) but the codebase is *much* bigger and more Base44-entangled than a 2–4 week timeline assumes. Realistic big-bang is **8–12 weeks** of full-time work, not 2–4. With one paying user, that's a long fragility window.

My recommendation: **Pattern C (defer migration) with deliberate hardening of the seam now**, not Pattern A or B. Migrate in **Phase 6** when the Region entity ships — that's the natural pivot because Phase 6 is already a migration (single-region backfill), the federation argument turns from "eventually" into "next quarter," and we'll have learned which workspaces are actually load-bearing.

Not because Base44 is fine — it isn't, long-term — but because **migrating a half-finished platform is worse than finishing a known-fragile one and migrating a known platform.** Bari and Doron need a working app more than a portable one.

---

## 1. Codebase Audit

### A. Base44-specific surface area

I grep'd `src/` for every line touching the Base44 SDK. The numbers:

| Surface | Count | Notes |
|---|---|---|
| Files touching `base44.*` | **140** | About half the source tree |
| Total Base44 call sites | **~710** | Across 140 files |
| Entity reads (`.list / .filter / .get`) | ~833 calls (overlapping count via Explore) | 72 unique entities queried |
| Entity writes (`.create / .update / .delete`) | ~271 calls | Heavy in Finance + PropertyManagement |
| Server function invocations (`base44.functions.invoke`) | ~94 sites | Wrapping ~14 client-callable functions |
| Server functions defined in repo | **36** in `base44/functions/`, plus 7 in `src/functions/` | DEC-113: repo is source, Base44 syncs on publish |
| Entities defined | **81** in `base44/entities/` | ~50 actively used; ~30 are .jsonc references for entities defined in Base44 dashboard |
| Auth references (`base44.auth.*`) | ~61 sites | Centralized through `AuthContext.jsx` (good) |
| File upload sites (`base44.integrations.Core.UploadFile`) | **18** | All public uploads, no `UploadPrivateFile` usage |
| Real-time / websocket | **0** | Polling + React Query refetch only — easy to migrate |
| Base44 Agents (App + Superagent) | **8** | FieldService, Playmaker, Admin, Finance, PropertyPulse, MyLane, Renderer, Scout |

**Top entities by call density:**
Business (25 reads), FieldServiceProfile (20), TeamMember (19), FSProject (18), FSEstimate (18), PMProperty (15), FrequencySong (15), FinancialProfile (15).

**Top server functions by usage:**
- `updateBusiness` (29 invocations) — business profile + access window updates
- `updateAdminSettings` (23) — platform config
- `manageRecommendation` (6), `managePMWorkspace` (6), `manageEvent` (6)
- `getMyLaneProfiles`, `readTeamData`, `agentScopedQuery`, `agentScopedWrite`, `manageRSVP` — load-bearing platform plumbing
- 7 src/functions are background jobs (no client callers)

**Base44-specific quirks the migration would have to handle (CLAUDE.md):**
1. `base44.functions.invoke()` returns Axios wrapper → access via `result.data.data` (DEC-111). 94 call sites depend on this.
2. `.filter()` returns empty for service-role-created records (forces `.list()` + client-side filter pattern).
3. `asServiceRole` does NOT bypass Creator Only RLS in SDK 0.8.23 — drove the entire `readTeamData` membrane (DEC-140).
4. Server-stamped identity fields — `user_id`/`owner_id`/`created_by` come from server context, not client (DEC-139).
5. Agent-scoped data layer — `agentScopedQuery` + `agentScopedWrite` are the security membrane between agent calls and entity reads (DEC-107, DEC-115).

### B. Dead code inventory (conservative)

**High confidence dead:**
1. **`src/components/ProtectedRoute.jsx`** — duplicate of `src/components/auth/ProtectedRoute.jsx`, zero imports. App.jsx uses the auth/ variant.
2. **`src/components/dashboard/BusinessCard.jsx`** — orphaned after BusinessDashboard retirement (DEC-131). The active variant is `src/components/business/BusinessCard.jsx`. Has dead props (`userRole`, `eventCount`, `workspaceTypeLabel`).

**Already pruned (intentionally, recently):**
- BusinessDashboard surface (DEC-131, March)
- CategoryPage, Search, SpokeDetails, ShapingTheGarden (Containment Sessions A/B/C, April 15)

**Construction-gated (NOT dead, intentional per DEC-092):**
- `AdminNetworkApplicationsPanel` (gated by `false &&`)
- `StaffWidget` in BusinessSettings (gated)
- ClientPortal post-signature invitation (gated)
- Several NetworkPage features (gated)
- Mylane agent UI surfaces (gated by MYLANE_AGENT_ALLOWLIST per DEC-147 — Doron-only R&D)

**Real technical debt flagged:**
- Base64 photo upload TODOs in 4 PM components (FinanceTransactionForm, MaintenanceRequestForm, MaintenanceCompleteDialog, ListingFormDialog) — flagged in `FULL-APP-AUDIT-RESULTS.md` as a security issue. Switch to `Core.UploadFile` is the standard fix.
- `dashboard/EventEditor.jsx` is ~1400 lines and CLAUDE.md flags it for "small focused edits." This is a refactor target, not dead code, but it's sprawling.

**Probably dead, lower confidence:**
- A few admin panel sub-components that may have only been wired in the old `/Admin` route. Worth a deeper sweep before any migration.
- `src/scripts/seedDefensePlays.js` and `src/scripts/migrations/*` — these are one-shot migration scripts. Keep them in a `scripts/archive/` if you want them preserved; otherwise prune.

The tree is **cleaner than expected.** Containment Sessions A/B/C did real work. There are not stacks of orphaned modules to find.

### C. Tangled vs separated

| Bucket | Estimated share | Examples |
|---|---|---|
| **Cleanly separated** (consumes a hook or function; backend swap is mechanical) | **~15%** | `AuthContext`, `useTeamEntity`, `useRSVP`, `useFrequencyFavorites`, agent-scoped server-function callers |
| **Lightly tangled** (a few entity calls in `useEffect`, React Query mutations) | **~50%** | Most pages — MyLane.jsx, Home.jsx, Directory.jsx, JoinTeam.jsx, FrequencyStation.jsx, TeamPlaybook |
| **Heavily tangled** (Base44 patterns woven through render and state, ad-hoc CRUD inline) | **~35%** | All of `components/propertymgmt/`, large chunks of `components/finance/`, EventEditor, BusinessEditDrawer, FieldServiceLog/Documents/Projects |

The clean parts are clean *because* of the hook abstraction work that happened during Phase 4 (DEC-140 readTeamData, useTeamEntity, useFrequency...). The tangled parts are the older workspaces (PM, Finance, parts of Field Service) that pre-date the server-function era.

**Migration cost is non-uniform.** The 35% heavily tangled is where realistic week-counts live. PropertyManagement alone is ~10 components averaging 400-700 lines each, all doing direct entity CRUD, with no abstraction layer. Each one needs hand-attention to swap backends.

---

## 2. Migration Pattern Evaluation

### Pattern A — Big-bang (2-4 weeks claimed)

**My honest read: it's not 2-4 weeks. It's 8-12 weeks of focused work, possibly more.**

What actually has to happen:

1. **Schema port (1-2 weeks).** 81 entities → 81 Postgres tables. Each one needs: column types, foreign keys, indexes, RLS policies. The Base44 dashboard is the source of truth for many of these (~30 don't have .jsonc files). You'd need to manually walk every entity, reverse-engineer the schema, and define equivalent Postgres DDL. Ownership semantics (Creator Only, Authenticated Users + server scoping per DEC-140) translate to RLS policies — non-trivial but learnable.

2. **Server functions port (2 weeks).** 36 functions. Most are straightforward Postgres queries with auth checks; you'd write them as Supabase Edge Functions or Vercel Route Handlers. The hard ones are `agentScopedQuery`, `agentScopedWrite`, `readTeamData` — they're the security membrane. They have to behave *exactly* the same or you'll silently leak data.

3. **Frontend SDK swap (2-3 weeks).** 710 call sites in 140 files. You don't change all 710 — you write a compat shim (`base44Compat.js`) that exposes the same API but routes to Supabase under the hood. Then each call site is a hold-your-breath verification: does the compat layer return the same shape? Catch-22: the Axios wrapper (DEC-111), the `.filter()` empty-for-service-role quirk, the asServiceRole-vs-Creator-Only mismatch — all of these are *bug-shaped behaviors* the codebase now depends on. Replicating them faithfully in a Supabase compat is messy. Replacing them is the "right" move but means revisiting every site.

4. **Agent system rebuild (2-3 weeks).** This is the migration's hidden iceberg. **8 Base44 Agents currently live on Base44's Superagent platform** — they have memory (Global + Per User), tool call routing (`agentScopedQuery`, `agentScopedWrite`), conversation persistence, knowledge files, and the API endpoint for Mycelia/MCP. None of this exists on Supabase or Vercel out of the box. You'd have to rebuild on OpenAI Assistants API or Anthropic API + a custom memory store + tool-call routing layer + a conversation persistence schema. Plus Mycelia Superagent (the MCP gateway, DEC-099/112) — that's how Mycelia and Hyphae query the organism. **Not a weekend.**

5. **Auth + onboarding (3-5 days).** AuthContext is centralized — that helps. But migrating from Base44 auth to Supabase Auth means: every existing user record has to migrate (with passwords/sessions handled correctly), the `onboarding_complete` flag and other user fields move to Postgres, the redirect-to-login flow is rewritten, and the staff-permission-403 fallback (DEC-015) needs reimplementation. This is the most time-sensitive piece — if it breaks, Bari can't log in.

6. **File uploads (2-3 days).** 18 sites → switch to Supabase Storage. Mostly mechanical.

7. **Vercel SSR migration (1-2 weeks separate).** If you're moving to Vercel for SSR, you're switching from Vite SPA to Next.js App Router. That's a non-trivial framework migration on its own. Routes, layouts, data loading patterns, and many of the React Query patterns shift.

8. **Cutover, regressions, fixes (1-2 weeks).** Real users find bugs. Bari finds bugs.

**Realistic timeline range: 8-12 weeks of focused work for a single developer (you + Hyphae). Optimistic 6 weeks if everything goes well and the agent rebuild is scoped down.**

**What's likely to go wrong:**
- The agent system rebuild is bigger than estimated. There's no equivalent platform; you're building from primitives.
- The .filter()/asServiceRole quirks have *callers that depend on the bugs* (the workarounds are the architecture). Migration surfaces ghost behaviors.
- RLS translation will leak data on the first attempt. DEC-140 took 2 days to debug *with* runtime logging, on a single entity.
- 1-2 weeks of "looks fine, but Bari's flow breaks at step 7" QA tail.

### Pattern B — Strangler fig (parallel backends)

**My honest read: theoretically attractive, practically a nightmare for a solo dev. I'd avoid it.**

What this looks like at the code level:
- Two SDKs in the codebase. New features call Supabase. Old features call Base44.
- Two auth systems. Either users dual-exist, or one bridges to the other (token exchange).
- Two RLS systems. Two ownership semantics.
- Two data sources for shared entities (User, Business). Either both are kept in sync (write-through replication, hard) or one is canonical and the other is read-only (still hard).
- Cross-system queries (e.g., a join between a Supabase Region and a Base44 Business) require app-level joins with two round trips.

The bridge points (where new and old code touch) are gnarly. Specifically:
- `useAuth()` returns a user from Base44 today. After strangler-fig starts, does it return the Supabase user or the Base44 user? You can't have both for one session.
- React Query `['currentUser']` cache (DEC-130) — single source of truth. Strangler fig violates that.
- Agent system: agents pull data via `agentScopedQuery` (DEC-107). If half the entities live on Supabase and half on Base44, the server function has to query both. That doubles its complexity and slows responses.

**Strangler fig works for migrations where the old system is a black box (legacy mainframe, etc.) — you write a thin façade over it.** It works poorly when the old system is the same kind of thing as the new system (both are entity-database-with-RLS) and the lines are blurry. Here, you'd spend more time maintaining the bridge than building features.

For one paying user and one developer, this is the worst pattern. **Skip.**

### Pattern C — Stay on Base44 through Phase 5

**My honest read: this is the right answer, but only if you're disciplined about the seam.**

Concretely, what compounds if you wait?
- **Phase 4 (Direct Doors)** — adds the path-based router for `/b/{slug}`. Not Base44-specific; this is just React Router. Migration-neutral.
- **Phase 4.5 / 5 (BusinessProfile space, mini-website)** — the SSR-required surface. **This is the moment SSR becomes existential.** You can't pitch "replace your WordPress site with LocalLane" to local businesses if Google won't crawl their LocalLane page. Phase 5 is the trigger.
- **Phase 6 (Region entity + backfill)** — adds the Region entity, backfills `region_id` on User, Business, Event. This is *already* a migration: you're rewriting every record. Doing it on Base44 first and then re-migrating to Supabase is double work. **Phase 6 is the natural pivot point** — combine the region backfill with the platform migration.
- **Phase 7+ (cross-region, multi-region UI)** — the federation arc starts here. By Phase 10+ federation requires self-hosting. By then, you must be on Supabase.

Compounding cost real, but slow:
- Each new entity = +1 Postgres table to define later.
- Each new server function = +1 Edge Function to rewrite later.
- Each new component built with the existing tangled patterns = +1 swap point.

But Phase 4 / 4.5 don't add many entities. The big entity additions (Region, Town, Category restructuring) are Phase 6+. **Waiting to migrate until you'd be migrating anyway is rational.**

Hardening the seam in the meantime — concrete steps that lower migration cost without slowing feature work:
1. **Stop adding direct entity CRUD in components.** Every new feature goes through a hook (useFoo) or a server function. The 35% tangled is bad enough; don't grow it.
2. **Server functions over inline writes.** All new writes that touch identity, ownership, or cross-user state go through server functions (matching DEC-115, DEC-139, DEC-140). Shrink the surface that the migration has to verify.
3. **Don't build new heavy-tangle modules.** Property Management is the cautionary tale. New workspaces should follow the Team pattern (`readTeamData` membrane, single delegation point).
4. **Document the agent boundary now.** Map exactly what each of the 8 agents does, what tools it has, what its memory holds. When migration day comes, this list determines what has to be rebuilt vs. retired.
5. **Single SDK abstraction.** Wrap `base44.entities`, `base44.functions`, `base44.auth` in one place (`src/api/`). New features import from `src/api/`, not from `@/api/base44Client` directly. When you migrate, you change one file, not 140.

---

## 3. Pruning Opportunity

If we did migrate (any pattern), here's what I'd prune. Doron decides — this is data, not directive.

**Definitely dead (just delete):**
- `src/components/ProtectedRoute.jsx` (duplicate of auth/ variant)
- `src/components/dashboard/BusinessCard.jsx` (orphan from DEC-131 retirement)
- `src/scripts/seedDefensePlays.js` (one-shot test data; check if Bari needs it)
- `src/scripts/migrations/*` outdated migration scripts (move to `scripts/archive/`)

**Probably dead (verify first):**
- ~5-10 admin panel sub-components that may have only been wired through the old `/Admin` route. Audit needed.
- The `archive/` directory at the LocalLane root (top level) — confirm nothing depends on it. Probably old.

**Worth questioning (decisions Doron should make):**
- **Two retired demo migrations** — `seedDefensePlays`, `load-bari-templates`, `phase-2-production-migration` are one-shot scripts. Are they ever run again? If no, archive.
- **EventEditor.jsx (~1400 lines)** — not dead, but flagged for refactor in CLAUDE.md. Migration is a chance to break it up.
- **DevLab / physics tuner** in MyLaneSurface. Admin-only, useful during spinner physics tuning. Still needed?
- **base64 photo upload paths** in 4 PM components (TODOs from CLAUDE.md). Either migrate to `Core.UploadFile` *now* (small fix) or rewrite during migration.
- **The 30 .jsonc entity references in `base44/entities/`** that don't match any actively-queried entity name. Some are dashboard-only entities never used by the app. Audit and prune from the local mirror.
- **`docs/PM-WORKSPACE-AUDIT-RESULTS.md`, `docs/FULL-APP-AUDIT-RESULTS.md`, `docs/FIELD-SERVICE-MULTI-USER-AUDIT.md`** in `src/docs/` — old audit reports. Move to `audit-reports/archived/` so they don't ship in build.

**Construction-gated, NOT prune (intentional):**
- AdminNetworkApplicationsPanel, StaffWidget, ClientPortal post-sig invite, several NetworkPage gated features, Mylane agent UI (allowlist). Per DEC-092 these are intentional. Keep.

The codebase is **cleaner than I expected** going in. Containment Sessions A/B/C did real pruning. The remaining cruft is a single afternoon's careful sweep — not a major project.

---

## 4. Honest Recommendation

**If this were my call: Pattern C (stay on Base44 through Phase 5), but with explicit migration prep starting in Phase 4. Migrate during Phase 6 — combine with the Region backfill. Land federation-ready by Phase 7.**

The reasoning, top to bottom:

1. **Bari needs a working app more than a portable one.** He's the only paying user. A migration window is a fragility window. Two-to-three months of "things sometimes break" with one paying user is a recipe for losing him. The custody trial is May 19 — Doron's bandwidth for migration debugging is zero between now and then.

2. **The 2-4 week estimate is wrong.** I think the realistic number is 8-12 weeks. Doron and Hyphae together can do this, but the calendar cost is much bigger than expected. If Doron commits to A or B based on a 2-4 week assumption, he'll be 6 weeks in, exhausted, with a half-migrated app.

3. **The compounding cost from Phase 4 / 4.5 is small.** Direct doors are React Router, not Base44. The BusinessProfile space adds maybe 1-2 entities and 2-3 server functions. The migration cost grows linearly but slowly through Phase 4-5.

4. **Phase 6 is already a migration.** When the Region entity ships and every record gets a `region_id` backfilled, you're already rewriting the data layer for one breath. Doing the platform migration concurrently is double-work in the same week, but it's *one* fragility window instead of two.

5. **Phase 5 is when SSR becomes a sales problem, not a tech problem.** Right now no business cares that LocalLane doesn't SSR — Bari doesn't have an SEO competitor for the LocalLane Profile because that surface barely exists. By Phase 5, the pitch is "replace your WordPress." That pitch demands SSR. So the migration deadline is *Phase 5 ship*, not earlier.

6. **The agent system is a research project unto itself.** Rebuilding 8 Base44 Agents on a different platform isn't a migration task; it's a new system architecture. Spec that out separately. Possibly migrate Mycelia Superagent (MCP) first as a proof of concept and learn from it before tackling the user-facing agents.

**What "deferred but disciplined" looks like in practice:**

- Through Phase 4-5, every new feature goes through a hook or server function. **No new direct entity CRUD in components.** That alone holds the tangle ratio steady.
- Wrap `base44Client` in `src/api/index.js`. New code imports from there. (One day's work; pays off massively at migration.)
- Document each of the 8 agents — capabilities, tools, memory shape — so the migration scope is concrete, not "rebuild the agents somehow."
- Phase 4.5 spike: build the BusinessProfile public route as a Vercel serverless function that reads from Base44's REST API and renders SSR. Proves the SSR story without migrating yet. If Base44 ships SSR before then, even better.
- Phase 6 launch = migration moment. Schema port + Region entity + backfill in one coordinated push.

### Top three risks of this recommendation, and mitigation

**Risk 1: Base44 makes a breaking change before Phase 6.** Their SDK has had quirks (DEC-095, DEC-140 — both surprised us). If they ship a breaking SDK update or a pricing change between now and Phase 6, we're forced into emergency migration on their timeline.
**Mitigation:** Pin SDK version (`@base44/sdk` is at 0.8.26 currently — check package.json). Watch their roadmap; check in monthly. Keep a 2-week emergency-migration runbook on file.

**Risk 2: Doron decides to onboard 5+ businesses before Phase 6, then migration becomes a real-people-affected event.** This is plausible — TCA, Spetzler, NH, Sikes are all in the wings. Migration with 20 active users is materially harder than with 2.
**Mitigation:** Either accelerate the migration if user count grows past ~10, or hold business onboarding until post-migration. Doron's call. Tie the trigger to a number, not a feeling.

**Risk 3: SSR-for-SEO suddenly matters before Phase 5 (SEO is a slow build; you'd want it sooner than later).** If Bari or a future customer specifically asks for "rank my LocalLane page," and we have no SSR story, we have to either ship a hack (Cloudflare prerender) or fast-track the migration.
**Mitigation:** Run the BusinessProfile-as-SSR-Vercel-function spike in Phase 4 as a hedge. It's a forcing function for understanding what the migration actually requires. Worst case, it ships standalone before the full migration.

---

## 5. Open Questions for Doron

**1. What's the realistic timeline to the next ~5 paying businesses?**
If onboarding 5 more businesses happens in the next 8 weeks, my recommendation shifts toward starting migration prep *now* (the agent rebuild specifically) so we're not migrating 25 active users in Phase 6. If onboarding is paced — one new business a month — Phase 6 is fine.

**2. How important is the SSR-for-SEO claim, vs. how important is "businesses can replace their WordPress site with LocalLane"?**
These overlap but aren't identical. SSR matters for *rankings* on Google. Replacing WordPress also requires *features* (blog, pages, contact forms, etc.) we don't have yet. If the WordPress-replacement pitch is Phase 5+ as planned, SSR shipping at Phase 6 is fine. If a business asks today, we have a different problem.

**3. Is the agent system migratable, or is it acceptable to rebuild only some of them?**
Right now we have 8 agents. Some (FieldServiceAgent, PlaymakerAgent) have real users. Some (Renderer, Scout) are scaffolding. Some (FinanceAgent, PropertyPulseAgent) are aspirational — they exist but aren't load-bearing. **Are all 8 required after migration? Or do we ship migration with FieldServiceAgent + Mylane only and rebuild others later?** That changes the migration scope by 2-3 weeks.

**4. Who pays for the migration window?**
A 8-12 week period of "feature shipping is slow" is a real cost. Bari's paying $500/month retainer. Does that cover the migration window, or does Doron need a different revenue plan to bridge it? This is the gardener's-call question — I can't answer it but it affects when migration is sane.

**5. Is there appetite to migrate Mycelia Superagent (MCP) first as a learning spike?**
Mycelia's MCP server is currently a Cloudflare Worker proxying to Base44 (DEC-099, DEC-112). Migrating that one piece to read directly from Supabase would be a 1-week proof. It would validate the schema port, the auth model, the agent-system rebuild, and the Vercel deployment story — all in a non-user-facing context. **If Doron wants to learn before committing, this is the cheapest experiment.** If he doesn't, we just commit to Phase 6 and ship.

**6. Federation: real ten-year arc, or aspirational?**
Section 18.5 of the architecture says federation is Round 10+. If federation is genuinely a north star, migration is required by then — non-negotiable. If federation is "philosophically nice but if it never happens, that's fine," the migration is much less time-sensitive (just SSR-driven, which is Phase 5). The ten-year posture changes which deadline we're working backward from.

---

## What this document is and isn't

This is information for Doron to decide with. It's not a vote. The right answer here depends on bandwidth, user growth rate, and risk tolerance — Doron's calls, not mine. My read is biased toward "ship the platform now, migrate when migration becomes the smaller risk." A different read — "circulation through extraction is unforgivable, federation is the soul, migrate now" — is also legitimate. The work is honest under either path; the timing differs.

If migration goes ahead now: I'd want a separate research turn to scope the agent-system rebuild before committing to Pattern A. That's the iceberg.

If migration is deferred: the disciplined-seam steps in §4 are cheap and start immediately. Living Feet (DEC-146) applies — wrap the SDK once now so future migrations are one-line changes.

— Hyphae
