# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Any AI surface reads this to know the current state without searching conversation history.
> Last updated: 2026-03-27

---

## Current Phase

Marathon session shipped: Harvest Network marketplace, Field Service documents redesign with e-sign, Base44 FieldServiceAgent (live), mobile optimization. EIN re-fax needed (SSN missing). Bari trip end of next week — e-sign flow must be solid before then. ABAWD income verification deadline ~April 4.

## What Just Shipped (March 26-27)

1. **Harvest Network marketplace** — product tags, payment methods, geocoding, tag filtering, admin panels
2. **Field Service documents redesign** — client-grouped layout, one-action Send for Signature, recall, amendments, owner signing
3. **E-sign infrastructure** — signDocument + signEstimate server functions, invokeUnauthenticated() for portal, signature_data stringify fix
4. **Field Service estimates** — Send to Client with link, Request Signature, recall, currency formatting
5. **Bari feedback fixes** — permit apply_url on creation, type-specific People add, photo gallery upload, owner signing
6. **Project financial ledger** — category breakdown with estimated vs actual vs variance
7. **Mobile optimization** — 44px touch targets across all FS components, responsive tables, stat card stacking
8. **FieldServiceAgent Superagent** — LIVE on all FS tabs. Chat UI with voice input, conversation persistence, entity reads, web search, feedback collection
9. **DEC-092 Construction Gate** — Phase 8 in BUILD-PROTOCOL
10. **DEC-093 Base44 Agent Prompts** — all entity changes through agent prompts
11. **Marketing** — stickers ordered, flyer designed, newsletter drafted

## Active Nodes

| Node | Status | Score | What's Next |
|------|--------|-------|-------------|
| Community Node | Pilot-ready, blocked on legal | ~75/100 | Newsletter Issue 1, admin audit |
| Field Service Workspace | Documents + e-sign + agent live | ~92/100 | Settings walkthrough with Bari, view permissions |
| Harvest Network | Phase 2 shipped, map gated | ~60/100 | Map view, network applications |
| Property Management Workspace | Phase 4 complete | ~95/100 | Field test with real property data |
| Personal Finance | V1 complete | ~78/100 | Field test with real data |
| Play Trainer (Team) | Go-live ready | ~95/100 | Coaches meeting March 30 |
| Frequency Station | Phase 2 live | Functional | Next build phase |

## What's In Flight

- **Bari trip** — end of next week. E-sign and estimates must be solid before departure.
- **EIN re-fax** — SSN was missing from original SS-4. Needs re-fax to IRS.
- **ABAWD income verification** — deadline ~April 4. Need income ledger.
- **Coaches meeting** — March 30 at 6:30 PM. Playmaker prep needed.
- **Stickers** — ordered, waiting for delivery. Distribution plan needed.
- **Newsletter Issue 1** — drafted, needs finalization and send.
- **Admin panel** — hasn't been audited in a while. Needs review.

## Current Blockers

- **LLC/EIN paper filing** — SSN missing from faxed SS-4, needs re-fax. Blocks Stripe Connect.
- **AdminSettings platform_stats:member_count** — needs manual Base44 creation for CommunityPulse headcount
- **Medicaid review** — deed transfer may trigger 5-year lookback. Need legal guidance.

## Base44 SDK Quirks

1. **`.filter()` returns empty for service-role-created records** — use `.list()` + client-side filter
2. **`.filter().list()` returns empty object** — `.filter()` already returns array, don't chain `.list()`
3. **Server SDK `.filter()` returns array directly** — no `.list()` in server functions
4. **`asServiceRole` does NOT bypass Creator Only permissions** — entity Update permission must be "No restrictions" for server function updates to work
5. **Entity text fields expect strings** — `signature_data` must be `JSON.stringify()`'d before saving

## What's Next

- Fix EIN re-fax
- Admin panel audit
- Settings tab walkthrough with Bari
- Community Pass / Recess Pass audit for The Circuit partnership
- Property Pulse back on priority list (mother pushing PM)
- Frequency Station next phase
- Newsletter Issue 1 finalize and send
- ABAWD income ledger
- Admin Superagent (Mycelia) exploration
- Replace Feedback button with space agent interaction

## Garden Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1: Language | Garden metaphors in UI copy | Shipped |
| Phase 2: Door | Open events to all, directory visibility controls | Next |
| Phase 3: Pulse | CSS vitality hooks, CommunityPulse data wiring | Planned |
| Phase 4: Guide | Workspace walkthrough system | Shipped (all 5 types) |
| Phase 5: Game | Superpowers, Quests, Organism Phase 1 | Planned |

## Time-Sensitive Items

- **ABAWD income verification:** ~2026-04-04 deadline
- **Coaches meeting:** 2026-03-30 at 6:30 PM
- **Bari trip:** end of next week — e-sign must be solid before
- **Deposition:** 2026-04-07
- **Custody trial:** 2026-05-19 — revenue and stable employment needed before this date

---

*Overwrite this file at the end of every session. Commit and push so all surfaces read current state.*
