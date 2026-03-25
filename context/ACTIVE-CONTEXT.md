# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Any AI surface reads this to know the current state without searching conversation history.
> Last updated: 2026-03-25

---

## Current Phase

Base44 connection restored. Field Service multi-user ready for Bari walkthrough (Friday 3/28). Frequency Station Phase 2 live. Godot installed for Ephraim. Custody prep started (deposition 4/7, trial 5/19).

## What Just Shipped (March 25)

1. **Base44 GitHub reconnection** — support swapped connection string after repo disconnect. Sync verified (5d03a66), pipeline healthy.
2. **Field Service multi-user fixes** — 30 entity queries protected with try/catch, isOwner guard on initializeWorkspace, template queries switched to .list() + client filter (Base44 SDK quirk).
3. **Base44 entity permissions** — all 13 Field Service entities changed Read from Creator Only to Authenticated Users.
4. **Frequency Station confirmed live** — "Come Alive" playing on Listen tab at locallane.app/frequency.
5. **Godot 4.6.1 installed** — Intel x86_64, Compatibility renderer, first 3D scene running. Ephraim's first project created.
6. **Custody case prep** — separate Claude project with trial prep instructions. Deposition April 7, trial May 19.

## Active Nodes

| Node | Status | Score | What's Next |
|------|--------|-------|-------------|
| Community Node | Pilot-ready, blocked on legal | ~75/100 | Newsletter Issue 1, admin pagination, open event creation |
| Field Service Workspace | Multi-user ready, Bari walkthrough Friday | ~90/100 | Bari estimate entry, e-sign test, industry presets (DEC-090) |
| Property Management Workspace | Phase 4 complete | ~95/100 | Field test with real property data |
| Personal Finance | V1 complete | ~78/100 | Field test with real data |
| Play Trainer (Team) | Go-live ready | ~95/100 | Coaches meeting March 30, Playmaker prep |
| Frequency Station | Phase 2 live | Functional | "Come Alive" confirmed playing |

## What's In Flight

- **Bari walkthrough** — Friday March 28 at 11 AM. Red Umbrella Field Service workspace. Templates visible, all tabs protected, e-sign flow ready to demo.
- **Coaches meeting** — March 30 at 6:30 PM. Playmaker prep needed.
- **Ephraim** — Godot installed, first 3D scene running, returns for next game dev session.
- **Custody prep** — Deposition April 7, trial May 19. Father's blog posts identified as evidence.
- **LLC/EIN** — paper filing pending, blocks Stripe Connect.

## Current Blockers

- **LLC/EIN paper filing** — blocks Stripe Connect, blocks Phase 7 Payments & Invoicing
- **AdminSettings platform_stats:member_count** — needs manual Base44 creation for CommunityPulse headcount
- **Medicaid review** — deed transfer may trigger 5-year Medicaid lookback. Need legal guidance.

## Base44 SDK Quirk (Expanded — 2026-03-25)

`.filter()` returns empty for **service-role-created records**, not just `.filter().list()`. Any entity where records are created by `initializeWorkspace` via `asServiceRole` needs `.list()` + client filter. Confirmed on FSDocumentTemplate and FrequencySong. Documented in CLAUDE.md.

## What's Next

- Enter Bari's Ag Building estimate for Friday walkthrough
- Test e-sign flow end-to-end
- Field Service customization for multiple trades (DEC-090 Industry Presets)
- Playmaker prep for coaches meeting
- Base44 agents exploration
- Deposition prep (April 7)
- Newsletter Issue 1
- Open event creation to community (Garden Door migration)
- Surface PM Listings to directory

## Garden Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1: Language | Garden metaphors in UI copy | Shipped (Shaping the Garden, Frequency Station) |
| Phase 2: Door | Open events to all, directory visibility controls | Next |
| Phase 3: Pulse | CSS vitality hooks, CommunityPulse data wiring | Planned |
| Phase 4: Guide | Workspace walkthrough system | Shipped (all 5 types) |
| Phase 5: Game | Superpowers, Quests, Organism Phase 1 | Planned |

## Time-Sensitive Items

- **Bari walkthrough:** 2026-03-28 at 11 AM
- **Coaches meeting:** 2026-03-30 at 6:30 PM
- **Deposition:** 2026-04-07
- **Custody trial:** 2026-05-19 — revenue and stable employment needed before this date

---

*Overwrite this file at the end of every session. Commit and push to spec-repo so all surfaces read current state.*
