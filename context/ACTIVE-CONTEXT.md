# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-05 (MyLane reminder loop bug fix)

## Current Focus

MylaneNote reminder loop diagnosed and fixed. Server-side user_id enforcement shipped (DEC-139). MyLane instructions updated. Bad record healed. Read path confirmed working. Write path pending Base44 publish.

## Active Architecture

- **Agent writes:** DEC-139 — identity fields (user_id, owner_id) are server-authoritative on all agentScopedWrite calls. Agents cannot set these fields.
- **Theme system:** Semantic tokens (98.5% migrated). Three themes: Gold Standard, Cloud, Fallout.
- **Spinner:** 3D variant architecture. Friction + mass physics. Ratchet snap.
- **Team space (7 tabs):** Home, Playbook, Schedule, Roster, Messages, Photos, Settings.
- **Query optimization:** staleTime 5min global default (DEC-130). getMyLaneProfiles batches 6 queries into 1.
- **Agent architecture:** DEC-107 enforced — space agents use agentScopedQuery only. DEC-136 — Creator Only default.
- **Auth:** Single source of truth — AuthContext seeds React Query cache, refreshUser() syncs both.
- **Health score:** 87/100

## What Just Shipped (2026-04-05)

1. Server-side fix: agentScopedWrite unconditionally stamps user_id/owner_id from auth context (DEC-139)
2. MyLane instruction updates: removed user_id from write payloads, added query/write asymmetry
3. Healed MylaneNote record visible on Home feed
4. Read path confirmed end-to-end (entity → query → RemindersCard)

## Pending (Blocked on Base44 Publish)

- Server fix deployed to runtime
- MyLane instruction updates deployed
- End-to-end write-path verification

## Known Issues for Next Session

1. Date parsing bug: "tomorrow" → 2026-04-19 instead of 2026-04-06
2. MCP user_id fallback path weaker than auth.me()
3. Broader user_id flow audit across all entities

## Upcoming Priorities

1. Base44 publish (unblocks everything)
2. Coach Rick demo
3. Date parsing bug fix
4. Ephraim Pip-Boy design session
5. Newsletter "The Good News"
6. Remaining polish: StepIndicator extraction, loading states, shared EmptyState, accessibility
