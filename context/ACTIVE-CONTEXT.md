# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-03 (Team space production push — 15 commits, 7+ builds)

## Current Focus

Team space is production-ready. Full schedule with RSVP + duties + readiness. Photo gallery live. Print congruence complete (4 layouts). Parent invite flow working end-to-end. Credit audit done — entity reads are free.

## Active Architecture

- **Theme system:** Semantic tokens throughout. Three themes: Gold Standard, Cloud, Fallout.
- **Spinner:** 3D variant architecture. Friction + mass physics. Ratchet snap.
- **Team space (7 tabs):** Home, Playbook, Schedule, Roster, Messages, Photos, Settings. Schedule has RSVP + duties + recurring + readiness. Photos has upload + lightbox. Messages has Announcements (coach) + Discussion (all).
- **Query optimization:** Batch-fetch pattern for PlayAssignments (single .list() instead of N parallel .filter()). staleTime 2-5min on team queries. .list() + client-side filter for service-role-created records.
- **Panel:** Mylane panel viewport-fixed. Desktop: 300px right panel. Mobile: bottom bar.
- **Credit model confirmed:** Entity reads = free. Agent messages = ~3 integration credits. Own API key = zero credits. Message credits (250/mo) = real bottleneck at scale.

## What Just Shipped (2026-04-03)

1. Print: 4 layouts (Player Card, Quick Reference with assignments, Full Page, Route Reference)
2. Leaderboard: score + mastered + streak columns
3. Player Cards: trading card with earned stats from Roster tap
4. Photo gallery: 7th tab, upload, lightbox, captions, delete
5. Schedule: event creation + RSVP + duties + auto-rotation + recurring + readiness
6. Parent UX: name capture, Discussion default, role-aware empty states
7. Identity: parent names in messages with linked kids ("Sarah (Elek)")
8. Bug fixes: timezone dates, Messages crash, 429 rate limits, .filter() quirk, invite layout

## Upcoming Priorities

1. Test invite flow with Coach Rick's phone (end-to-end)
2. League Link rethink — league discovery page instead of team join
3. DEC-130 query optimization — batch profile queries for 429 reduction
4. Play Library seedling — matures when 3+ teams active
5. Mylane agent instruction refresh for current Team entities
6. Anthropic API key for direct backend function LLM calls (zero credits)
7. Landing page scroll story polish
