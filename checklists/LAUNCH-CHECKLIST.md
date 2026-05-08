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
- [x] Two-tier template architecture: system + business-scoped user-owned (DEC-163 — 2026-04-23)
- [x] Template preview modal with bracketed per-client placeholders (DEC-165 — 2026-04-23)
- [x] Business-first branding composition; logo/banner in merge fields; branded letterhead (DEC-164 — 2026-04-23)
- [x] Lightweight legal disclaimer on system templates (banner + footer — 2026-04-23)
- [x] Business.video_url field + allowlist + Settings input (render deferred to BusinessProfile redesign)
- [x] Bari's Red Umbrella contracts loaded (2026-04-23 — General Construction Contract + Subcontractor Agreement, business-scoped to Red Umbrella)
- [x] **Phase 1 Item 1 — FSPayment direction + party fields + Project original_budget immutability** (2026-04-30, Base44 schema applied; Bari's Holman backfilled `original_budget = $121,657.57`)
- [x] **Phase 1 Item 2a — Estimate calculated lines + co_number auto-increment** (covered by `e72e28c` shared `calcTotals` + `db138bf` Mgmt Fee fields + `generateCONumber()`)
- [x] **Phase 1 Item 2b — CO math wiring through builder + render** (`32ccb92`, `e72e28c`, `ef14ae9` — CO form unified with estimate, percentage fields wired, draft Edit added)
- [x] **Phase 1 Item 2c — CO signing flow + total_budget recompute** (2026-04-30, `32ccb92`) — `signChangeOrder` server function, portal token fields on FSChangeOrder, RLS relaxations, signed CO `amount` canonical for recompute (DEC-193)
- [x] **Phase 1 Item 3 — Edit-Draft on COs** (2026-04-30, `ef14ae9`)
- [x] **Phase 1 Item 4 — Log Sub Payment + Client Payment types** (2026-04-30, `c55504c`) — universal capture surface gains payment entry types per FINANCIAL-WORKFLOW-SPEC §2.6; `useFSPayments` shared hook
- [x] **Phase 1 Item 5 — Project Detail financial header** (2026-04-30, `c55504c`) — Contract / Received / Paid Out / Net Cash four-metric banner
- [x] **Phase 1 Item 6 — Management Fee separated from O&P** (2026-04-30, `db138bf`, DEC-195) — two first-class features, both subtotal-only basis, never stack; display order locked across all surfaces (Subtotal → Mgmt Fee → O&P → Other → Tax → Total)
- [x] **Phase 1 polish bundle** (2026-04-30, `148290d`) — Sales Tax toggle (default off, gates inputs + renders); `CurrencyInput` extracted to 10 sites; Estimate Cancel button; PDF branding (LocalLane title + per-print swaps); CO Delete (drafts) + Void (signed/accepted) with `voidChangeOrder` server function
- [x] **Phase 1 Settings persistence + scroll + format-while-typing** (2026-04-30, `317950e`) — `invalidateFSProfiles` helper targeting actual `['mylane-profiles-v2', userId]` cache (DEC-196); `scrollToTopOf` helper extracted on second consumer (Living Feet); CurrencyInput format-while-typing with cursor-managed digit-and-dot-count invariant
- [x] **Phase 1 feature flag wiring fix** (2026-04-30, `3c218d4`, DEC-194) — `getFeatures(profile)` helper, `features_json` canonical, asymmetric failure pattern documented
- [x] **Phase 2.1 — Trade-grouping default flip** (2026-05-08 morning, `6c3573f` + `4996051` + `cecec99`) — `is_insurance_estimate` → `flat_layout` rename + value inversion; trade-grouped default for new estimates; ClientPortal mirrored render; ~96 min wallclock end-to-end including DEC-215 promotion
- [x] **Phase 2.1 — Unallocated bucket render** (2026-05-08, `4996051`) — sentinel-keyed Map with `__unallocated__` floats untagged items to top; renders only when at least one untagged item exists; `getTradeCategories` Living Feet extraction to `src/utils/fsTradeCategories.js`
- [x] **Phase 2.1 — Migration `migrate-flat-layout-inversion`** (2026-05-08 ~08:34 PT) — 5 FSEstimate records inverted, 5 AuditLog rows, idempotency confirmed
- [x] **Phase 2.2 — Per-estimate taxonomy snapshot architecture** (2026-05-08 mid-day, `f466c07` + `6305063` + `44a3866` + `ff1d6da` + `49c0bfb`) — `FSEstimate.trade_categories_snapshot` field captures workspace taxonomy at creation time; documents-are-frozen-identity discipline at the trade-categories layer; `getEstimateTradeCategories(estimate, profile)` helper falls back to workspace working list for legacy records pre-backfill
- [x] **Phase 2.2 — Four locked taxonomy presets** (2026-05-08, `6305063`) — General Contractor (13-trade), CSI MasterFormat (16-division), Simple Three-Bucket, Service Provider — Hourly. Each preset has stable id slug; estimates carry slug in `taxonomy_preset_id`
- [x] **Phase 2.2 — Xactimate decoupling** (2026-05-08) — `flat_layout` → `group_by_trade` second rename + value invert; Xactimate-specific labeling deferred to a future per-estimate setting; toggle UI relabeled "Flat layout — Render line items as a single table"
- [x] **Phase 2.2 — `isEstimateLocked()` Living Feet extraction** (2026-05-08, `f466c07`) — 5 inline `status === 'accepted' \|\| 'signed'` gates → 1 helper at `src/utils/fsEstimateLifecycle.js`
- [x] **Phase 2.2 — `pre-migration-rls-audit.js` Living Feet helper** (2026-05-08, `ff1d6da`) — codifies DEC-215 audit pattern; reports green/red on `rls.update` key for any entity
- [x] **Phase 2.2 — Migration `migrate-flat-layout-rename`** (2026-05-08 ~10:22 PT) — 6 FSEstimate records renamed + inverted, 6 AuditLog rows, idempotency confirmed
- [x] **Phase 2.2 — Migration `migrate-trade-categories-snapshot-backfill`** (2026-05-08 ~10:27 PT) — 6 FSEstimate records backfilled with workspace's current trade_categories_json frozen as snapshot, 6 AuditLog rows, idempotency confirmed (initial run failed on raw-array write; corrected with `{items: [...]}` wrap → DEC-216 trigger)
- [x] **Phase 2.2 — Polish bundle** (2026-05-08, `88132a3` + `a6f9875` + `d02ed1f` + `47e00b8` + `3729bc7`) — preset rename `bari_general_contractor` → `general_contractor`; line-item kind/trade dropdowns shadcn-themed; save mutation optimistic cache update for preview staleness; description regression fix (shadcn `w-full` default → in-row override pattern, DEC-217 trigger); print pagination edge case fix
- [x] **Phase 2.3 — Vendor role + primary_trade_id + business_name on workers_json** (2026-05-08 afternoon, `fe1415d` + `054e402` + `8236545` + `b282e88`) — three first-class roles (worker / subcontractor / vendor); fuchsia badge color for vendor; `primary_trade_id` references workspace's CURRENT `trade_categories_json` (Phase 2.5 will derive line trades by name-bridging); `business_name` canonical (renamed from `company_name`); permissions guide updated with Vendor entry; Vendors `<Section>` in FieldServicePeople
- [x] **Phase 2.3 — Living Feet pre-work** (2026-05-08, `fe1415d`) — `WORKERS_ROLES` constant (drives badge map + role select + section filter), `parseWrappedArray` helper at `src/utils/wrapShape.js` (DEC-216 read-tolerance), `useWorkspacePeople(profile, role?)` hook
- [x] **Phase 2.3 — Migration `migrate-company-name-to-business-name`** (2026-05-08 ~12:19 PT) — 4 FieldServiceProfile records, 2 workers_json items renamed, 4 AuditLog rows, idempotency confirmed
- [x] **Phase 2.4 — `<SubVendorPicker>` typeahead component** (2026-05-08 late afternoon, `ff7e741`) — built on cmdk (`src/components/ui/command.jsx`, was shipped, unused — Phase 2.4 is first consumer in codebase) + Popover; live-read of name from workers_json by id; stale-id "(deleted)" hint; quick-add visible whenever query non-empty; per-surface role filter (LineItemsEditor: subcontractor only; FSPayment: subcontractor + vendor)
- [x] **Phase 2.4 — `<QuickAddPersonModal>` slim form** (2026-05-08, `ff7e741`) — name + role + business_name + primary_trade_id only (per Phase 2 §7.7); other fields deferred to full PersonModal in FieldServicePeople; `newWorkerId()` generates stable id; auto-select on save
- [x] **Phase 2.4 — LineItemsEditor integration** (2026-05-08, `ff7e741`) — replaces `sub_name` text input with `<SubVendorPicker>`; `updateItemFields` multi-field setter for dual-write; covers BOTH FSEstimate AND FSChangeOrder via shared component; legacy text fallback when profile not threaded
- [x] **Phase 2.4 — FSPayment Sub Payment integration** (2026-05-08, `ff7e741`) — replaces `payee_name` text input with `<SubVendorPicker role={['subcontractor','vendor']}>`; auto-syncs `party_type` from picked person's role; dual-write `party_id` + `payee_name`; FSPayment.party_id semantic broadened (Base44 description-only update applied)
- [x] **Phase 2.4 — Stable `id` field on workers_json items** (2026-05-08, `2472e39`) — closes Phase 2.3 implementation gap surfaced by Phase 2.4 architecture consultation; `EMPTY_PERSON.id`, PersonModal id generation via `newWorkerId()`, `claimWorkspaceSpot` dual-match (id first, name fallback)
- [x] **Phase 2.4 — Migration `migrate-add-workers-json-ids`** (2026-05-08 ~14:03 PT) — 4 FieldServiceProfile records, 2 workers_json items received fresh stable ids, 4 AuditLog rows, idempotency confirmed
- [x] **Phase 2.4 — `isChangeOrderLocked()` Living Feet extraction** (2026-05-08, `0467db5`) — extends `fsEstimateLifecycle.js`; 5 inline lock-gate sites in FieldServiceProjects.jsx replaced; 6 status-discrimination sites preserved inline (display labels need 'signed' vs 'accepted' distinction)
- [x] **FSEstimate signing-flow (KI #22)** structurally unblocked 2026-05-08 morning via DEC-215 (rls.update removed from FSEstimate). Verification on a non-Patricia test estimate still pending; PDF + hand-signature workaround can retire after that confirmation.
- [ ] **Phase 2.5 — Empty-field trade derivation** (Phase 2 §6 lock-in Option B) — line item trade derives from linked sub's `primary_trade_id` via name-bridging against estimate snapshot; read-time only; soft-fail to Unallocated when no name-match
- [ ] **Phase 2.6 — Polish + edge cases** — mobile, dark theme, CO render parity with Estimates (LineItemsEditor coverage already half there via `ff7e741`)
- [ ] **Patricia signing-flow regression check** (Doron, optional) — verify in-platform signing on a non-Patricia test estimate before retiring KI #22 workaround
- [ ] **Dogfood verification of `317950e`** (2026-05-01 morning) — Settings persistence across all 8 toggles, scroll-to-top after save, format-while-typing on every CurrencyInput site
- [ ] **Apply paired Base44 prompt for CO Void schema** (`community-node/base44-prompts/PHASE-1-CO-VOID-STATUS.md`) if not yet applied — adds `voided` enum value + `voided_at` + `voided_reason`
- [ ] **Estimate Types expansion** (next session) — adds `estimate_type` enum + 4 supporting fields to FSEstimate and FSChangeOrder; supports `fixed_price` / `flat_fee` / `time_and_materials` per FINANCIAL-WORKFLOW-INTENT §2; Base44 prompt + Hyphae prompt drafted, queued
- [ ] **Bari's first real estimate entry** against the new Phase 1 surface (after Estimate Types ships)
- [ ] **Permits library enhancement** — saved per-profile portal links with last-used surfacing (Phase 2; seedling)
- [ ] **E-sign hardening** (deferred per Doron) — email magic link auth; wait until real risk surfaces (bigger CO amounts, less-known clients, or first dispute)
- [ ] **Base44 legacy field cleanup** (staged, not blocking) — `community-node/base44-prompts/PHASE-1-DEPRECATE-LEGACY-FEATURE-FLAGS.md`; removes deprecated top-level boolean fields per DEC-194
- [ ] **`['fs-profile']` (singular) cache audit** — separate narrower pass when convenient
- [ ] Settings tab walkthrough with Bari
- [ ] View permissions customization
- [ ] Industry presets (DEC-090)
- [ ] Attorney review of system template disclaimer language (current is reasonable-best-practice, unreviewed)
- [ ] Attorney partnership for ongoing system template review (surfaced during Bari-prep as deferred need)

## Harvest Network

- [x] Product tags + payment methods
- [x] Tag filtering on grid
- [x] Geocoding on address save
- [x] Admin marketplace panel
- [ ] Map view (construction gated)
- [ ] Network application flow (construction gated)
- [ ] Two egg sellers onboarded

## Agents & MCP

- [x] MCP v2 circuit test — all 5 tools passing (2026-03-30)
- [x] agentScopedWrite server function built and confirmed
- [x] Mylane write capability confirmed (first agent-created record)
- [x] Agent tier gating infrastructure (subscription_tier on profiles)
- [ ] Base44 publish unblocked
- [ ] Mylane console upgrades deployed (new chat, upload, chips, cards)
- [ ] Field test: full Mylane write flow from mobile
- [x] Server-authoritative user_id on agent writes (DEC-139 — 2026-04-05)
- [x] MylaneNote reminder loop end-to-end verified (agent v2 — 2026-04-16)
- [x] Mylane Agent v2 deployed (DEC-149 — mandatory protocol, hallucination fixed — 2026-04-16)
- [x] Smart routing deployed (DEC-150 — TYPE 1 for views, TYPE 2 for novel — 2026-04-16)
- [x] RemindersCard read path fixed (Creator Only RLS bypass via agentScopedQuery — 2026-04-16)
- [ ] Propagate write capability to all workspace agents

## Team / Playmaker

- [x] Team invite flow working end to end
- [x] Personalized invite landing page
- [x] Claim-first join flow (coaches claim pre-seeded roster spots)
- [x] Onboarding skip for invite-based entry
- [x] Door links for physical-world entry (/door/:slug)
- [ ] Coach Rick field test confirmation
- [ ] Randy league demo + scheduling workflow research

## Mylane / Dark Until Explored

- [x] Mylane as default authenticated landing
- [x] Card vitality dimming (continuous opacity curve)
- [x] Discovery whisper ghost cards (proximate spaces)
- [x] Auto/Manual gradient tracking (frequency data)
- [ ] AgentChat dispatch wired for mylane-user-message
- [x] Dead code cleanup (19 dead files deleted, 31 unused imports removed — 2026-04-04)
- [x] Full 13-category audit complete (68 to 87 — 2026-04-04)
- [x] Entity permissions locked to Creator Only (9 entities — 2026-04-04)
- [x] MylaneNote reminders live (2026-04-04)
- [x] Feedback pipeline consolidated to ServiceFeedback (2026-04-04)
- [x] Founding Gardener observation live via MCP (2026-04-04)
- [x] Mylane shell containment audit complete (2026-04-15)
- [x] All 6 known escape points closed (Sessions A+B+C — 2026-04-15)
- [x] Overlay system refactored to OV constant (DEC-146 Living Feet — 2026-04-15)
- [x] Philosophy + Support surfaced inside shell (2026-04-15)
- [x] Newsletter inline form in Account overlay (2026-04-15)
- [x] Backdrop click-to-close on all overlays (2026-04-15)
- [x] 4 dead pages deleted: SpokeDetails, ShapingTheGarden, CategoryPage, Search (~1,170 lines — 2026-04-15)
- [x] Agent gated to R&D allowlist (DEC-147 — 2026-04-15)
- [x] Viewport pinch-to-fit fix (fontSize 16 — 2026-04-15)
- [x] Overlay containment polish (useBottomInset, all 9 overlays — 2026-04-16)
- [x] CommandBar pinned to viewport bottom (position: fixed — 2026-04-16)
- [x] Hidden fields filter for TYPE 2 renders (33 fields — 2026-04-16)
- [x] DrillView tab routing (TYPE 1 view param wired — 2026-04-16)
- [x] Agent loading state cleared on RENDER parse (2026-04-16)
- [x] Home Canvas spec reviewed and shelved (DEC-151 — 2026-04-16)
- [ ] Walkthrough verification: today's fixes in live app (Doron)
- [ ] ClaimBusiness + BusinessEditDrawer cleanup (co-presence model)
- [ ] Footer removal or strip (content now inside shell)
- [ ] Admin per-space reframe

## Platform

- [ ] LLC/EIN paper filing (SSN missing, needs re-fax)
- [ ] Stripe Connect integration
- [ ] Newsletter Issue 1 sent
- [ ] Admin panel audit
- [ ] Community Pass / Recess Pass audit
- [x] SpaceSpinner 3D variants (drum + cover flow) with friction physics
- [x] Semantic Tailwind migration complete (208 files)
- [x] Three themes live (Gold Standard, Cloud, Fallout with CRT effects)
- [x] Frequency Station background playback (Pip-Boy radio model — provider at root, MediaSession, mini-player)
- [x] Frequency Station studio + library (ownership model, submission wizard, admin workbench)
- [x] Frequency Station end-to-end submission→transform→deliver flow
- [x] Frequency Station notification system (in-app bell + dropdown — polish pending)
- [ ] Frequency Station playlist polish (auto-advance working, shuffle + queue UI pending)

## Round 1 — Business Foundation

- [x] **Phase 1: Schema foundation** (2026-04-22) — Business/User/FS family field additions, AuditLog entity, TEMPLATE.js canonical pattern (cfdcdb9, 1bb8936)
- [x] **Phase 1.5: additional fields** — User.is_legacy_user, User.legacy_grace_until, Business.subscription_exempt
- [x] **Phase 2: Reparenting machinery** — reparentBusiness + migrationHelpers server fns + phase-2-production-migration.js Node script (cc051a9, 210d087)
- [x] **Phase 2: Production migration applied** (2026-04-23) — Mycelia/LocalLane/TCA created, Recess reparented, Red Umbrella promoted from Bari FS, Doron sandbox archived, Bari flagged legacy, 9 AuditLog rows reversible
- [x] **Phase 2: Bari workspace smoke test** (2026-04-24 morning meeting — Bari paid $500 retainer; first external revenue)
- [x] **Phase 3: Business switcher** (2026-04-24, `c0d7c3f` — cockpit-native switcher per DEC-168; commit-handler patch made center-tile commits fire reliably; only wakes when `isMultiBusiness`)
- [x] **Phase 3: Directory visibility filter + Settings toggle** (2026-04-24, Build 2 `65e3fd7`) — `src/utils/directoryVisibility.js` helper applied at Directory/NetworkPage/Home; `listed_in_directory` allowlist; Mycelia hidden from public
- [x] **Phase 3: Profile Settings editors** (2026-04-24, Build B `6521232`) — tagline + services[] structured editor + photos gallery + accepts toggles + empty-state nudge; subtitle ladder fixed; closes Phase 2 origination gap
- [x] **Phase 3: Jobsite → Desk vocabulary rename** (2026-04-24, Build C `9598128`, DEC-170) — three PLATFORM-LABEL changes; FieldServiceAgent persona preserved; user content preserved
- [x] **Phase 3: Cockpit centering on wide viewports** (2026-04-24, Build D `47d1af2`) — removed dead `.mylane-content-area.panel-open` margin-right rule
- [x] **Phase 3: Service area structured editor** (2026-04-24, Build E `7c21c3e`, DEC-174) — `src/config/laneCountyTowns.js` (21 towns) + `TownMultiSelect.jsx` reusable component; universal across archetypes; legacy strings preserved with owner-only annotation
- [x] **Phase 3: Build F — multi-category support + SDK wrap into `src/api/`** (2026-04-25, three commits `946b9eb` / `cd8d700` / `bb76fbc` — F.1 SDK wrap foundation + businessCategories config hoist; F.2 TownMultiSelect → SlugMultiSelect rename; F.3 wire SlugMultiSelect into BusinessSettings + Directory pill filter patch + `updateProfile()` wrap amendment per DEC-177)
- [x] **Phase 3: Build G — Desk tile icon swap** (2026-04-25, `a2c46b5` — HardHat → Briefcase)
- [x] **Phase 3: Build H — workspace content centering on wide monitors** (2026-04-25, `9c3d080` — closes Phase 3)
- [x] **Base44 schema fix:** `Business.service_area` field type `string` → `array<string>` (2026-04-25, DEC-178 codifies the pairing rule)
- [ ] ~~**Phase 3.5: Direct doors `/b/{slug}`**~~ — **Deferred to post-migration per DEC-179.** Bari has redumbrellaservices.com, no farmers-market URL pressure; build once on post-migration stack.
- [x] **Phase 4.0: Folder tree as configuration** (2026-04-27, `73a3d53` community-node, `077c89a` Spec-Repo) — declarative `src/config/folderTree.js` + predicate registry `src/config/folderPredicates.js`; MyLaneSurface refactored from imperative `buildSpinnerItems()` to filter the config (Living Feet — every new folder = a config entry, not a code edit)
- [x] **Phase 4.1: Business.enabled_spaces field added (Base44) + backfill** (2026-04-27 functional; one record pending Base44 support resolved 2026-04-28) — paired Base44 + code per DEC-178; backfill seeded `["profile"]` for most businesses, Bari's Red Umbrella `["profile", "desk", "settings"]` per Section 8.10
- [x] **Phase 4.2a: Universal root folders, header pills removed** (2026-04-27, `d47ac7d` community-node, `304e538` Spec-Repo) — Directory, Events, Personal, Businesses, Discover land on root cockpit; folder-vs-leaf rendering shipped; Section 8.12 captures flagged items from smoke test
- [x] **Phase 4.2-tiles design pivot ratified (DEC-185)** (2026-04-28, `a96ae43` Spec-Repo) — tiles primary cockpit, spinner alternate behind allowlist; absorbs original 4.2b/4.3/4.4/4.5 into a unified six-step sequence
- [x] **Phase 4.2-tiles-1: Generic Tile primitive** (2026-04-28, `a3ac463` community-node) — `src/components/ui/Tile.jsx` (121 lines); BusinessCard refactored to wrap it
- [x] **Phase 4.2-tiles-2: BreadcrumbPath component** (2026-04-28, `caae822` community-node, DEC-189) — `src/components/ui/BreadcrumbPath.jsx` (121 lines); cockpit-agnostic, two presentation modes; composes shadcn primitives
- [x] **Phase 4.2-tiles-3: Tile cockpit at root** (2026-04-28, `77571b7` community-node, DEC-188) — `src/components/mylane/TilesCockpit.jsx` (158 lines); tiles becomes v1 default; `COCKPIT_PICKER_ALLOWLIST` gates spinner/compass picker
- [x] **Phase 4.2-tiles-4: Per-business folder rendering + uniform navigation** (2026-04-28, `84a9889` community-node, DEC-186/190/191) — `src/config/spaceTypes.js` (123 lines, eight entries with Profile + Settings universal); first consumer of `enabled_spaces`; DEC-148 overlays + DEC-168 switcher retired for tile users; Dev Lab removed from folder tree
- [x] **Cleanup: Field Service removed from Personal** (2026-04-28, `2c01950` community-node) — Desk is a business-only space per the city/buildings metaphor; `has_field_service_profile` predicate dropped, HomeFeed Estimates card-builder removed
- [x] **Engagement entity built in Base44** (2026-04-28, DEC-192) — design fully closed; one Read permission deviation noted (multi-field OR not supported at schema layer; row-level scoping moves to query logic)
- [ ] **Phase 4.2-tiles-5: Settings + Profile workspace surfaces + pricing-structure design** (next session) — pre-build design conversation about Profile/Settings split + pricing-model shape; BusinessSettings lifted from dashboard tab into Settings space; BusinessProfilePage wired as Profile space
- [ ] **Phase 4.2-tiles-6: Cockpit picker allowlist gate cleanup or extension as needed**
- [ ] **Phase 4.2-tiles-7: Personal Profile + Settings — architectural symmetry** — adds `enabled_spaces` field to User entity; Personal's Profile + Settings spaces; public/private toggle; foundation for user reviews; 2-3 sub-builds
- [ ] **Per-business workspace wiring** for Profile/Desk/Finance/Team — existing renderers take user-scope props that need re-scoping; Field Service specifically needs business-scoped resolver (`MyLaneDrillView.jsx:53`)
- [ ] **Phase 4.6: Resurface pass** (Admin folder, feedback affordance, others) — Section 20 sweep
- [ ] **Phase 4.7: Desk rename mechanical pass** — ~92 strings, ~40 files; last in Phase 4 per DEC-183
- [ ] **Phase 4.5: Seedlings** — Admin Impersonation, post-migration welcome flow
- [ ] **Phase 5 (NEW): Pre-migration cleanup** (DEC-180) — dead code removal, unused entity audit, archetype/main_category/sub_category_id consolidation into `subcategories[]`, walking-the-app cleanup findings:
  - [ ] Remove `legacyCategoryMapping` (`categoryData.jsx:229-240` — pre-DEC-055 IDs)
  - [ ] Remove `BusinessEditDrawer` derived-write pattern (`BusinessEditDrawer.jsx:75-98` — vestigial after Build F.3)
  - [ ] Remove unused `Business.categories` field (DEC-176 — added in error during Build F verify)
  - [ ] Replace HardHat string-icon in `workspaceTypes.js:232` (cleanup when archetype-neutralizing the workspace type)
  - [ ] Audit and prune unused entities before Supabase migration (every dormant entity = wasted Supabase schema + RLS + indexes + migration script)
  - [ ] Consolidate archetype + main_category + sub_category_id into `subcategories[]` (Hyphae's "Option 3 future" from Build F verify)
  - [ ] Walking-the-app cleanup findings from Doron's separate notes-taking session
- [ ] **Phase 6: Onboarding fork + Region foundation backfill (DEC-172) + Pattern C+ migration window (DEC-175)** — invite-based vs. cold entry; Dan Sikes claim path; Region entity + backfill; Supabase + Vercel migration combined into the same fragility window
- [ ] **Post-migration: Membership gate** — $9/mo per entity per DEC-155, with LocalLane exempt; re-tightens FSProfile/User `rls.update`. Was Phase 5; deferred to post-migration with payment infrastructure.
- [ ] **Post-migration: Direct Doors** — DEC-179 (was Phase 3.5)
- [ ] **Post-migration: Stripe Connect** (prerequisite for real money flow + for populating `legacy_grace_until` on all `is_legacy_user: true` users per DEC-159). Was Round 2; deferred to post-migration with the rest of payment infrastructure.

### Critical path to real users (next blockers)

**Field Service track (Bari is the live first paying user — drives this track):**

1. [x] **Dogfood verification of `317950e`** (2026-05-01) — Settings persistence + scroll + format-while-typing — verified by Doron 2026-05-04
2. [x] **VoiceInput import regression fix** (2026-05-01, `83faaba`)
3. [x] **PDF page-clipping + filename in iframe context (DEC-198)** (2026-05-01, `e91b696` + `cb26d4e`) — `printNode` helper sidesteps Base44 Act-As-User preview iframe; triple-title-set covers Chrome's inconsistent filename source in deep-nested iframes; FSDocument migrated. Verified on Bari's Patricia Heath estimate (EST-2026-005, ~30 line items) 2026-05-04.
4. [x] **Log rollup query-key gap (DEC-199)** (2026-05-03, `cb26d4e`) — FSLog mutation invalidates per-project keys; project DETAIL view's Spent rollup updates immediately on save. Verified by Doron 2026-05-04.
5. [x] **Tab nav tap-on-active reset** (2026-05-03, `cb26d4e`) — `MyLaneDrillView` `tabResetKey` threads into `TabComponent`'s `key` prop; tapping a tab the user is already on returns to the tab's home view. One change covers all workspaces. Verified by Doron 2026-05-04.
6. [x] **Required-field UX audit + fixes (DEC-200)** (2026-05-03, `bdd90e4`) — six fields fixed across five forms (Daily Log `tasks_completed`, Estimate `title`, Document Template `title` + `content`, Permit Inspection `type`, Change Order `title`); canonical `*` + client-side toast pattern; no Base44 schema errors leak to user. Verified by Doron 2026-05-04.
7. [x] **Bari's Patricia Heath estimate entered, multi-page PDF generates correctly, ready for pre-send cleanup** (2026-05-04)
8. [x] **Platform-wide invalidation sweep (DEC-202)** (2026-05-04 evening, `60ebb11` + `e7bd500`) — 56 bare-array silent no-ops fixed across 21 files; 6 FS list/detail coverage gaps closed; refresh-on-save restored universally. Most egregious bug fixed: Recommend.jsx had 12 silent invalidations. Pending Doron's verification of the eight surface checks in Base44 Act-As-User preview (Estimates create/edit, Client detail edit, CO sign/void, Convert estimate to project, Payment logging, Recommendations, Frequency Station seeds, Admin business edits).
9. [x] **PDF font darkness end-to-end (DEC-210)** (2026-05-07, `488973e` + `f55975c` + `3328c79`) — variable-layer overrides for `--muted-foreground` and `--foreground-soft`; alpha-modifier handling via `[class*="text-muted-foreground/"]` attribute selector; syntax repair for backticks-in-CSS-comments-in-template-literal. Print-fidelity discipline now canonical at the variable layer.
10. [x] **Single print dialog idempotency** (2026-05-07, `ed75cdf`) — `let triggered = false` guard in `waitAndPrint` prevents both onload and timeout fallback from firing. Pattern: any belt-and-suspenders scheduling with parallel paths needs the guard.
11. [x] **Contract Total derivation from linked estimate (DEC-206)** (2026-05-07, `e950fd5`) — Project Detail Contract Total tile reads from linked estimate's signed total + signed COs at render time, not stored `total_budget`. First instance of empty-field derivation through links.
12. [x] **Drillable tiles + ProjectTileDrillIn.jsx** (2026-05-07, `e950fd5`) — every financial header tile reveals its source records; one slide-over component, seven row sets; Living Feet at the modal layer. Per-row navigation reuses localStorage-prefill pattern.
13. [x] **Bidirectional estimate-project link (DEC-206)** (2026-05-07, `2111d11`) — query `estimate.project_id` for both link directions; resolves regardless of which side wrote the link. Second instance of empty-field derivation.
14. [x] **Home tab tile navigation** (2026-05-07, `72dc441`) — 4 of 6 tiles wired up to navigate to relevant space; remaining 2 surfaces queued.
15. [x] **Per-row drill-into-source navigation (DEC-209 seedling)** (2026-05-07, `18a9ecc`) — localStorage prefill pattern; honest navigation > pretend navigation seedling captured. FSPayment edit form gap surfaced (now DEC-214 deferred).
16. [x] **Projects list grouping derives client from linked estimate (DEC-206)** (2026-05-07, `5f35c0f`) — third instance, threshold met.
17. [x] **Empty-field derivation sweep across 5 sibling surfaces (DEC-206)** (2026-05-07, `2aaef46`) — `useProjectLinkedEstimates.js` hook + `deriveProjectClient` companion extracted; Project Detail header, flat list cards, drill-in modal subtitles, FSLog project picker + Client Payment "From" line, FSDocument project filter all chain through the helper. Codified in CLAUDE.md (`a11ae64`).
18. [x] **Documents section on Project Detail (DEC-213)** (2026-05-07, `193f4e8`) — entity-rollup family member; query FSDocument by `project_id`; click navigates via `fs-document-prefill-id`; "+ Add Document" navigates with `fs-document-prefill-project-id` + derived client; DEC-199 list/detail invalidation pair on five FSDocument mutation sites.
19. [x] **Payment drill-in scroll-and-flash on Recent Payments (DEC-209)** (2026-05-07, `fae9b01`) — modal closes, Recent Payments section scrolls into view, matching row rings primary-gold ~1.5s. Hyphae caught memory drift in spec citation before writing code (DEC-212 working as designed). FSPayment edit form remains deferred (DEC-214).
20. [x] **No-debrief-without-commit-hash discipline (DEC-208)** (2026-05-07, `82503b0`) — codified in CLAUDE.md after morning's work shipped without commit.
21. [x] **Empty-field derivation principle codified (DEC-206)** (2026-05-07, `a11ae64`) — CLAUDE.md addition; same shape applies to other entity link chains for future audit.
22. [x] **Verify 2026-05-07 commits in Base44 Act-As-User preview** (PDF darkness, Contract Total derivation, drillable tiles, link derivation, Documents section, payment scroll-and-flash) — verified end of day 2026-05-07.
23. [x] **Phase 2 architectural sign-off** (`Spec-Repo/spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md`) — APPROVED 2026-05-08, Approach A locked (Light Promotion + Sub Picker), all 12 open questions answered. Sign-off committed at `67b11df` (Spec-Repo). Phase 2.1 build began immediately after.
24. [ ] **Estimate edit lifecycle gating discipline** (NEW, surfaced 2026-05-07) — when does an estimate become read-only? Per Doron: "we don't want someone saving changes to a signed and approved estimate." Worth promoting to a full lifecycle gate on the Edit button itself.
25. [x] **Patricia signing-flow bug — STRUCTURALLY UNBLOCKED 2026-05-08** as side-effect of DEC-215 (`rls.update` removed from FSEstimate). Same root cause as the Phase 2.1 migration block. signEstimate server function should now succeed. Verification on a non-Patricia test estimate still pending; PDF + hand-signature workaround retires after that confirmation.
25a. [x] **Phase 2.1 — trade-grouping default flip + Unallocated bucket** (2026-05-08, `6c3573f` + `4996051` + `cecec99`) — `is_insurance_estimate` → `flat_layout` rename + invert across 9 sites; new estimates default to trade-grouped; sentinel-keyed Unallocated bucket renders for untagged line items at top of grouped view; `getTradeCategories` extracted to `src/utils/fsTradeCategories.js` (Living Feet, second consumer ClientPortal). End-to-end verified via Act-As-User as Bari: Patricia EST-2026-005 renders flat by default; toggle off → Unallocated with all 30 lines; tag Framing → splits into own group; total $182,013.69 unchanged.
25b. [x] **Phase 2.1 — `migrate-flat-layout-inversion` ran cleanly** (2026-05-08, post DEC-215 fix) — 5 FSEstimate records inverted, 5 AuditLog rows written, idempotency confirmed via re-run. Migration secret retired post-Phase-2.1 (single-use protocol honored).
25c. [x] **DEC-215 ratified** — `rls.update` must be absent on entities receiving `asServiceRole` writes. Promoted from DEC-095 amendment to structural rule with three-instance evidence (FieldServiceProfile + FSEstimate + Business). Critical safety rail: do not re-add `rls.update` as part of any future restore.
25d. [x] **ClientPortal Rules of Hooks compliance** (2026-05-08, `cecec99`) — useMemo calls moved above early returns; `npm run build` exits 0; second instance of "Base44 as production-correctness gate" pattern (after `f55975c`/`3328c79` template-literal syntax 2026-05-07).
25e. [ ] **Patricia signing-flow regression check** (NEW, follows from 25 + DEC-215) — verify in-platform signing on a non-Patricia test estimate before retiring the PDF + hand-signature workaround for KI #22.
25f. [ ] **Phase 2.2 — taxonomy presets** (next, the four locked answers Q3) — Bari General Contractor 13-trade, CSI MasterFormat 16-division, Simple Three-Bucket, Service Provider — Hourly. Seam at `src/utils/fsTradeCategories.js`. Settings preset picker + "Reset to preset" action.
26. [ ] **Drift visibility question** (NEW, 2026-05-07) — when derivation works perfectly, contractors don't realize their records have empty fields. Visible "derived from estimate" badge or auto-backfill on first view. Conversation when contractor confusion surfaces.
27. [ ] **Client Detail Documents section** (NEW, Phase 2 of DEC-213 inversion).
28. [ ] **Documents tab restructuring** (NEW, Phase 2 of DEC-213; flat list → inbox + templates + search).
29. [ ] **`useConsumePrefill` hook extraction** (NEW, DEC-148 threshold met with four uses).
30. [ ] **`<RecordSection>` primitive extraction** (NEW, four-instance threshold).
31. [ ] **`useDrillInNavigators` hook extraction** (NEW, five-instance threshold).
32. [ ] **`src/utils/fsInvalidations.js` helper file** (Living Feet candidate; `invalidateEstimates`, `invalidateProjects`, `invalidateLogs`, `invalidateDocuments`). Separate refactor commit.
33. [ ] **Query-key naming drift cleanup** — three inconsistencies worth standardizing.
34. [ ] **DEC-193 backfill consideration** (NEW, 2026-05-07) — one-shot migrationHelpers script to write `original_budget` from linked estimate.
35. [ ] **FSPayment edit capability (DEC-214 deferred)** — tied to Log-Line-Item Attribution Proposal sign-off + Spent semantic redefinition + returns/refunds. Phase 2 financial-layer architectural conversation.
36. [ ] **Light-theme `--primary-foreground` collision** (NEW, 2026-05-07) — latent bug for any future light-theme user printing.
37. [ ] **Insurance toggle as %** — held for Doron thinking
38. [ ] **Hourly rate verification** — confirm FSDailyLog labor rate reads from the right setting
39. [ ] **Estimate Types expansion** (Base44 + Hyphae prompts queued) — `fixed_price` / `flat_fee` / `time_and_materials` enum + 4 supporting fields
40. [ ] **PDF formatting polish** (dedicated session) — currently functional but not styled to brand
41. [ ] **Documents UX session** — Doron's question about whether Documents should require a client (held)
42. [ ] **Log → Project surface architecture with line-item attribution** — Phase 2 milestone (Log-Line-Item Attribution Proposal sign-off pending; 8 open questions)
43. [ ] **`FieldServiceReport.jsx` printNode migration** — low risk (its own tab, not Act-As preview), but should migrate for consistency
44. [ ] **Permit edit/inspection labels** — convert `text-xs text-muted-foreground/70` to `LABEL_CLASS` for visual consistency
45. [ ] **Client Communication tab on Project Detail (and ClientPortal)** (NEW, Bari's surfaced need 2026-05-07) — photos, voice messages, decisions, change requests captured per-project, bidirectional with client. Substantial new feature, deserves its own investigation prompt before any build.
46. [ ] Permits library enhancement (seedling, Phase 2)
47. [ ] E-sign hardening (deferred — email magic link auth when real risk surfaces)
48. [ ] Deeper dogfood across the four-metric financial header during real project lifecycle

**MyLane navigation track (Phase 4.2-tiles, parallel workstream):**

1. Phase 4.2-tiles-5 — Settings + Profile workspace surfaces + pricing-structure design
2. Phase 4.2-tiles-6 / tiles-7 — cockpit picker cleanup + Personal Profile/Settings (architectural symmetry)
3. Per-business workspace wiring — Field Service-specific business-scoped resolver (`MyLaneDrillView.jsx:53`)
4. Phase 4.6 / 4.7 — Resurface pass + Desk rename mechanical

**Platform-level path:**

1. Phase 4.5 — Seedlings (Admin Impersonation, post-migration welcome flow)
2. Phase 5 (NEW) — Pre-migration cleanup (DEC-180)
3. Phase 6 — Migration window + Region backfill (DEC-175 Pattern C+)
4. Post-migration — Membership gate, Direct Doors, Stripe Connect (payment infrastructure built once on the new stack)

---
