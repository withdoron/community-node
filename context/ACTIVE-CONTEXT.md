# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Any AI surface reads this to know the current state without searching conversation history.
> Last updated: 2026-03-19

---

## Current Phase

Field Service Phases 4-6 shipped. Garden Migration Phase 1 (Guide) complete. Community Pass pricing finalized ($45, DEC-083).

## What Just Shipped

- **FS Phase 4:** Documents tab with Oregon lien law templates (DEC-085). 4 system templates auto-seed (INO, Notice of Right to Lien, Pre-Claim Notice, Subcontractor Agreement). Merge field engine, status management, print-ready detail view.
- **FS Phase 5:** Client Portal expansion — document sharing, estimate portal, open books mode, query param routing.
- **FS Phase 6:** E-Signature system (DEC-086) — custom built, ESIGN Act + Oregon UETA compliant. SignatureCanvas (draw + type), SigningFlow (consent, SHA-256 hash, audit trail JSON). Wired into documents, estimates, and client portal signing.
- **Formatting fixes** across all FS components — currency fmt(), formatPhone(), "Monthly Target" rename.
- **Insert line item at any position** in estimates — subtle + divider between items, amber on hover, auto-focus.
- **Admin vs user parity audit** — confirmed clean (deployment gap only, not code divergence).
- **Charlie (Get Air) email** sent with updated $45 pricing and growth framing.
- **Legal docs updated** — LEGAL-RESEARCH.md (e-sign research), COMMUNITY-PASS.md (payment flow), STRIPE-CONNECT.md (Connect model specifics).
- **CommunityPulse headcount fix** — AdminSettings fallback for non-admin users.

## Active Nodes

| Node | Status | Current Build | What's Next |
|------|--------|--------------|-------------|
| Community Node | Pilot-ready, blocked on legal | N/A — content-first launch phase | Legal review, Newsletter Issue 1, Nextdoor seed posts |
| Field Service Workspace | Phase 6 complete (e-sign) | Bari active user | Phase 7: Payments & Invoicing (blocked on LLC/EIN). Bari field testing continues. Dan Sikes pending. |
| Property Management Workspace | V1 Complete | Doron (port from Property Pulse) | Field test with real property data |
| Personal Finance | V1 complete | Doron | Field test with real data. V2 backlog: benefits modeling, tax export |
| Play Trainer | Go-live ready | Doron's boys | Share invite with Coach Rick and players |

## What's In Flight

- **Charlie (Get Air)** — email sent with $45 pricing, awaiting response
- **Bari** — Field Service active user, needs Oregon ORS confirmation on lien documents
- **Ephraim** — GRIP game v9, returns tomorrow evening for next build session
- **LLC/EIN** — paper filing pending, blocks Stripe Connect setup

## What's Next

- Phase 7: Payments & Invoicing (blocked on LLC/EIN)
- Garden Migration Phase 2: Door (open events to all, directory visibility)
- Frequency Station music workspace (Suno API integration)
- Newsletter Issue 1
- AI bell curve LinkedIn post
- Nextdoor seed posts ("walk a different way" and "what would you build")
- Create AdminSettings platform_stats:member_count record in Base44 (value: 15)

## Active Blockers

- **LLC/EIN paper filing** — blocks Stripe Connect, blocks Phase 7 Payments & Invoicing
- **AdminSettings platform_stats:member_count** — needs manual Base44 creation for CommunityPulse headcount

## Time-Sensitive Items

- **Custody trial:** 2026-05-19 — revenue and stable employment needed before this date
- **Ephraim returns:** Tomorrow evening — GRIP v9 ready, possible N64 cartridge order
- **Boys with Doron:** Friday through Thursday

---

*Overwrite this file at the end of every session. Commit and push to spec-repo so all surfaces read current state.*
