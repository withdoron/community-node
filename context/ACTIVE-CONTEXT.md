# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-15 (Mylane Containment Sessions A+B+C + Living Feet)

## Current Focus

Mylane shell is now the contained frame for the authenticated experience. All 6 known escape points from the containment audit are closed. Living Feet (DEC-146) is the active constitutional design principle — proven by overlay refactor (Session B) and Networks containment (Session C). R&D Allowlist pattern (DEC-147) available for pre-release feature gating. Overlay expansion (DEC-148) is the containment approach.

## Active Architecture

- **Mylane shell containment:** Complete. 8 overlays in the OV constant (FREQ, DIR, EVT, ACCT, PHILOSOPHY, SUPPORT, NETWORK + stacked BusinessProfile/Recommend). Backdrop click-to-close on all base overlays. Escape key unwinds overlay stack.
- **Agent gating:** MYLANE_AGENT_ALLOWLIST gates 4 agent UI surfaces. Doron-only during R&D.
- **Overlay stacking:** BusinessProfile (z-50), Network (z-55), Recommend (z-60) stack on top of base overlays (z-40). Hardcoded z-indices — flagged for refactor when third stacking scenario appears.
- **Frequency Station:** Phase 3 complete. Three-section My Library. Pip-Boy radio (DEC-142). Mini-player now opens shell overlay via custom event when on /MyLane.
- **Theme system:** Semantic tokens (98.5% migrated). Three themes: Gold Standard, Cloud, Fallout.
- **Team space:** Production-ready. readTeamData server function (DEC-140).
- **Health score:** 87/100

## What Just Shipped (2026-04-15)

1. **Viewport fix:** CommandBar input fontSize 13 → 16 (iOS Safari auto-zoom prevention)
2. **Agent gate:** MYLANE_AGENT_ALLOWLIST with `agentEnabled` derived flag
3. **Containment audit:** 29 routes mapped, 6 escapes, 10 orphans identified
4. **Session A:** BusinessProfile overlay, FrequencyMiniPlayer event, Events URL state, Newsletter inline form
5. **Session B:** OV constant refactor (13 strings → 1 object), Philosophy/Support overlays, Recommend overlay, backdrop click-to-close, 4 dead pages deleted (~1,170 lines)
6. **Session C:** Networks overlay (z-55), onNetworkClick callback threading, last known escape closed
7. **DEC-146/147/148:** Living Feet, R&D Allowlist, Overlay Expansion

## Known Issues

1. **Overlay z-indices hardcoded** — z-50/55/60, refactor to stack-based when third scenario appears
2. **ClaimBusiness route** — page is going away (co-presence model), but BusinessEditDrawer still generates claim URLs
3. **FrequencyLibraryContext refactor** — prop drilling for favorites/queue should become context provider
4. **Footer still renders** on non-MyLane pages — Philosophy/Support/Newsletter now inside shell, Footer's purpose limited to unauthenticated public pages

## Upcoming Priorities

1. Walkthrough Sessions A/B/C in live app — Doron finds UX issues
2. ClaimBusiness + BusinessEditDrawer cleanup (co-presence model)
3. Footer removal or strip
4. Admin per-space reframe
5. Mylane reminders root cause investigation
6. Newsletter "The Good News" — wake dormant accounts
