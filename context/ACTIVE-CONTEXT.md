# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-04 (Full-day audit + security lockdown + polish pass)

## Current Focus

Application audit complete — health score 68 to 87. All Critical and High issues resolved. Entity permissions locked down. Dead code cleaned. Foundation is stone for Coach Rick demo. MylaneNote reminders live. Founding Gardener observation live via MCP. Feedback pipeline consolidated to ServiceFeedback.

## Active Architecture

- **Theme system:** Semantic tokens throughout (98.5% migrated). Three themes: Gold Standard, Cloud, Fallout.
- **Spinner:** 3D variant architecture. Friction + mass physics. Ratchet snap.
- **Team space (7 tabs):** Home, Playbook, Schedule, Roster, Messages, Photos, Settings.
- **Query optimization:** staleTime 5min global default (DEC-130). getMyLaneProfiles batches 6 queries into 1. .list() + client-side filter for service-role records.
- **Panel:** Mylane panel viewport-fixed. Desktop: 300px right panel. Mobile: bottom bar.
- **Agent architecture:** DEC-107 fully enforced — space agents use agentScopedQuery only (no direct entity tools). 5 agents + AdminAgent + Renderer + Scout.
- **Auth:** Single source of truth — AuthContext seeds React Query cache, refreshUser() syncs both.
- **Error isolation:** WorkspaceErrorBoundary wraps each workspace drill view.
- **Security:** Entity permissions default Creator Only (DEC-136). Server functions with asServiceRole handle cross-user access.
- **Credit model:** Entity reads = free. Agent messages = ~3 integration credits. Message credits (250/mo) = real bottleneck.

## What Just Shipped (2026-04-04)

1. MylaneNote entity + reminders lifecycle (create, display, mark done via Mylane conversation)
2. Founding Gardener observation (platformPulse gardeners action + MCP deploy)
3. Feedback pipeline: FeedbackLog retired, ServiceFeedback is sole path, "Have feedback?" chip on all spaces
4. Full 13-category audit: 343 files, 6 Critical, 14 High, 22 Medium, 19 Low
5. Critical fixes: entity permissions (9 locked), staleTime, auth consolidation, ownership verification
6. High fixes: DEC-107 enforced, agent field names corrected, meal-prep in agentScopedQuery
7. Polish: 19 dead files deleted (-1,968 lines), 31 unused imports, Discover wired, phantom attention removed
8. CLAUDE.md fully updated (was 1 month stale)

## Upcoming Priorities

1. Coach Rick demo — foundation is stone, Team space production-ready
2. Ephraim Pip-Boy design session
3. Newsletter "The Good News" to wake dormant accounts
4. Bari visit — show feedback chip, get verbal items into ServiceFeedback
5. League Link rethink — league discovery page instead of team join
6. Play Library seedling — matures when 3+ teams active
7. Remaining polish: StepIndicator extraction, loading states, shared EmptyState, PM getProps, accessibility
