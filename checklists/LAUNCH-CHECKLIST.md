# LAUNCH-CHECKLIST.md

> Pre-pilot checklist items. Mark [x] when shipped.

---

## Field Service Workspace

- [x] Document templates seeded by workspace type
- [x] Documents grouped by client
- [x] Client-required document creation
- [x] One-action Send for Signature with clipboard copy
- [x] Client portal e-sign (document)
- [x] Client portal e-sign (estimate)
- [x] Recall flow (documents + estimates)
- [x] Owner signing (documents + estimates)
- [x] Amendment flow
- [x] Archive toggle
- [x] Send estimate with link + copy
- [x] Currency formatting on all monetary values
- [x] Permit apply_url on creation
- [x] Type-specific People add (Worker, Sub, Client)
- [x] Daily log photo gallery upload
- [x] Project financial ledger
- [x] Mobile optimization pass (44px targets, responsive tables)
- [x] FieldServiceAgent Superagent live
- [x] Agent chat with voice input
- [x] Admin document stats
- [x] **Phase 1 functionally complete** (2026-04-30, DEC-193 through DEC-197) — CO math + signing + total_budget recompute, CO form unification, draft-CO edit, Log Sub Payment + Client Payment, Project Detail four-metric financial header, feature-flag wiring fix, Management Fee distinct from O&P, polish bundle, Settings persistence
- [x] **PDF page-clipping + filename in iframe context (DEC-198)** (2026-05-01, `e91b696` + `cb26d4e`) — `printNode` helper, FSDocument migrated, triple-title-set covers Chrome's inconsistent filename source in deep-nested iframes. Verified on Bari's Patricia Heath estimate 2026-05-04.
- [x] **Log rollup query-key gap (DEC-199)** (2026-05-03, `cb26d4e`) — FSLog mutation invalidates per-project keys; project DETAIL view's Spent rollup updates immediately on save. Verified by Doron 2026-05-04.
- [x] **Tab nav tap-on-active reset** (2026-05-03, `cb26d4e`) — `MyLaneDrillView` `tabResetKey`; one change covers all workspaces. Verified by Doron 2026-05-04.
- [x] **Required-field UX audit + fixes (DEC-200)** (2026-05-03, `bdd90e4`) — six fields fixed across five forms; canonical `*` + client-side toast pattern; no Base44 schema errors leak to user. Verified by Doron 2026-05-04.
- [x] **Bari's Patricia Heath estimate (EST-2026-005) entered, multi-page PDF generates correctly, ready for pre-send cleanup** (2026-05-04)
- [x] **Platform-wide invalidation sweep (DEC-202)** (2026-05-04 evening, `60ebb11` + `e7bd500`) — 56 bare-array silent no-ops fixed across 21 files; 6 list/detail coverage gaps closed; refresh-on-save restored universally. Most egregious bug fixed: Recommend.jsx had 12 silent invalidations. Pending Doron's verification of the eight surface checks in Base44 Act-As-User preview.
- [ ] Shared invalidation helpers refactor — Living Feet candidate; `src/utils/fsInvalidations.js` with `invalidateEstimates`, `invalidateProjects`, `invalidateLogs`. Separate refactor commit.
- [ ] Query-key naming drift cleanup — three inconsistencies worth standardizing (profile-scoped vs bare prefix; `['fs-payments', projectId]` vs `['fs-payments-all']`; three names for "photos for one project").
- [ ] Insurance toggle as % (held for Doron thinking)
- [ ] Hourly rate verification
- [ ] Estimate Types expansion (Base44 + Hyphae prompts queued)
- [ ] PDF formatting polish (dedicated session)
- [ ] Documents UX session (Doron's question about whether Documents should require a client)
- [ ] `FieldServiceReport.jsx` `printNode` migration (low risk; do when next touched)
- [ ] Permit edit/inspection labels — convert `text-xs text-muted-foreground/70` to `LABEL_CLASS` for visual consistency
- [ ] Settings tab walkthrough with Bari
- [ ] View permissions customization
- [ ] Industry presets (DEC-090)

## Harvest Network

- [x] Product tags + payment methods
- [x] Tag filtering on grid
- [x] Geocoding on address save
- [x] Admin marketplace panel
- [ ] Map view (construction gated)
- [ ] Network application flow (construction gated)
- [ ] Two egg sellers onboarded

## Platform

- [ ] LLC/EIN paper filing (SSN missing, needs re-fax)
- [ ] Stripe Connect integration
- [ ] Newsletter Issue 1 sent
- [ ] Admin panel audit
- [ ] Community Pass / Recess Pass audit

---
