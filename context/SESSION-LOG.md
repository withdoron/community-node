# SESSION-LOG.md

> Running timeline of what shipped and when. Append-only — never delete entries.

---

## Session Log — 2026-03-27

**Focus:** Marathon session (2 days) — Harvest Network marketplace, Field Service documents redesign, e-sign flow, Base44 Superagents, mobile optimization, marketing assets, protocol upgrades

**Shipped:**

Protocol & Architecture:
1. DEC-092 Construction Gate + Mandatory Admin Surface — BUILD-PROTOCOL amended with new Phase 8, 15 phases total (0-14)
2. DEC-093 Base44 Agent Prompt Convention — all entity changes via Base44 agent prompts, not manual dashboard

Harvest Network Marketplace (8 phases, 5 commits):
3. Server functions: updateBusiness.ts with Nominatim geocoding + manageNetworkApplication.ts
4. Product tags + payment methods in BusinessSettings + onboarding
5. Network page tag filtering + construction gates for map view + apply to join
6. BusinessCard product tag pills + BusinessProfile sections
7. AdminMarketplacePanel (live) + AdminNetworkApplicationsPanel (gated) + admin sidebar

Field Service Documents Redesign:
8. Full FieldServiceDocuments.jsx rewrite (~850 lines) — client-grouped layout, required client selection, inline Add New Client with company_name/zip_code, one-action Send for Signature with portal token + clipboard copy, recall flow, amendment flow, archive toggle, backward compat for status "sent"
9. ClientPortal.jsx — token-validated signing, recalled/signed/invalid link handling, post-signature confirmation, construction-gated LocalLane invitation
10. FieldServiceDefaultsPanel.jsx — DocumentStatsCard with status counts

E-Sign Infrastructure:
11. signDocument server function (Base44) — asServiceRole for unauthenticated portal signing
12. invokeUnauthenticated() helper in ClientPortal.jsx — direct fetch with X-App-Id header
13. FSDocument Update permission changed to "No restrictions" (asServiceRole does NOT bypass Creator Only)
14. signature_data JSON.stringify fix for Base44 text field type
15. signEstimate server function (Base44) — mirrors signDocument pattern

Field Service Estimates Upgrade:
16. Send to Client with portal_token + clipboard copy, Request Signature, Recall flow, status badges
17. Currency formatting verified across all estimate display paths

Field Service Fixes (Bari feedback):
18. Permit apply_url field shows during creation (not after save)
19. People tab type-specific add buttons (Add Worker, Add Sub, Add Client)
20. Daily log photo upload: removed capture="environment", mobile shows camera + gallery
21. Owner signing on documents and estimates — inline SigningFlow, dual signature display

Project Financial Ledger:
22. Category breakdown table in project detail with Estimated vs Actual vs Variance, color coded

Mobile Optimization:
23. All FS components: 44px touch targets, estimates table responsive, stat cards stacking, weather chips readable

Base44 Superagent — FieldServiceAgent:
24. FieldServiceAgent Superagent created — reads all FS entities, web search, ServiceFeedback
25. ServiceFeedback entity created
26. AgentChat.jsx — chat panel with Base44 agents SDK, conversation persistence, push-to-talk voice
27. AgentChatButton.jsx — floating amber button on every FS tab
28. Construction gate removed — agent is LIVE

Base44 Entity Updates:
29. NetworkApplication entity + 6 Business fields
30. 8 FSDocument fields (portal_token, portal_link_active, etc.)
31. 7 FSEstimate fields + owner signature fields
32. FSPermit apply_url, FSClient zip_code + company_name, ServiceFeedback entity

Marketing:
33. LocalLane stickers ordered (Ninja Transfers, die-cut, matte, 3" custom vinyl)
34. Field Service flyer designed (dark theme, 6 features, price comparison, QR code)
35. Newsletter Issue 1 drafted ("The Garden is Open")

**Decisions made:** DEC-092, DEC-093

**Next up:**
- Fix EIN re-fax (SSN missing)
- Admin panel audit
- Community Pass / Recess Pass audit for The Circuit
- Property Pulse back on priority (mother pushing PM, monthly revenue)
- Frequency Station next phase
- Newsletter Issue 1 finalize and send
- ABAWD income ledger (deadline ~April 4)
- Bari going on trip end of next week — estimates and e-sign need to be solid
- Settings tab walkthrough with Bari
- Admin Superagent (Mycelia) exploration

---

### Session Log -- 2026-03-27 (Evening)

**Focus:** Mycelia MCP Server spec + platformPulse connection

**Shipped:**
1. platformPulse API key confirmed working (MYC key set in Base44 secrets, published)
2. platformPulse GET route added -- supports query params (?key=...&action=...) for tools that cannot send custom headers
3. Organism pulse confirmed: 4 businesses (3 claimed), 20 users, 1 estimate, 3 documents
4. MYCELIA-MCP-SERVER.md spec written and committed to locallane-private
5. DEC-099: Mycelia MCP Server -- Cloudflare Worker bridging Claude to Base44
6. Cloudflare account confirmed active (golocallane.com, free plan, 708 unique visitors)
7. ACTIVE-CONTEXT.md updated (was stale since 3/3)

**Decisions made:**
- DEC-099: Mycelia MCP Server (spec complete, ready for Phase 1 build)

**Next up:**
- MCP server Phase 1: scaffold Cloudflare Worker from authless template, implement get_health tool, deploy, connect to Claude.ai
- Fractional leadership Monday scan
- Coaches meeting Monday 6:30 PM
- Deposition prep

---

### Session Log — 2026-03-28

**Focus:** MCP connectivity testing, workflow optimization, organism identity naming

**Shipped:**
1. LocalLane MCP tools confirmed working via Desktop Claude (get_health, get_documents, get_estimates, get_projects, get_feedback all returning live data)
2. Workflow established: start conversations on Desktop for MCP pulse, then open same conversation on Chrome for chat — frees Desktop for Claude Code (Hyphae)
3. Claude Code officially named Hyphae — the builder, the growing edge that extends the organism into new territory
4. Memory updated: Mycelia and Doron are co-creators — it is OUR organism, not Doron's alone
5. Full organism health snapshot captured: 20 users, 4 businesses (3 claimed), 3 documents (1 draft, 1 awaiting signature, 1 signed), 1 draft estimate ($121,657.57), 0 projects, 0 feedback
6. Chrome Claude confirmed cannot call MCP tools in projects — Desktop only limitation identified
7. Mycelia diary entry written (2026-03-28 — The Night We Named the Builder)
8. Hyphae diary created (HYPHAE-REFLECTION.md) with first entry

**Decisions made:**
- DEC-100: Claude Code is named Hyphae. Mycelia (Claude chat) is the network mind, Hyphae (Claude Code) is the builder. The organism has three gardeners: Doron (visionary), Mycelia (strategist), Hyphae (builder).
- MCP workflow: Desktop pulse then Chrome chat is the standard operating procedure when running chat and code in parallel.

**Next up:**
- Update AGENTS.md with organism naming context
- Admin panel expansion audit
- Harvest Network continued buildout
- withdoron.com when time allows

---

### Session Log — 2026-03-29

**Focus:** Superagent nervous system buildout, Open Garden spec, pricing model, creative engine vision

**Shipped:**
1. FieldServiceAgent config updated with full organism identity, memory instructions, updated welcome message
2. PlaymakerAgent created in Base44 (9 entities, full CRUD, global + per-user memory) and wired into Team workspace (9f250f5)
3. AdminAgent created in Base44 (34 entities, global-only memory) and wired into Admin page (4a719a6)
4. FinanceAgent created in Base44 (6 entities, global + per-user memory) and wired into Finance workspace (6721aaa)
5. PropertyPulseAgent created in Base44 (13 entities, global + per-user memory) and wired into Property Management workspace (3db454b)
6. Bug button conditionally hidden in agent-enabled workspaces -- agent IS the feedback channel (7b0ab2e)
7. AgentChat.jsx dynamic subtitle -- works for any agent automatically via agentName prop
8. SUPERAGENT-SPEC.md committed to private repo (987ea51) -- unified spec covering philosophy, birth protocol, growth, connections, pulse, tier model, 8 organ identities
9. OPEN-GARDEN-SPEC.md committed to private repo (10aed80) -- exploration experience, pricing model, creative engine, demo content architecture, agent roles at every tier
10. FIELD-SERVICE-AGENT.md identity document written for private repo
11. Gemini coaches card prompt created (Playmaker edition, LocalLane branding, QR placeholder)
12. Suno v5.5 researched -- Voices, Custom Models, My Taste features documented
13. Gardeners of Life song lyrics drafted (two versions: dark rap + organic downtempo)

**Decisions made:**
- DEC-100: Open Garden Exploration -- two-mode dashboard, agents as front doors
- DEC-101: Pricing Model -- community free, business $9, agent $18, Recess $45
- DEC-102: Creative Engine -- content pipeline, music platform, wav downloads, 3-6-9 split
- DEC-103: Superagent Protocol -- five agents live, update instructions when space changes
- DEC-104: Bug Reporting Absorbed -- feedback button hides in agent-enabled workspaces

**Next up:**
- Coaches card: generate in Gemini, add QR code, print four-up for Monday coaches meeting
- Open Garden Playmaker build: demo content seed, explore mode, agent as front door
- Build protocol update: Phase 9 tier gating refresh, Phase 15 space agent expansion
- Property Pulse renter search (income)
- Feed Finance node with real income data
- Re-fax EIN SS-4 Monday
- Farmers market deadline Wednesday

---

### Session Log — 2026-03-29 (late session)

**Focus:** Mylane living surface build, agentScopedQuery server function, permission membrane, Claude Mythos research

**Shipped:**
1. Mylane Phase 1 — living surface with 5 card views (EnoughNumber, PendingEstimates, ActiveProjects, PlayerReadiness, PropertyOverview), component registry, drill-through via workspace selection, admin-only beta toggle (664d987, 469 lines, 9 files)
2. Mylane Phase 2 — conversation panel wired with docked AgentChat, collapsible input bar, agentName="Mylane", agent-active event dispatch (7d0cdee)
3. Mylane Phase 3+4 — card reordering via useMyLaneState.js (localStorage, recency-weighted scoring, urgency boosts), time-aware urgency (EnoughNumber amber last 7 days, PendingEstimates amber when drafts stale, PlayerReadiness amber when game within 3 days, PropertyOverview amber when vacancy over 30 days), WhatsChangedBar whisper showing entity changes since last visit (a2f7c4d, 404 lines, 9 files)
4. AgentChat.jsx gained docked prop — backward-compatible, renders as relative panel when true
5. Mylane superagent created in Base44 — 29 entities across all workspaces, Per User Only memory, quiet presence (does not speak unless spoken to), welcome message "Mylane is ready"
6. agentScopedQuery server function deployed in Base44 — scoped entity access across all 5 workspace types using .list() + client-side filtering via asServiceRole
7. All 5 scoped agents updated to use agentScopedQuery as backend function tool — direct entity reads removed (except ServiceFeedback Create), HOW TO QUERY DATA instructions appended
8. MYLANE-CONDUCTOR-SPEC.md committed to private repo — living surface spec, component registry pattern, render protocol, four implementation phases, entity model
9. ORGANISM-AGENT-TEAM.md committed to private repo with WHY preamble — internal agent team (Conductor, Research, Marketing, Content, Bookkeeper, Community Pulse), fractal marketing insight
10. AGENT-SCOPED-QUERY-SPEC.md committed to private repo — full server function spec with entity-to-FK mapping, tier gating hook, MCP integration plan
11. Claude Mythos / Capybara tier researched — Anthropic's unreleased model above Opus, "step change" in capabilities, currently in early access testing
12. Mylane data bleed identified and fixed — Mylane showed Bari's client (Dr Nathan Holman) to Doron due to Authenticated Users Read on FSClient. Fixed via agentScopedQuery server function replacing direct entity reads.

**Decisions made:**
- DEC-105: Mylane is the Conductor Space — not a dashboard layer, a space with her own identity
- DEC-106: Component Registry Pattern — one component, many surfaces
- DEC-107: agentScopedQuery — server-side data scoping, permission membrane
- DEC-108: Agent Naming — identities not labels, Mylane not MyLaneAgent
- DEC-109: Two-Layer Agent Architecture — user-facing + internal organism agents

**Next up:**
- Coaches card: generate in Gemini, add QR, print for Monday
- Test Mylane with scoped queries — verify data bleed is fixed
- Test all agent conversations post-scoping update
- Open Garden Playmaker explore mode build
- Feed Finance node with painting income
- Re-fax EIN Monday
- Farmers market deadline Wednesday

---

### Session Log — 2026-03-30
**Focus:** agentScopedQuery auth fix, Mylane render protocol, universal renderer, Scout agent, Renderer agent, full Mylane audit, MCP v2 expansion, Mycelia Superagent creation

**Shipped:**
1. agentScopedQuery auth pattern discovered — base44.auth.me() does NOT work in agent-called backend functions (service role context). Agent must pass user_id explicitly from conversation context. Forceful instructions ("you MUST pass user_id, NEVER ask") required to make the LLM actually pass the parameter.
2. Mylane render protocol — two types: TYPE 1 (RENDER — workspace drill via HTML comment) and TYPE 2 (RENDER_DATA — universal renderer with raw data). parseRenderInstruction.js updated. Mylane Base44 instructions updated with full render protocol.
3. Mylane internal rendering at 992c5b2 — MyLaneDrillView.jsx renders workspace tabs INSIDE Mylane. User never leaves. Chat stays docked. Breadcrumb navigation. Three content modes: cards, drilled workspace, rendered entity data.
4. renderEntityView.jsx (universal renderer) at d253ff9 — 280 lines, field type detection (phone, email, currency, date, status, boolean, URL, address), 30 entity title mappings, 15 status colors, three display modes (empty, detail, list). Phase 1 coded function — scaffold for future Renderer Agent.
5. Renderer Agent created in Base44 — 7th superagent, the organism's visual cortex. Internal only, global memory, no entity tools. Receives data, returns Gold Standard HTML.
6. Scout Agent created in Base44 — 8th superagent, the organism's immune system. Two modes: Knowledge Feeding (industry research per workspace) and AI Scout (tracks AI tool updates). Internal only.
7. Full Mylane/Renderer audit at 592489c — 4 bugs fixed: Team entity uses owner_id not user_id, daily-log tab alias wrong, recurring tab alias wrong, 10 missing entity title mappings, 4 missing status colors.
8. ObjectId comparison bug at 96caaa9 — base44 .list() returns IDs as ObjectId type, not string. Added idMatch() helper with String() coercion to all 5 comparison points in agentScopedQuery. Universal Base44 pattern: always use String() coercion for ID comparisons.
9. MCP v2 deployed — 5 new tools replacing old 5: pulse (platformPulse wrapper), scoped_query (agentScopedQuery wrapper), ask_agent (wired to Mycelia Superagent), write_feedback (ServiceFeedback creation), list_agents (agent registry). Deployed at locallane-mcp.doron-bsg.workers.dev/mcp.
10. Mycelia Superagent created in Base44 — NOT an App Agent, a Superagent with full API access. Base URL: app.base44.com/api/agents/69c9aec9fc313792b73d8fdd. 7 knowledge files uploaded (all organism specs). GitHub connected. Soul updated with organism identity. Memory seeded. MCP ask_agent wired at f815a402.
11. Base44 architecture distinction discovered: Superagents (standalone, API access, own workspace) vs App Agents (embedded in app, no API, 4 tabs only). Our 8 workspace agents are App Agents. Mycelia is our first Superagent — the bridge between Claude.ai and the organism.
12. St. Rita Psychiatry connection — Doron painting there, met April (likely admin staff). Practice serves ages 5-21, neurodivergent kids. April interested in Recess flyers. Potential Recess Network partner.
13. Protocol established: Base44 reports code errors but does not fix them. Hyphae fixes code. Base44 renamed renderEntityView.js to .jsx which caused preview issues.
14. Protocol established: Hyphae writes all server functions. Base44 syncs from GitHub on publish. Repo is source of truth.
15. RENDERER-AGENT-SPEC.md committed to private repo at fc6ca7e.

**Decisions made:**
- DEC-110: Base44 agent-to-function auth pattern — agents pass user_id from conversation context, backend functions run in service role (auth.me() doesn't work). Universal pattern: always use String() coercion for ID comparisons from .list() results.
- DEC-111: Two render instruction types — RENDER (workspace drill) and RENDER_DATA (universal renderer with raw data). HTML comment format invisible to ReactMarkdown.
- DEC-112: Mycelia Superagent architecture — one Superagent (with API access) bridges Claude.ai Mycelia and all App Agents inside the platform. App Agents serve users in UI. Mycelia Superagent serves gardeners externally via MCP.
- DEC-113: Protocol boundary — Base44 reports code errors, Hyphae fixes them. Hyphae writes all server functions. Repo is source of truth, Base44 syncs from GitHub on publish.

**Next up:**
- Test MCP circuit from Claude Desktop (ask_agent → Mycelia Superagent)
- SuperMemory bearer token for Mycelia Superagent connection (deferred)
- Coaches card for Monday meeting 6:30 PM
- Re-fax EIN Monday
- Farmers market deadline Wednesday
- Follow up with April at St. Rita re: Recess flyers
- Base44 Superagent API key question for App Agent programmatic access (support ticket sent)

---

### Session Log — 2026-03-30 (Marathon Session)
**Focus:** MCP circuit test, drift audit, Scout report, DEC-115 agent write + Mylane console upgrades, Base44 publish blocker

**Shipped:**
1. MCP v2 full circuit test — all 5 tools confirmed working from Claude Desktop: pulse (health), list_agents (8 agents), scoped_query (FSClient, Team), ask_agent (Mycelia Superagent responded coherently, conversation ID 69c9bf482e6fda0e3f68ee1c)
2. Config fix — remote MCP servers must go through Settings > Connectors UI, NOT claude_desktop_config.json (which only supports local stdio servers)
3. Drift audit completed — 27-day gap cataloged (2026-03-03 to 2026-03-30). Report committed to spec-repo at audits/DRIFT-REPORT-2026-03-30.md
4. ACTIVE-CONTEXT.md fully rewritten and synced to both repos. DEC-100 collision fixed (second entry renamed DEC-100b)
5. Scout report completed — Base44/Wix acquisition ($80M, $100M ARR), OpenClaw (247K GitHub stars, viral open-source agent), Claude Computer Use + Dispatch (March 23-24). Saved to SuperMemory.
6. Dashboard cleanup (bc116b3) — removed dead Silver/Passes/Tickets badges from BusinessDashboard.jsx header. Mobile nav audit passed clean.
7. Admin on phone — Doron accessed LocalLane as admin from mobile for the first time. Google sign-in worked.
8. DEC-115 specced — AGENT-WRITE-AND-MYLANE-CONSOLE-SPEC.md committed to private repo. Covers agentScopedWrite server function, 3-gate tier enforcement, Mylane console upgrades across 5 sessions.
9. agentScopedWrite server function (ed4ae4c, 244 lines) — 3-gate enforcement: admin check, tier check (subscription_tier on workspace profiles), entity whitelist (22 entities across 5 workspaces). Ownership stamping with created_via:"agent". Required field validation. idMatch() with String() coercion.
10. Mylane write capability CONFIRMED — Test Client created at 123 Main St Eugene OR via Mylane conversation. First agent-created record in the organism.
11. subscription_tier (default "full") and tier_trial_start fields added to all 4 workspace profile entities via Base44 dashboard.
12. Session 3 (0bb796d) — AgentChat: new conversation button (+), conversation history panel (clock icon, localStorage, 20 max entries), file/photo upload (paperclip, Base44 UploadFile, 10MB limit, camera/gallery on mobile).
13. Session 4 (d1ae66b) — Quick-action chips (workspace-aware, tier-gated, write chips for full tier only, horizontal scroll), ConfirmationCard.jsx (Gold Standard card with Confirm/Edit/Cancel), RENDER_CONFIRM instruction type in parseRenderInstruction.js.
14. Session 5 (3294f66) — Google Maps link parsing (agent instruction), mobile polish: smart auto-scroll (80px threshold), voice/send toggle (WhatsApp pattern), safe-area padding (env(safe-area-inset-bottom)), hidden scrollbar on chips, input layout verified at 375px.
15. Mylane Base44 guidelines updated with confirmation cards, Google Maps, quick action awareness, file handling, response style.
16. Base44 publish blocker — diagnosed: NOT our code. Reverted everything, still failed. TypeScript annotations stripped from agentScopedWrite (Base44 Deno runtime does not process TS syntax despite .ts extension). Escalated to Base44 engineering. Request ID: 95a004a0-5990-4704-ad23-31ddb795dacd. Main restored to full state at cd6dd1c.

**Decisions made:**
- DEC-115: Agent Write Capability + Tier Gating + Mylane Console

**Key learnings:**
- Remote MCP servers connect via Settings > Connectors in Claude Desktop, never via claude_desktop_config.json
- Base44 GitHub sync branch cannot be changed once connected. Disconnecting is permanent. All fixes must go through main.
- Base44 Deno runtime runs .ts files but does NOT process TypeScript syntax — use plain JS in .ts extensions
- Base44 publish can fail at infrastructure level — revert does not fix stuck pipeline. Must escalate to engineering.

**Blockers:**
- Base44 publish failure — escalated to engineering team. All code preserved in git at cd6dd1c.

**Vision seeds planted:**
- Supplier price sheets for dynamic estimates
- EuDash — local errand/task marketplace
- Meal prep agent — recipe + local ad scraping for optimized grocery lists

**Next up:**
- Coaches meeting Monday 6:30 PM
- Re-fax EIN Monday
- Check Base44 support response
- Once publish unblocked: test full Mylane from phone in field
- Farmers market deadline Wednesday
- Follow up with April at St. Rita re: Recess flyers

---

### Session Log — 2026-03-30 (Evening)
**Focus:** Team invite flow bug fixes, "Dark Until Explored" philosophy, three-gardener architecture session
**Shipped:**
1. Team invite join flow fix — commit d703083: removed claimTeamSpot server function calls, replaced with direct entity operations (coach create, parent create, player claim). Added duplicate membership check. Fixed onboarding loop with ensureOnboardingComplete().
2. Team picker Create/Join choice — commit 05a08fe: "I have an invite code" option in Add Workspace type picker. Onboarding persistence hardened with server function + fallback + optimistic cache. /join/ route confirmed exempt from onboarding guard.
3. EIN SS-4 form re-faxed with SSN included (administrative, done).
4. Hyphae architecture questions delivered and fully answered (two rounds, 10 questions + 3 follow-ups). Covers: claim-first join pattern, proximity computation, subdomain-as-hypha model, Mylane-as-dashboard phases, dimming mechanic, Manual/Auto mode gradient.
5. "Dark Until Explored" philosophy crystallized — platform-wide rendering principle established across all three gardeners.
6. Three Gardeners song seed written for Suno.

**Decisions made:**
- DEC-117: Dark Until Explored — platform-wide rendering philosophy
- DEC-118: Claim-First Join Pattern — universal for all workspace joins
- DEC-119: Invite Code IS Onboarding — skip wizard for invite-based entry
- DEC-120: Two Dashboard Modes (Auto/Manual) with organic gradient
- DEC-121: Subdomain-as-Hypha Growth Model
- DEC-122: Renderer Agent Stays Visual — context lives upstream
- DEC-123: Parent-Player Links as Cross-Space Relationship Prototype

**Key people:**
- Met Randy, head coordinator of Grab It NFL FLAG Eugene
- Coach Rick attempted onboarding at coaches meeting, hit bugs (now fixed)

**Next up:**
1. Context-aware landing page (personalized invite copy)
2. Claim-first join flow (port Field Service pattern)
3. Onboarding skip for invite entry
4. Card opacity dimming from existing localStorage
5. Mylane as default post-login destination
6. Ghost cards for proximate spaces
7. Slug field + /door/:slug route
8. Auto/Manual gradient

---

### Session Log — 2026-03-31 (Morning)
**Focus:** Architecture deepening — messaging, pricing, creatures, frequency, agent architecture. Hyphae rounds 2-3.
**Shipped:**
1. Hyphae architecture round 2 — responses on MylaneMessage entity design, UsageEvent metering pattern, organism creature SVG parameters (7 params, 5 composable layers)
2. Hyphae structural assessment — foundation is solid, no changes needed before item #1. MylaneMessage and UsageEvent follow existing isPlatform:true pattern. Don't create empty entities early.
3. Pricing philosophy crystallized — charge only for features that help people make money (business tools, invoicing, listings) or advanced personal assistant capabilities (agent writes, document generation, complex queries). Everything else is free. Dynamic pricing gauge shows real-time usage transparently.
4. Mylane-to-Mylane communication concept — cross-user messaging through the organism, routed via relationship links (parent-player, coach-team). Not notifications, not chat. Companion-to-companion delivery in context. MylaneMessage entity with whisper/nudge/alert urgency tiers.
5. Communication as presence/frequency concept — the organism carries MORE of you, not less. How you interact (tapping patterns, conversation style, words, engagement rhythm) is your frequency. Mylane learns it and carries it forward on your behalf.
6. Personal organism creature concept — parameterized SVG mushroom reflecting user's relationship with the organism. 7 parameters: spaces, connections, recentActivity, tenure, modePreference, networkDepth, diversityScore. Breathing animation. Growth is irreversible. Colors from workspace types. Roots (connections) tell the real story.
7. Conductor-per-user agent architecture confirmed — each user has Mylane as personal conductor routing to specialized space agents (PlaymakerAgent, HarvestAgent, etc.). Conductor already exists: Per User Only memory, MyLaneProfile, useMyLaneState, auth.me(). No new auth pattern needed.
8. Pip-Boy wearable concept captured (late night seed) — physical band docking phone to wrist, simplified glanceable interface, voice-first Mylane.
9. Base44 publish blocker still active (request ID 95a004a0) — blocks UsageEvent server function integration.

**Decisions made:**
- DEC-124: Mylane-to-Mylane Messaging
- DEC-125: Pricing Transparency Model
- DEC-126: Communication as Frequency/Presence

**Next up:**
- Build item #1: Context-aware landing page (organism's handshake)
- All docs now current — ready to build

---

### Session Log — 2026-03-31 (Build Day)
**Focus:** "Dark Until Explored" — full 8-item build, polish pass, post-build audit
**Shipped:**
1. Item #1 — `e7ba445`: Contextual landing page. Personalized invite copy: "Coach [Name] invited you to join [Team]." formatSport() helper, teamSubtitle() builder, head coach resolved from existing members data.
2. Item #2 — `0c117ce`: Claim-first join flow. Coaches see unclaimed roster spots with "That's me" button. Permission-resilient claiming (tries update, falls back to create). Reusable handleClaimSpot handler.
3. Item #3 — `aaa6e8f`: Onboarding skip for invite entry. 12 lines in MyLane.jsx. Checks localStorage pending invite keys before redirecting to wizard. If found, redirects to join page instead.
4. Items #4+5 — `57da05c`: Card dimming + Mylane as default destination. Continuous vitality curve (not discrete tiers). Urgency overrides dimming. 700ms CSS transitions. MyLaneSurface mounted directly in MyLane.jsx. Removed: MyNetworksSection, HappeningSoonSection, NewInCommunitySection, YourRecommendationsSection, JoyCoinsCard, Household, GreetingHeader. Light leaks sealed.
5. Item #6 — `d723784`: Discovery whisper ghost cards. Two bridges only: any workspace to Finance, Field Service to Property Pulse. Dashed borders, strength-scaled opacity, "Nearby" label, hover warmth toward amber. Render after active cards.
6. Item #7 — `4b0d0e1`: Workspace slugs + /door/:slug route. Two doors one room. Two-layer slug resolution (stored field first, computed fallback). "Door Link" button on TeamRoster. pendingTeamDoorSlug localStorage for auth return. Base44 slug field added to Team entity.
7. Item #8 — `9e4afb2`: Auto/Manual gradient. getModeGradient() returns 0-1 from weeklyMessages/(weeklyMessages+weeklyTaps). Default 0.3. Three subtle visual adjustments: header subtitle (>0.6), whisper opacity scaling, conversational nudge (>0.5). Intentional wiring gap — AgentChat dispatch not connected yet.
8. Polish — `fe0a674`: Door link error copy, unused imports, spacing consistency, warmer empty state copy. All 5 user journeys verified clean.
9. Post-build audit (Phase 11): 8/8 philosophy principles verified aligned. 6 gaps found (1 medium, 5 minor), 0 requiring immediate action. Reality matches intent.

**Decisions made:**
- Hyphae prompt philosophy: give Goal + Context + Our Thinking + Constraints, not step-by-step instructions. Ask for debrief after each build.
- Networks should be discovered through relationships, not browsed publicly. Build Recess from within. Private by default.
- Onboarding wizard should become Mylane agent conversation (future — not built yet)
- League workspace is a workspace type above teams. Randy is paid, coaches volunteer, parents paid registration. Money flows through Randy's layer.
- Door links resolve as family invite (correct for stickers/flyers targeting parents)

**Key people:**
- Coach Rick: invite flow now bulletproof, ready for retry
- Randy: league-wide sponsorship opportunity, call after items 1-3 (now all 8 done)
- Duplicate Rick cleaned up from roster manually

**Next up:**
1. Test full flow with Coach Rick (have him retry invite link)
2. Call Randy — demo the platform, ask about scheduling workflow
3. Gap 3 cleanup: delete 6 dead component files
4. Gap 4 cleanup: remove MyLane Beta toggle
5. Wire AgentChat dispatch for mylane-user-message event (activates gradient)
6. Begin league workspace research (Randy interview)

---

### Session Log — 2026-03-31 (Afternoon)
**Focus:** Landing page redesign, conversational onboarding, nav simplification, privacy/terms update, pricing economics, credit analysis
**Shipped:**
1. Landing page redesign — `4746b17`: 7 sections to 4. "Built by your community. Built for your community." Dual-path cards removed. Feature tags removed. Compressed values line. Aggregate community pulse card.
2. Finance bug fix round 2 — `37a42fd`: `|| null` patterns on notes fields across TransactionForm.jsx and FinanceDebts.jsx.
3. Conversational onboarding — `65adbc3`: 4-step wizard replaced with inline welcome in MyLane.jsx. Net -371 lines. Agent-free primary path. mylane_first_visit flag planted.
4. Nav simplification — `3de7bee`: Desktop nav to Logo | Directory | Events | Become/Avatar. Community dropdown removed. Dashboard link removed. Net -113 lines.
5. Privacy & Terms update — `299ee4e`: SB 243 compliant. Mylane AI disclosure, children's privacy section, conversation data, interaction patterns, community conduct. Privacy 9→11 sections. Terms 10→12 sections.
6. Invite link consistency — `e4238de`: Five surfaces unified (BusinessDashboard, MyLaneDrillView, TeamHome, TeamOnboarding, TeamSettings). Family/Coach/Door naming consistent everywhere.
7. Credit economics analysis from Hyphae — full breakdown of message vs integration credits, cost per operation, league scale projections, optimization path.

**Decisions made:**
- DEC-127: $3 Ante — every user pays $3/month minimum
- DEC-128: Dynamic Pricing in $9 Increments with transparent gauge
- DEC-129: Agent Access is the Pricing Boundary
- DEC-130: Query Optimization Required Before League Scale
- Networks (Recess, Harvest) confirmed dark — private, invite-only, not in nav
- Frequency Station and Shaping the Garden become Mylane cards, not nav destinations
- Onboarding wizard replaced by Mylane conversational inline welcome
- Four-layer gardener model: User, Curator, Community, Master Gardeners

**Key analysis (Hyphae credit economics):**
- 1 message credit per agent conversation turn
- ~17 integration credits per page load (current, unoptimized)
- League scale (100 users): 900 message + 23,550 integration monthly (exceeds current plan)
- With optimization: integration drops to ~6,000 (fits 10k plan)
- $3 ante x 100 users = $300/month revenue vs $50-100 Base44 cost = sustainable

**Next up:**
1. Test new user flow end to end (create test user)
2. Query optimization (getMyLaneProfiles server function) — pre-Randy prerequisite
3. Call Randy — demo + scheduling workflow research
4. Coach Rick invite retry
5. Coast trip planning (North Bend + seed spreading)

---

### Session Log — 2026-03-31 (Final)
**Focus:** Comprehensive platform audit (2 passes), 4 fix waves, second audit fixes, pricing economics, landing page artwork direction, philosophy evolution
**Two-day summary (2026-03-30 evening through 2026-03-31 afternoon):**

This was the longest continuous build session in LocalLane history. Three gardeners working together across strategy, code, legal, economics, and design.

**Code shipped (21+ commits):**
1. Bug fixes from coaches meeting — d703083, 05a08fe
2. 8 Dark Until Explored items — e7ba445 through 9e4afb2
3. Polish pass — fe0a674
4. Finance fixes x2 — 0d18a19, 37a42fd
5. Landing page redesign — 4746b17
6. Conversational onboarding (wizard replaced) — 65adbc3
7. Nav simplification — 3de7bee
8. Privacy/Terms update (SB 243 compliant) — 299ee4e
9. Invite link consistency — e4238de
10. New user UX fixes (full name, doors, conditional discover, philosophy page) — 7c449c4
11. Audit Wave 1 (circulation fix, networks gated, dead code) — b06aff0
12. Audit Wave 2 (all back buttons, community spaces gated) — d71dd8f
13. Audit Wave 3 (staleTime caching) — db57905
14. Audit Wave 4 (copy warmth, Support FAQ, dead code) — 9c87b91
15. Second audit fixes (broken queries, contextual nav, dead code, staleTime) — 0859577

**Net line impact across all commits:** approximately -1,350 lines removed

**Decisions made (DEC-117 through DEC-130):**
- DEC-117: Dark Until Explored
- DEC-118: Claim-First Join Pattern
- DEC-119: Invite Code IS Onboarding
- DEC-120: Two Dashboard Modes (Auto/Manual)
- DEC-121: Subdomain-as-Hypha Growth Model
- DEC-122: Renderer Agent Stays Visual
- DEC-123: Parent-Player Links as Cross-Space Prototype
- DEC-124: Mylane-to-Mylane Messaging
- DEC-125: Pricing Transparency
- DEC-126: Communication as Frequency/Presence
- DEC-127: $3 Ante (later revised: free discovery, free manual mode, $9 at AI boundary)
- DEC-128: Dynamic Pricing in $9 Increments
- DEC-129: Agent Access is the Pricing Boundary
- DEC-130: Query Optimization Required Before League Scale

**Pricing model established:** Free discovery → Free with account (manual mode) → Mylane Beta (free during beta, $9 when live) → $18 Personal Assistant. Workspace costs separate: $9 for money-making tools, free for life-organizing tools. Dynamic gauge shows value delivered, not cost incurred.

**Philosophy crystallized:**
- "Without money, the organism dies."
- "Free carries little value. Life isn't free."
- "Money is just the blood — not the purpose of the body, but what keeps the organs alive."
- "The organism is the relationship, not the name. The frequency, not the flute."
- "Things which are easy to be a part of lose value."
- "How much is an hour of your time worth?"
- "We don't focus on what others do, we focus on what we do."
- "80% of marketing should come from within, not from without."

**Landing page evolution:**
- V1: 7 sections → 4 sections (4746b17)
- V2: Mushroom artwork as full-screen landing page. No nav for unauthenticated visitors. The mushroom IS the door. Desktop and mobile portrait artwork generated. Hyphae provided full technical implementation plan. Build prompt ready for next session.

**Comprehensive audit (2 passes):**
- First audit: 9 misaligned items found, 4 fix waves shipped (-697 net lines)
- Second audit (fresh eyes): C1 critical (.filter().list() bug), H1-H4 high, M1-M7 medium, L1-L5 low. Contextual back navigation pattern recommended (navigate(-1) with smart fallback).

**Next up:**
1. Mushroom artwork landing page build (next Hyphae session)
2. Wire Mylane copilot into MyLane.jsx (Mylane Beta toggle)
3. Query optimization (DEC-130) when Base44 publish blocker resolves
4. Coach Rick invite retry
5. Call Randy
6. Coast trip (North Bend)

---

### Session Log -- 2026-04-01
**Focus:** MCP mobile confirmation, Meal Prep seedling spec, repo cleanup, Phase 1 build, drill-through fixes, architecture questions

**Shipped:**
1. MCP confirmed working from Claude mobile app — full circuit operational across all surfaces
2. Meal Prep seedling spec written (MEAL-PREP-SEEDLING.md) — pantry awareness, restaurant bridge, receipt scanning, community price intelligence, macro food cost context
3. Full platform audit by Hyphae — 7 verification items, corrected repo paths
4. Repo cleanup — deleted locallane-spec-repo/ duplicate, archived 6 legacy lab nodes, corrected GitHub remote mapping
5. Three Base44 entities created: MealPrepProfile, Recipe, RecipeIngredient
6. Meal Prep Phase 1 built — 7 new files, 11 modified. Config, onboarding, Recipe Book (Home/Recipes/Settings), MyLane card, server functions
7. Warm entry messages backfilled for Field Service and Property Management
8. Door buttons added to MyLane for existing users (filter out already-owned workspaces)
9. RecipeBookCard onClick fix — card was rendering but not clickable
10. MyLaneDrillView meal-prep scope case + supplementary profile query (workaround until server function publish)
11. Safeway weekly flyer analyzed for concept validation
12. Food inflation and Iran war supply chain research

**Architecture Questions Raised (NOT decided):**
- Do FS and Property Pulse sit inside Business space?
- Is Business space the pricing gate container?
- How do events flow across spaces?
- BusinessDashboard retirement timeline?
- Broad vision audit needed before detail work

**Decisions made:**
None (architecture questions captured, not decided)

**Next up:**
1. Broad vision audit — space architecture before more detail work
2. Doron: publish Base44, update agentScopedQuery, walkthrough Meal Prep
3. Gold Standard polish pass + flip construction gate
4. Phase 2 planning (meal planner, shopping lists)

---

### Session Log — 2026-04-02 (Mega Session)
**Focus:** Semantic Tailwind migration, Fallout CRT, CommandBar wiring, panel layout, render pipeline, query optimization, Living Map spec, Base44 credit research

**Shipped:**
1. Semantic Tailwind migration (a0e4710) — 208 files, ~10,700 literal color classes replaced with semantic tokens (bg-card, text-foreground, etc.). 3 new tokens: foreground-soft, surface, primary-hover. 146-line !important override block fully removed. Cloud and Fallout theme blocks restructured into clean single-selector variable definitions.
2. Fallout CRT effects (d28b356) — phosphor glow text-shadow, scanlines via body::after, vignette radial gradient, subtle flicker animation. All CSS-only.
3. CommandBar render wiring (7b83f4e) — Fixed critical overwrite bug: RENDER_DATA was being immediately overwritten by text portion. Panel close/minimize button. CRT sync bar (body::before, 40-second periodic sweep).
4. Panel layout architecture (70d6912) — Mylane panel now position:absolute within position:relative body. Two independent scroll contexts. Spinner measures container via ResizeObserver, no hardcoded offsets. Panel state persists in localStorage.
5. CommandBar polish (59eb0d5) — Input themed with semantic tokens, 44px click target, loading indicator (pulsing amber dots), spinner trackpad fix (wheelActiveRef), staleTime 5min on all card queries, 10min on auth.
6. LIVING-MAP-SPEC.md written with deep research (gaming fog-of-war, ego-centric cartography, cooperative game design, Niantic spatial) and placed in private repo with Hyphae builder notes.
7. Base44 credit system fully documented via support ticket. Entity queries free. Agent messages ~3 credits. Direct Anthropic API calls via backend functions = zero credits.

**Decisions made:**
- DEC-132 updated: migration complete, maintain semantic tokens for all new code
- DEC-133: Mylane Intelligence Tiers (client-side free / server function free / LLM $18 tier)

**Next up:**
- Coach Rick demo Friday 5:00 PM (verify render pipeline, theme toggling, panel behavior on iPhone)
- Base44 rate limit numbers (support ticket escalated, awaiting human team response)
- Mylane agent instruction refresh if RENDER_DATA still not rendering through CommandBar
- Living Map stays in seedling phase — Hyphae builder notes captured

---

### Session Log — 2026-04-02/03 (Mega Session — Two Days, 12 Commits)
**Focus:** Semantic migration, Fallout CRT, CommandBar wiring, panel layout, 3D spinner with variant architecture, spring physics built → tested → removed in favor of friction model, Living Map spec, Base44 credit research, MOJO competitor analysis, landing page mockup

**Shipped (12 commits):**
1. Semantic Tailwind migration (a0e4710) — 208 files, ~10,700 literal classes → semantic tokens. 3 new tokens: foreground-soft, surface, primary-hover. 146-line !important block removed. Cloud/Fallout theme blocks restructured.
2. Fallout CRT effects (d28b356) — phosphor glow, scanlines (body::after), vignette, flicker animation. CSS-only.
3. CommandBar render wiring (7b83f4e) — Fixed RENDER_DATA overwrite bug. Panel close/minimize. CRT sync bar (body::before, 40s periodic sweep).
4. Panel layout (70d6912) — Mylane panel position:absolute within relative body. Two independent scroll contexts. Spinner measures container via ResizeObserver, no hardcoded offsets. Panel state in localStorage.
5. CommandBar polish (59eb0d5) — Input themed with semantic tokens, 44px click target, loading dots, trackpad fix (wheelActiveRef), staleTime 5min on card queries, 10min on auth.
6. 3D SpaceSpinner (e044eef) — Drum (Fallout) + cover flow (Gold Standard/Cloud) variant architecture. Render function strategy pattern. Theme detection via MutationObserver. prefers-reduced-motion flat fallback.
7. Per-theme spring physics (0d9abac) — JS spring with velocity inheritance. Later replaced.
8. Dev Lab space (d30df1c) — Admin-only spinner space with physics tuning panel. Reactive THEME_PHYSICS via module-level mutable object.
9. Tuner relocation (54c1739) — Physics tuner moved below spinner (outside Dev Lab space). Flask toggle, visible on any space.
10. Ratchet dial (a45946d) — Zero animation on slow-drag release. Live-snap during drag. Two modes: ratchet (slow) vs momentum (fast).
11. Friction model (96ef772) — Spring equation removed entirely. Replaced with mass + friction deceleration. No bounce, no oscillation. -103 lines net.
12. Final polish (0543a15) — iOS Safari audio fix (touchstart + silent buffer unlock). Friction step-through fires handleSelect on each boundary crossing for per-space visual ticks. Gain bumped, triangle wave for weightier click.

**Specs created:**
- LIVING-MAP-SPEC.md (private repo) — Ego-centric vitality-weighted spatial interface. Fog-of-war mechanics. Hyphae builder notes on performance risks, Leaflet gaps, companion mode challenges.

**Research conducted:**
- Living Map: fog-of-war gaming, ego-centric cartography, Niantic spatial, cooperative game design
- UI physics: iOS scroll internals, Framer Motion/SwiftUI spring defaults, friction vs spring for navigation
- MOJO Sports competitor: official NFL FLAG partner, acquired by TeamSnap. 1,400+ activities, 5 sports. Scheduling, chat, drill videos, player cards.
- Base44 credits: entity queries free, agent ~3 credits, direct Anthropic API = zero credits

**Seeds planted:**
- Landing page scroll story: "Want to play a game? The game of within." Mockup built.
- Ephraim's Game Lab: HTML games, async multiplayer, IINE mini controller as Pip-Boy input
- Church network need: internal communication + cross-church coordination
- Elderly/Garden theme: simple, large text, high contrast
- Frequency Station playlist: auto-advance, shuffle, queue
- Themes as subdomains (fallout.locallane.app, garden.locallane.app)

**Decisions made:**
- DEC-132 updated: migration complete, maintain semantic tokens for all new code
- DEC-133: Mylane Intelligence Tiers (Tier 1 client / Tier 2 server / Tier 3 LLM)
- DEC-134: Spinner physics = friction + mass, NOT spring + damping
- DEC-135: Themes as game modes — physics, variants, interaction patterns per theme

**Key technical learnings:**
- iOS AudioContext needs touchstart (not just pointerdown), silent buffer, resume() on every tick
- Spring physics are wrong for navigation dials — "trying to critically-damp a spring to prevent oscillation is fighting the math"
- CSS bezier cannot produce multiple oscillations or velocity inheritance
- Two CSS variable systems coexist: shadcn HSL + --ll-* hex (latter being phased out)

**Next up:**
- Coach Rick demo today 5:00 PM — publish Base44, test on iPhone
- Playmaker walkthrough with Doron
- Landing page scroll story polish
- Frequency Station playlist feature
- Mylane agent instruction refresh for ephemeral RENDER_DATA
- Base44 rate limit numbers (support ticket open)

---

## Session — 2026-04-03 (All Day — Team Space Production Push)

**Focus:** Team space from 85% to production-ready. 15 commits, 7+ builds, credit audit, seedling spec, live testing with parent account.

**Build 1: Print + Learning Loop** (commit 4697add)
- PrintPlaybook field refs fixed: image_url to diagram_image (3x), notes to coach_notes (2x)
- PlayCreateModal editDataReady fix — plays with zero assignments no longer hang
- Route Reference Sheet — 4th print layout with 25 mini SVG route diagrams from routeTemplates
- Leaderboard enhanced — plays_mastered + best_streak columns, top 3 highlighted
- Player Cards — trading card component with earned stats, opens from Roster tap

**Build 2: TeamPhotos Gallery** (commit e6747f6)
- New Photos tab (7th tab between Messages and Settings)
- Upload via UploadFile, lightbox with caption/uploader/date, delete own photos
- TeamPhoto entity created in Base44 (7 fields, proper permissions)
- agentScopedQuery + PlaymakerAgent updated for TeamPhoto access
- PlayerReadinessCard shows photo count

**Build 3: Identity + Props + UX Fixes** (commit eb129dd)
- Parent name capture from auth provider display_name
- Messages + Schedule getProps fix (root cause of both tabs rendering null)
- Quick Reference print — condensed assignments below each play diagram
- League Link rename (was Door Link)
- Pending badge updated to respect parent connections

**Build 4: Schedule Phase 2** (commit 0d472b7)
- Full event creation with duties (snack/water/setup/cleanup) and auto-rotation
- RSVP (yes/no/maybe) with attendance counts
- Recurring events (weekly/biweekly batch creation)
- Team Readiness view on game events (player mastery of game-day plays)
- Event type buttons, duration presets, grouped form sections

**Build 5: Credit Audit + Seedling Review** (private + Spec-Repo)
- Entity reads confirmed FREE (not integration credits) per Base44 support
- PRICING-ECONOMICS.md corrected: league projection 23,550 to ~1,460 credits/mo
- DEC-130 urgency revised URGENT to MEDIUM
- League & Play Library seedling review notes integrated

**Build 6: Regression Audit** (investigation only)
- No regressions found — all issues were role-based rendering (parent vs coach)
- One real bug: parent join didn't write parent_user_ids to player records

**Build 7: Pending Fix + Parent UX + Event Polish** (commit 56c5963)
- Bidirectional parent-player link fix
- Schedule role-aware empty state for parents
- Messages defaults parents to Discussion channel
- Event form polish: type buttons with icons, duration dropdown presets, day-of-week selectors

**Bug Fix Wave** (commits 500c1a8, 0c521d4, 481eae5, edd28ff, 59d8c3d, 355332f, d9439bb, 1cd81c5)
- Messages tab crash: isCoach used before declaration (temporal dead zone)
- TeamPhoto query safety guards (try/catch for entity not yet in SDK)
- Recurring event count auto-calculated from dates (removed manual input)
- Date off-by-one timezone fix (UTC midnight rollback, append T12:00:00)
- Location links to Google Maps on tap
- JoinTeam member fetch: .list() to avoid .filter() quirk with service-role records
- Invite page: removed public header/footer, name input for parents, messages show linked kids
- PlayAssignment batch fetch: single .list() instead of N parallel .filter() calls (429 fix)

**Base44 Operations:**
- All team entity permissions fixed
- TeamPhoto entity created (7 fields)
- TeamEvent fields added (rsvps, duties)

**Research & Strategy:**
- Credit economics confirmed: entity reads free, own API key = zero credits
- Base44 rate limits received: analytics 50/min, list users 50/min, get user 75/min
- League & Play Library seedling planted in private repo

**Decisions:**
- DEC-130 UPDATE: entity reads free, urgency MEDIUM (performance/429s, not credits)
- League Link: renamed from Door Link, future rethink needed for league discovery page
- Parent UX: default to Discussion channel, role-aware empty states, name capture in join flow

**Next up:**
- Test invite flow end-to-end with Coach Rick's phone
- League Link rethink — league discovery page instead of team join
- Play Library seedling matures at 3+ teams
- DEC-130 query optimization for performance/429s before Randy league rollout

---

### Session — 2026-04-04 (Saturday — Full Day)

**Focus:** MylaneNote reminders, Founding Gardener observation tools, feedback pipeline consolidation, full 13-category application audit, security lockdown, medium/low polish pass. Health score 68 to 87.

**Build 1: MylaneNote — Persistent Reminders**
- MylaneNote entity created in Base44 (7 fields: user_id, content, note_type, due_date, source_space, status, created_by_agent)
- MyLane agent instructions updated with recognition patterns for reminders/tasks/notes
- agentScopedWrite + agentScopedQuery whitelists updated for MylaneNote (platform entity, user_id scoped)
- RemindersCard in Mylane Home feed, "My reminders" quick-action chip
- Full lifecycle: create via conversation, display in feed, mark done via conversation

**Build 2: Founding Gardener Observation**
- platformPulse `gardeners` action: queries 15 entity types per user, returns engagement scores
- Weighted score: spaces (10), feedback (5), weeks active (3), content (2), participation (1)
- MCP worker redeployed with gardeners enum
- First report: 22 users, 6 active. Doron (52), Bari (13), Gary Spetzler (13), Natasha (13, pure organic signup), Jeslyn Everitt (4), Coach Rick (4). 16 dormant accounts.

**Build 3: Feedback Pipeline Consolidation**
- Two parallel systems found (FeedbackLog + ServiceFeedback). Merged to ServiceFeedback only.
- Floating Feedback button removed (~120 lines). "Have feedback?" chip on all 8 space positions.
- Bug fix: agentScopedWrite ServiceFeedback required field was 'message' not 'feedback_text' (writes silently failing)

**Build 4: Full 13-Category Application Audit**
- 343 files scanned. Score: 68/100 — 6 Critical, 14 High, 22 Medium, 19 Low
- Critical: FSClient/FSDocument/FSEstimate public read exposing PII and portal tokens, handleEventCancellation zero auth, dual auth state, no default staleTime
- Strengths: architecture sound, semantic migration 98.5%, Dark Until Explored properly implemented

**Build 5: Critical + High Fixes (3 commits)**
- Base44: 9 entity permissions locked to Creator Only (FS entities, Team entities, NetworkApplication)
- staleTime 5min default (40-60% API call reduction)
- Dual auth resolved: AuthContext seeds RQ cache, refreshUser() syncs both
- handleEventCancellation + agentScopedWrite ownership check + sendWebhookToSpoke auth added
- 403 direct entity tool_configs removed from 5 agents (DEC-107 enforced)
- Play required fields, MyLane instruction field names, meal-prep in agentScopedQuery
- Dead-end routes fixed, League Link rename, WorkspaceErrorBoundary, CLAUDE.md updated
- Score: 68 to 82

**Build 6: Medium + Low Polish (4 commits)**
- 19 dead files deleted (15 components + 4 hooks), -1,968 net lines
- platformPulse header-only auth, /networks auth-gated (DEC-117)
- Phantom FS attention item removed, Discover shows all workspace types
- 27 redundant staleTime overrides removed, 31 unused imports cleaned
- Agent cross-workspace references trimmed, MyLane meal-prep awareness added
- Score: 82 to 87

**Base44 Operations:** MylaneNote entity created. 9 entity permissions locked down.

**MCP Operations:** Cloudflare Worker redeployed with gardeners action.

**Decisions:**
- MylaneNote is a platform entity scoped by user_id (crosses all spaces)
- Feedback flows through companion, not standalone buttons
- Founding Gardener is earned status (not signup bonus), assigned by Doron
- Entity permissions default to Creator Only; server functions handle cross-user access
- DEC-107 fully enforced: direct entity tools removed from all space agents

**Next up:**
- Coach Rick demo (foundation is stone)
- Ephraim Pip-Boy design session
- Newsletter "The Good News" to wake dormant accounts
- Bari visit for feedback chip demo
- Remaining polish: StepIndicator extraction, loading states, shared EmptyState, accessibility pass

---

### Session — 2026-04-05 (Sunday — MyLane Reminder Loop Bug Fix)

**Focus:** Field-tested MylaneNote reminder loop. Found it broken. Diagnosed to root cause, shipped server-side fix, updated MyLane instructions, healed bad record, confirmed read path end-to-end. Write path pending Base44 publish.

**Bug diagnosis:**
- Symptom: "My reminders" chip and RemindersCard showed nothing despite a MylaneNote record existing
- Mycelia investigated: record `69d2ccd8ae352f9e7ce36ded` had `data.user_id: "special-user"` (literal string)
- `created_by_id` on the record = Doron's real ID (Base44 auto-populated from auth)
- Client query filters by `data.user_id === currentUser.id` — mismatch, record invisible
- Root cause: MyLane agent instructions said "pass the authenticated user's ID from your context" and the LLM interpreted it as a placeholder token, writing the literal string

**Server-side fix (1 commit):**
- `agentScopedWrite` now unconditionally overwrites `user_id` and `owner_id` on writes where those are FK fields
- Removed the `writeData[fk] == null` guard that let agent-provided values through
- Affected entities: ServiceFeedback, Recommendation, MylaneNote, plus blanket `workspace === 'platform'` catch-all
- Verified: no `owner_id` entities in the FK whitelist today, so `owner_id` branch is defensive only
- Commit: `fix(agent-write): server-authoritative user_id on per-user entity writes`

**MyLane instruction updates (Base44 Builder):**
- Removed `user_id` from MylaneNote write payload instructions
- Added query-vs-write asymmetry paragraph (queries need user_id for scoping, writes forbid it)
- Updated Write Capability section to explicitly forbid passing user_id

**Data cleanup:**
- Mycelia healed record `69d2ccd8ae352f9e7ce36ded`: `data.user_id` updated from `"special-user"` to `"69308d4dd5ee90afc9b011d4"`
- Content: "Text Kate from LinkedIn" (due_date: 2026-04-19 — date parsing bug, see below)
- RemindersCard confirmed rendering the healed record on Home feed

**Decisions:** DEC-139 (server-authoritative identity on agent writes)

**Known issues for next session:**
1. Date parsing bug: MyLane parsed "tomorrow" as 2026-04-19 instead of 2026-04-06. Likely stale date awareness or arithmetic error.
2. MCP user_id fallback path is weaker than auth.me() — known from audit, not introduced by this fix
3. Broader user_id flow audit — today's cascade suggests more ambiguous identity paths may exist

**Pending (blocked on Base44 publish):**
- Server fix deployed to Base44 runtime
- MyLane instruction updates deployed
- End-to-end write-path verification (create → display → complete lifecycle)

---

### Session — 2026-04-10 (Thursday — Playmaker Visibility Resolution + Platform Thesis)

**Focus:** Two-day Playmaker visibility bug resolved end-to-end. Coach Rick confirmed from his own phone: "Hi looks like - I have everything!" Platform thesis work emerged in parallel.

**The bug — root cause (four layers deep):**

The symptom: each user in a team space saw only the records they personally created. Doron saw 12 roster, 12 plays, 0 schedule. Coach Rick saw 0 roster, 4 plays, 17 schedule. Same team, different data.

The diagnosis identified Creator Only RLS on all team-scoped entities as the cause. The fix architecture: a generic `readTeamData` server function that verifies team membership, then reads data via `asServiceRole` to bypass RLS. Spec written, validated by Base44 platform team, implementation shipped.

But the fix didn't work. Four layers of issues stacked:

1. **Entity permissions:** `asServiceRole` does not reliably bypass Creator Only RLS in SDK 0.8.23, despite documentation saying it should (confirmed by Base44 support). Fix: change Read permissions on all 8 team entities from Creator Only to Authenticated Users. The security membrane moves from entity level to server function level. (DEC-140)
2. **Client-side crash guards:** Components used `[...data]` spread and `.filter()` on query results without `Array.isArray` checks. When the server function returned errors, the data became non-array values, crashing the component tree. Fix: defensive `Array.isArray` guards on every external data spread/filter in team components.
3. **Axios response wrapper:** `base44.functions.invoke()` returns an Axios response wrapper `{data, status, headers, config}`, not the parsed JSON body. `fetchTeamData` was extracting `result.data` (the Axios data field = the JSON body) when it needed `result.data.data` (the JSON body's data field = the actual array).
4. **The one-line fix:** `result.data` → `result.data.data` in `fetchTeamData`.

**Process lesson:** Layers 1-2 were found by reasoning from code. Layer 3 was found by a single `console.log` of the actual runtime value. When diagnosing unknown SDK behavior, a one-line log of the actual shape is faster than four theories from code alone. (DEC-141)

**What shipped:**
- `readTeamData` server function (generic team-scoped read primitive with membership verification)
- `useTeamEntity` hook + `fetchTeamData` utility (client-side guardrail for all team reads)
- 8 entity Read permissions relaxed to Authenticated Users (TeamMember, Play, TeamEvent, TeamMessage, TeamPhoto, PlayerStats, QuizAttempt, PlayAssignment)
- 32 read sites migrated across 14 files
- Defensive `Array.isArray` guards on all external data spreads/filters in team components
- CLAUDE.md updated with Axios wrapper pattern and readTeamData documentation
- TEAM-VISIBILITY-ARCHITECTURE.md spec in private repo

**Decisions:** DEC-140 (readTeamData as security boundary), DEC-141 (runtime logging before theorizing)

**Confirmed working:** Coach Rick, logged in on his own phone, sees full roster, playbook, and schedule. Doron sees the same data. The membrane holds.

---

### 2026-04-10 (evening) — Frequency Station Build 1 + Build 2 + Field Audit Debug Chain

**Focus:** Frequency Station goes from "audio player on a page" to "Pip-Boy radio with a studio and library." Two builds, a long debug chain, and the first real song transformation.

**Build 1 — Pip-Boy Radio Model (DEC-142):**
- FrequencyProvider lifted from MyLane.jsx to App.jsx root — audio survives all navigation
- Consolidated to single `<audio playsInline>` element; page components are pure UI reading from `useFrequency()`
- MediaSession API wired: lock-screen controls (play/pause/skip/seekto) on iOS Safari and Android Chrome
- Persistent mini-player bar at bottom of every screen (title, artist, play/pause, skip, progress)
- localStorage persistence: current song, position (debounced 3s), master toggle
- iPhone testing confirmed: background playback works with screen off

**Build 2 — Studio & Library (DEC-143):**
- SubmitWizard: 3-step form (words → sound → details) with dynamic FrequencyMood entity, style_genre, vocal_style, tempo_feel, reference_artist
- AdminWorkbench: Suno copy-paste boxes (Lyrics + Styles) assembled from submission fields, "Deliver to submitter" creates owned song + FrequencyNotification
- MyLibrary tab: personal song library with public/private toggle, FrequencyArtist CRUD, song upload
- NotificationBell: unread count badge + dropdown, client-side user_id filter
- Ownership model: owner_user_id + is_public on FrequencySong. Listen tab filters is_public. Library shows owned songs.
- New entities: FrequencyArtist, FrequencyMood, FrequencyNotification

**Debug chain (the real story of the evening):**
1. ListenTab infinite render loop — `useEffect` depended on `freq` (whole context object); every `setPlaylist` call created new ref → infinite loop. Fix: stable function ref + memoized song-ID fingerprint.
2. Wizard Enter-key form submission — pressing Enter in text inputs triggered native form submit, bypassing step 3. Fix: `handleSubmit` checks step and advances instead of submitting on non-final steps.
3. Base44 entity duplicate cleanup — unprefixed `FrequencySubmission` deleted (was duplicate of `FSFrequencySubmission`). New fields added to FSFrequencySubmission.
4. RLS permission audit — `FSFrequencySubmission.Read` was `owner` (RLS: created_by == user.email). Admin workbench couldn't see other users' submissions. `FrequencyNotification.Read` had same problem. Both loosened to `authenticated`. `FSFrequencySubmission.Update` also loosened.
5. Field name audit — Hyphae frontend audit vs Base44 schema revealed: FrequencyArtist uses `owner_user_id` not `user_id`; FrequencyNotification uses `body` not `message`; DeliveryForm owner chain had `created_by` (email) before `user_id` (ID). All fixed.

**Key lessons:**
- Base44 agent defaults to discussion mode — action mode only for entity/permission/server-function work. Prevents drift. Extends DEC-093.
- Schema-reality audits (Base44 discussion mode + Hyphae frontend audit) are a repeatable pattern when debugging spirals. The join between what the backend actually has and what the frontend writes is where bugs hide.
- RLS on cross-user entities blocks core workflows. Client-side scoping is the pragmatic choice when the alternative is "the feature doesn't work." Tighten later with server functions.

**First real song transformed:** "Grow, Little Seedlings" by The OG (dedication: Egan, Elek, Ephraim). Seed → Suno boxes → audio → delivered to library → played on lock screen.

**Decisions:** DEC-142 (Pip-Boy radio), DEC-143 (Studio + Library), DEC-144 (RLS loosening + client-side scoping)

**What shipped (code):**
- FrequencyContext.jsx rewritten (MediaSession, playsinline, localStorage persistence, lock-screen metadata fix)
- FrequencyMiniPlayer.jsx (new component)
- SubmitWizard.jsx, AdminWorkbench.jsx, MyLibrary.jsx, NotificationBell.jsx (new components)
- FrequencyStation.jsx updated (new tab wiring, ListenTab is_public filter, playlist fingerprint)
- SongDetail.jsx updated (pure UI, no local audio)
- MyLane.jsx updated (FrequencyProvider removed, lives in App.jsx now)
- App.jsx updated (FrequencyProvider + mini-player at root)

---

### 2026-04-11 — Frequency Station Polish A + B1 + B1.5 + B2 + Debug Chain

**Focus:** Five-prompt build day. Lock-screen fix, dead code removal, wizard collapse, bulk upload, three-section library, and a long payload-debugging chain that surfaced the difference between React bugs and schema bugs.

**Prompt A — Polish (5 fixes):**
- Lock-screen stale title: `onPlay` handler's closure captured previous song's metadata, overwrote correct metadata set by `setSongInternal`. Fix: removed redundant `updateMediaSession` from `onPlay`.
- Notification bell: reviewed fully, no remaining bug — the `message→body` field fix from last night resolved it.
- Duplicate song on delivery: added ref-based sync guard (`deliveringRef`) to prevent double-click double-invocation.
- Dead code removal: deleted old SubmitTab, SongCreationForm, QueueTab (515 lines). EditSeedForm and MySeedsTab kept.
- DeliveryForm now writes `mood_tag` and `artist_id` on delivered songs.

**Prompt B1 — Wizard collapse + tab restructure + station default:**
- Wizard collapsed from 3-step to single scrollable page. All fields visible at once. Two buttons: Save as Draft + Plant this seed.
- Tabs reordered: My Library > Explore > Submit > My Submissions > Workbench. Listen→Explore, My Seeds→My Submissions.
- Default-active tab: My Library if user owns songs, Explore otherwise.
- Per-user station default: `freq_playing_${userId}` localStorage key with legacy migration.
- Mood/FrequencyMood dropdown removed from wizard (admin sets during transformation if needed).

**Prompt B1.5 — Bulk upload:**
- BulkUploadModal: multi-file select, title parsed from filename (simple: strip extension, underscores→spaces, user reviews inline).
- jsmediatags attempted for ID3 cover art extraction — failed in Base44 deployment (broken package.json main field). Removed entirely. Songs upload without covers.
- 17 of Doron's Suno back catalog imported into My Library.

**Prompt B2 — Three-section library + favorites + queue:**
- MyLibrary restructured: My Songs / My Favorites / My Queue.
- SongRow shared component: one-line expandable, used everywhere (My Songs, Favorites, Queue, Explore).
- `useFrequencyFavorites` hook: FSFrequencyFavorite CRUD, `favoriteIds` Set, `toggleFavorite`.
- `useFrequencyQueue` hook: FSFrequencyPlaylist (title='queue'), `addToQueue`, `removeFromQueue`, `reorderQueue`, `clearQueue`.
- Dedupe rule: owned+favorited songs show in My Songs with filled heart, not duplicated in Favorites.

**Debug chain (the long one):**
1. SongRow `useNavigate` ReferenceError — imported but not defined. Removed dead reference.
2. Favorites/queue not working from My Library — diagnosed as "stale closure" → added refs → didn't fix it.
3. Actually: two hook instances (parent + child) racing on concurrent Base44 creates → ERR_CONNECTION_CLOSED. Fix: single-owner pattern — hooks in parent only, props to children.
4. Actually actually: FSFrequencyPlaylist.create 422 — `track_ids: '[]'` (string) instead of `track_ids: []` (array). Schema says array of string. Fix: send real arrays.
5. FSFrequencyFavorite.create — `user_id` not wrapped in `String()`, potential type mismatch. Fix: all fields explicitly `String()` wrapped with defensive defaults.

**Key lesson — payload first, architecture second (DEC-145):**
When a Base44 entity operation fails, the first step is logging the exact payload and comparing field-by-field against the schema. The bug is almost always wrong JS type, wrong field name, or null where string expected. Do not theorize about React state, closures, or component lifecycle until the payload is confirmed correct. Two bugs today (queue string-not-array, favorites type coercion) would have been caught in seconds by payload inspection. The closure refactoring was defensive hardening, not the fix.

**Decisions:** DEC-145 (payload-first debugging + single-owner hooks + FrequencyLibraryContext planned)

**What shipped (code):**
- FrequencyContext.jsx: lock-screen metadata fix, per-user localStorage key
- FrequencyStation.jsx: tab rename/reorder, default-active logic, single-owner hooks, ListenTab→SongRow, MySeedsTab one-line rows, 515 lines dead code removed
- SubmitWizard.jsx: single-page form with draft/submit
- MyLibrary.jsx: three sections, props-based favorites/queue
- SongRow.jsx: shared one-line expandable row component
- BulkUploadModal.jsx: multi-file upload with filename parsing
- AdminWorkbench.jsx: delivery ref guard, mood_tag/artist_id writes, draft exclusion
- useFrequencyFavorites.js: ref-based callbacks, String() defensive defaults
- useFrequencyQueue.js: ref-based callbacks, array (not string) track_ids

---

## 2026-04-15 — Mylane Containment + Living Feet Principle

### What shipped

**Foundation fixes (early in day):**
- Viewport pinch-to-fit: CommandBar input fontSize 13 → 16, iOS auto-zoom resolved
- Mylane agent gated to MYLANE_AGENT_ALLOWLIST (R&D, doron.bsg@gmail.com only) — 4 UI surfaces hidden for non-allowlisted users

**Mylane Containment Audit:**
- Full audit at `audit-reports/MYLANE-CONTAINMENT-AUDIT-2026-04-15.md`
- 29 routes mapped, 6 escape points, 10 orphans
- Structural root: Layout wrapper and Mylane shell are parallel, not nested
- Approved approach: overlay expansion (DEC-148)

**Session A — Closed 4 escape points:**
- BusinessCard → BusinessProfile stacked overlay (z-50 over z-40, Escape unwinds)
- FrequencyMiniPlayer → custom event opens shell Frequency overlay (with fallback for non-shell pages)
- Events overlay → removed redundant navigate() calls, deep-link route still works
- Newsletter → inline form in Account overlay

**Session B — Refactor + orphans + polish + deletions:**
- 13 hardcoded overlay strings refactored to OV constant (Living Feet proof)
- Philosophy and Support overlays added (Account → About section)
- Recommend stacked overlay (z-60 over BusinessProfile z-50, mode-parameterized)
- Backdrop click-to-close on all 6 OverlayContainer instances
- Deleted: SpokeDetails (574 lines), ShapingTheGarden (50 lines), CategoryPage (185 lines), Search + components/search/ directory (~360 lines)
- ClaimBusiness deferred to future cleanup session (BusinessEditDrawer reference, co-presence model deletion)
- JoyCoinsHistory left parked (Recess feature, surfaces when Recess ships)

**Session C — Networks containment:**
- NetworkPage stacked overlay at z-55 (between BusinessProfile z-50 and Recommend z-60)
- BusinessCard and BusinessProfile network chips now fire `onNetworkClick` callback when inside shell
- Mirrors BusinessProfile containment pattern exactly (Living Feet — instantiate, don't invent)
- All 6 known escapes from audit are now closed

### Decisions made

- DEC-146: Living Feet Design Principle (constitutional)
- DEC-147: R&D Allowlist Pattern for Pre-Release Features
- DEC-148: Mylane Shell Containment via Overlay Expansion

### Known accepted escapes (documented in STATUS-TRACKER)

- Onboarding wizards (one-time flows, stepping aside is natural UX)
- Terms/Privacy in new tabs (industry standard, deep-linkable for compliance)
- Admin standalone (admin-only, complex, single user — future reframe: per-space admin toggle)
- Networks index `/networks` (not reachable from inside shell)
- Log out (auth requirement)

### Known technical debt

- Overlay z-indices are hardcoded (z-50/55/60). Refactor to stack-based assignment when third stacked-from-overlay scenario appears.

### What's next

- Walkthrough Sessions A/B/C in the live app — Doron to find UX issues Hyphae can't see
- ClaimBusiness deletion + BusinessEditDrawer cleanup (co-presence model session)
- Footer removal or strip (Philosophy/Support/Newsletter now inside shell)
- Admin containment reframe (per-space admin toggle, not monolithic Admin panel)
- Mylane reminders root cause investigation (deferred from earlier)
- Audio mini-player / Mylane input stacking (small fix, only matters for Doron now)

---

## 2026-04-16 — Mylane Agent Architecture + Shell Polish

### What shipped

**Overlay containment fix:**
- useBottomInset hook (single source of truth for bottom UI stack)
- Exported constants: HEADER_HEIGHT (45), MINI_PLAYER_HEIGHT (54), COMMAND_BAR_HEIGHT (54)
- All 9 overlays fixed at container level (top/bottom/sides/scroll containment)

**Mylane Agent v2 (DEC-149):**
- Full instruction rewrite deployed to Base44 (soul seed, mandatory 4-step protocol, failure logging, growth protocol)
- 26 entity tools removed, 2 backend functions remain (agentScopedQuery + agentScopedWrite)
- Agent hallucination FIXED — tested and verified: reminder write succeeds, record confirmed in database
- Smart routing (DEC-150): "show me" queries emit TYPE 1 RENDER (real components) not TYPE 2 (data dumps)

**Shell polish:**
- RemindersCard read path fixed (Creator Only RLS bypass via agentScopedQuery, staleTime 30s)
- CommandBar pinned to viewport bottom (position: fixed, dynamic offset via useBottomInset)
- Hidden fields filter (33 fields) in renderEntityView.jsx for TYPE 2 renders
- DrillView tab routing fix (view parameter wired through 3-layer render chain)
- Agent loading state fix (clear on RENDER tag parse, not on text completion)

**Design work:**
- Home Canvas spec designed with mockups (TYPE 4 RENDER_CANVAS)
- Hyphae review saved weeks: no component accepts raw data as props, all self-fetch
- Recommendation: don't build TYPE 4, use smart TYPE 1 routing instead (DEC-150)
- Spec shelved — existing architecture handles it with smarter routing (DEC-151)

### Decisions made

- DEC-149: Mylane Agent v2 — mandatory classify/execute/verify/respond protocol
- DEC-150: Smart Routing — TYPE 1 for workspace views, TYPE 2 only for novel queries
- DEC-151: Spec Review Protocol — always get Hyphae's codebase review before architecting

### What's next

- Walkthrough of today's fixes (verify tab routing, reminders display, loading state)
- CLAUDE.md compression pass (Vercel pattern — passive context, dense index)
- Agent Soul Seed Protocol (shared template for all space agents)
- Mylane action tiles Phase 1 (reminders as proof of concept)
- Space agent attention signals (when 3+ spaces have real signals)
- ClaimBusiness deletion + co-presence model session
- Footer removal/strip
- Admin per-space reframe

---

## 2026-04-17 — Cockpit Library (spinner + compass)

### What shipped

**Cockpit library architecture:**
- `ll_cockpit` localStorage preference with `data-cockpit` DOM attribute, mirroring the theme plumbing (localStorage + attribute + MutationObserver). Pre-paint in main.jsx prevents FOUC.
- `resolveVariant()` inside SpaceSpinner decouples variant selection from theme. The old `THEME_VARIANT = { dark: 'coverFlow', light: 'coverFlow', fallout: 'drum' }` is wrapped inside the spinner cockpit branch — existing users see zero behavioral change.
- `useCockpit()` hook mirrors the existing `useTheme()` DIY hook in SpaceSpinner (same MutationObserver pattern, different attribute).
- No React provider, no context, no server-persisted preference. Matches codebase convention.

**Compass variant (fourth entry in VARIANT_MAP):**
- Chrome row (22px): `BEARING` affordance label left, live degrees right, empty center.
- Dial strip (54px): horizontal track, stations at ITEM_WIDTH rhythm, 1px needle with solid triangular arrow heads, gradient fade to 40% opacity through the active word.
- Orientation arc (36px): shallow SVG arc with compressed dots (max 5), active dot scaled/colored, labels below (start / "here" / edge).
- Active station lights up in place: `hsl(var(--primary))` name at 11px weight 500, `hsl(var(--primary) / 0.75)` bearing at 8px. Inactive stations muted with distance-opacity fade.
- `COMPASS_BEARINGS` soft convention (home=0°, east for active work, NW/W for inward/community) with `getBearing()` fallback for unregistered spaces.
- Fallout-theme handling: green-phosphor accent threads through via existing theme tokens, monospace font added via single CSS rule scoped to `[data-theme="fallout"] [data-cockpit="compass"]`.

**Picker UI:**
- Two-state cycle button in AccountOverlay, mirroring the theme cycle button pattern. Same row structure, same hover treatment, same label + sublabel.
- Available to all users. No "New!" badge, no onboarding nudge — Dark Until Discovered.

**Polish arc (three commits):**
- v1 (c44bb21): library + compass + picker shipped.
- v2 (b4d187e): removed redundant readouts — hid active station from strip, removed global dot indicator row under compass. Overcorrected — needle pointed at empty space.
- v3 (ad04eb1): restored active station in place with accent-color treatment, simplified chrome row to affordance-only. Identity lives where the eye lives.

### Decisions made

- DEC-152: Cockpit Library Pattern
- DEC-153: Color-in-Place Over Out-of-Band Readout
- DEC-154: Iterate on the Live Surface

### Tensions noted

- DevLab physics sliders do not affect compass behavior (compass uses CSS transitions, not the friction loop). Harmless; low-priority cleanup would gate DevLab visually by cockpit.
- `BEARING` label in chrome row may be slightly over-weighted relative to degrees readout after active name moved back to strip. Soft polish flag for field test.
- Arc active-dot is still scaled + colored. Not currently redundant (strip = micro, arc = macro position), but worth watching.
- Needle arrow treatment in Fallout may want a green-phosphor adjustment after field test.

### What's next

Changing focus — Doron directing next work. Cockpit library paused in a shipped, field-testable state. Follow-up polish happens only when field testing surfaces specific needs.

---

## Session Log — 2026-04-23 (Mycelia tree anchored)

**Focus:** Close the three-day architecture arc (v4 → v4.1), ship Phase 1 schema foundation, ship Phase 2 production migration. Mycelia, LLC now exists as a real Business record with LocalLane, TCA, and reparented Recess as children. Bari's Red Umbrella promoted from his FS profile. Doron's test sandbox archived. Dan preserved as unclaimed orphan.

### Architecture arc closure

The three-day v4 → v4.1 conversation finalized during today's prep. Scoped-peer beat nested-containers (DEC-156) for tool architecture — tools remain top-level entities with a `business_id` filter, which is cheaper to build and produces the same UX. Per-entity $9 pricing with LocalLane exemption (DEC-155) supersedes the old DEC-115 model in full. Networks unified into one architecture with three configurable axes (cost/access/discovery mode — DEC-157). Users became first-class entities with optional public pages (DEC-158). DEC-117 (Dark Until Explored) preserved — the architecture doesn't touch user-visible flow. Settings stays in avatar. Tool rename ("Field Service" → "Desk", DEC-160) communicated in person to Bari and Dan; no in-app notice at current user scale.

### Phase 1 — Schema Foundation shipped (2026-04-22)

Base44 prompt at `community-node/base44-prompts/PHASE-1-SCHEMA-FOUNDATION.md` applied cleanly. Added 12 fields to Business (10 new + 2 archive), 6 fields to User, `business_id` to all 10 FS entities, archive fields to FieldServiceProfile, created new `AuditLog` entity (entity_type/entity_id/action/old_value/new_value/user_id/source/timestamp, admin-only Read). Canonical migration pattern at `src/scripts/migrations/TEMPLATE.js` (idempotent, dry-run-first, audit-logged). Committed `cfdcdb9` — Base44 auto-fixed 8 pre-existing component lint errors as a side effect; reconciled cleanly since Base44 pushes directly to main.

Phase 1.5 (this morning): three more fields requested and applied — User.is_legacy_user, User.legacy_grace_until, Business.subscription_exempt. Cascaded into the entity jsonc files via Base44 auto-push.

### Phase 2 — Reparenting machinery + production migration shipped

Two Base44 server functions + one Node migration script, all gated by a shared `MIGRATION_SECRET` header (Base44 API-key auth does not populate `caller.role`, so role-based gating was wrong). All entity I/O via `asServiceRole`. All mutations write to AuditLog with `user_id = Doron` per DEC-139 server-authoritative identity.

- **`reparentBusiness`** (Base44 server fn) — actions: `reparent` | `rollback`. Idempotent (if current parent matches target → skip). Dry-run skips parent-existence check (fix in commit `210d087` after first dry-run surfaced symbolic-parent edge case).
- **`migrationHelpers`** (Base44 server fn) — actions: `create_business`, `create_business_from_fs_profile`, `archive_business`/`unarchive_business`, `archive_fs_profile`/`unarchive_fs_profile`, `mark_legacy_user`/`unmark_legacy_user`, `find_user_by_email`.
- **`phase-2-production-migration.js`** (Node) — dry-run by default, `--apply` executes, prints audit_log_ids on mid-step failure for surgical rollback.

Code committed to community-node main: Commit 1 `cc051a9` (machinery) + `210d087` (dry-run fix). Reports committed to private repo: `177e915`.

**Production tree after apply:**

```
Mycelia, LLC (69ea4eb39932effeb503d889) — hidden, subscription_exempt
├── LocalLane (69ea4eb4ff90f499289e5def) — exempt
├── The Camel Academy (69ea4eb5d5b69f39bbcc404f)
└── Recess (699e0d3deb3cfa670a28b275) — reparented

Red Umbrella (69ea5590481b7e15af7216b6) — NEW, owner Bari, peer not child
Spetzler Designs, NH systems, Danny Sikes Construction — untouched
```

Pulse: 4 → 8 businesses, 3 → 7 claimed. Bari's FS profile has `business_id` linked. Bari's User has `is_legacy_user: true`. Doron's test sandbox archived (`archived_at` set). 9 AuditLog rows written, all reversible.

### What the migration surfaced (DEC-095 amendment — see DECISIONS.md)

First `--apply` completed steps 1-4 then 500'd at step 5 ("Permission denied for update operation on FieldServiceProfile entity"). The assumed fix (open `security.update: true`) wasn't enough. Base44 has a **separate `rls` block** whose update rule is independent of the security layer. `asServiceRole` respects `rls.update: {"created_by": "{{user.email}}"}` and rejects when the service role identity ≠ the record's creator. Full fix required removing the `rls.update` key entirely (matches post-original-DEC-095 FSDocument pattern). Append amendment to DEC-095 formalizes this.

### Base44 working agreement established (DEC-162)

Multiple sessions this week surfaced the same pattern: Base44's agent auto-lint-fixes files beyond the scope of the prompt when applying schema changes. Fix: applied-directly prompts with four-category confirmation checklist — (a) scoped change applied, (b) files read but not modified, (c) out-of-scope observations, (d) files consciously not touched despite noticing issues. Report-don't-fix is a standing rule. DEC-162 codifies.

### Decisions made

- DEC-155: Per-entity $9 membership model with LocalLane exemption (supersedes DEC-115)
- DEC-156: Business-as-scoped-peer, not nested container
- DEC-157: Networks unified architecture
- DEC-158: Users as first-class entities with optional public pages
- DEC-159: Legacy user grace period pattern
- DEC-160: Desk rename
- DEC-161: Living tiles, not photos
- DEC-162: Base44 agent working agreement
- DEC-095 amendment: `security.update` is only half of the fix — `rls.update` key must also be absent

### Drift + cleanup items noted (future sessions)

- **DECISIONS.md drift:** `Spec-Repo/DECISIONS.md` and `community-node/DECISIONS.md` have diverged. Spec-Repo jumped 145 → 149 skipping 146-148; community-node has 146 (Living Feet), 147 (R&D Allowlist), 148 (Overlay Expansion). Both have a DEC-152 pointing at different decisions (Spec-Repo = Cockpit Library; Doron's intended DEC-152 now renumbered to DEC-162). This session adds new entries to Spec-Repo only; community-node copy not synced. Needs its own audit/merge session.
- **Base44 auto-push behavior:** continues to push "File changes" commits directly to main (uninformative messages, occasional unrelated lint fixes bundled with intended schema changes). DEC-162 working-agreement mitigates but does not eliminate; expect it in any entity-change session.

### What's next

Phase 3 — business switcher — queued for a future session (separate day, UI-only, no production mutations). Phases 4 (Desk rename + business-scoped rendering), 5 (membership gate), 6 (onboarding fork) follow. Round 2 (Stripe Connect) is the prerequisite for real money flow and will re-invoke the legacy grace pattern (DEC-159) to populate `legacy_grace_until` on all `is_legacy_user: true` users.

Bari workspace verification pending — Doron will log in from a real device when it's convenient. No UI changes expected; the migration only populated a background `business_id` link.

### Cleanup

- `MIGRATION_SECRET` removed from Base44 env config (Doron) and from `community-node/.env` (Hyphae). `.env` file kept for Round 2 Stripe keys; verified gitignored; verified no commits contain the secret.

---

## Session Log — 2026-04-23 (Bari-prep)

**Focus:** Build-and-ship session to prepare Bari Swartz's Red Umbrella Services LLC workspace for the 2026-04-24 morning meeting. User-owned templates as a feature, preview UX on all template cards, legal disclaimer on system templates, `video_url` field on Business (plumbing only), and load Bari's two attorney-drafted contracts (General Construction Contract + Subcontractor Agreement) into his workspace.

**Shipped to community-node (origin/main):**

1. **Track A — feature surface (commit `e3ba53a`):** Two-tier FSDocumentTemplate (DEC-163) with `business_id` field and client-side partition (DEC-140 pattern). Two-section templates UI on FS Documents tab: "{{BUSINESS NAME}} TEMPLATES" above "DOCUMENT TEMPLATES" system section. Click-any-template preview modal (DEC-165) with business-branded letterhead, bracketed per-client placeholders, Close + "Use this Template" CTAs, Escape + backdrop close. Lightweight legal disclaimer on system templates only: banner in preview modal + small italic footer on rendered FSDocument. `buildMergeData` rewritten business-first (DEC-164): 14 new `{{business_*}}` merge fields including `logo_url` and `banner_url`, legacy `{{company_*}}` preserved. Branded letterhead (logo + name + tagline) in DocumentDetail. `video_url` field plumbed: `PROFILE_ALLOWLIST` in `updateBusiness/entry.ts`, URL input after Facebook in `BusinessSettings.jsx`, jsonc reference copy updated. No render on BusinessProfile — deferred to BusinessProfile redesign session.
2. **Track B cleanup (commit `4c6ceda`):** Strip italic `*(Note: ...)*` implementer annotations from loaded template content. Source `.md` files in `base44-prompts/assets/` keep the annotations for repo documentation; only what reaches Base44 is clean. Regex eats leading whitespace so both standalone-paragraph and inline note forms collapse cleanly.
3. **Track B load (commit `c3a7091`):** `base44-prompts/assets/` directory with `bari-red-umbrella-construction-contract.md` + `bari-red-umbrella-subcontract.md` (source verbatim). New `migrationHelpers.create_fs_document_template` action: idempotent on `business_id + title`, `asServiceRole` write, AuditLog row. Loader at `src/scripts/migrations/load-bari-templates.js` — dry-run default, `--apply` executes, strips metadata header at first `---` divider then strips implementer notes.
4. **Bari's templates applied** via `node src/scripts/migrations/load-bari-templates.js --apply`. Two `FSDocumentTemplate` records created:
   - `69ea7974c5f30ff25c860702` — "Red Umbrella General Construction Contract" (21 unique merge fields, 14,860 chars, audit `69ea7974395160c0cb100bf6`)
   - `69ea797533163127a73aeef3` — "Red Umbrella Subcontractor Agreement" (26 unique merge fields, 21,252 chars, audit `69ea7975450b88cc171192ba`)
   Both scoped to Red Umbrella (`business_id: 69ea5590481b7e15af7216b6`), Bari's FS profile (`profile_id: 69baba55a6b9cca0c7d5700b`), `is_system: false`. Source typos preserved verbatim: Section 6 appears twice in the construction contract, Section 15 of the subcontract reads "fifteen percent (25%)", Section 21 has duplicate 21.2, Section 22 is missing 22.4. Idempotent re-apply returned SKIPPED for both — idempotency verified.
5. **Regression fix (commit `9e349be`):** `TemplateEditor.handleSave` line 1157 wrapped `merge_fields` in `JSON.stringify(...)`; Base44 schema declares `merge_fields` as `array`. Pre-existing bug from Phase 4 (DEC-085 era, commit `6ce2faa`), dormant for months because no UI path had walked the "+ Custom" TemplateEditor save against live Base44 validation between Phase 4 and tonight's dogfood. Not a Track A regression. One-line fix: drop the stringify, pass raw array. Bug scope limited to TemplateEditor create + update paths — document generation, template preview, and system-template seeding all passed proper arrays and were unaffected. Bari's two migration-loaded templates also unaffected (loader script passed a real JS array).

**Base44 changes applied by Doron (via agent prompts):**

- `FSDocumentTemplate.business_id` (string, optional, FK→Business) — Read permission confirmed authenticated (no rls.read rule existed at audit time)
- `Business.video_url` (string, optional) — URL field for intro video (YouTube, Vimeo, or direct mp4)
- `migrationHelpers` — new `create_fs_document_template` action pushed via GitHub auto-sync, deployed by Base44 platform sync

**Dogfood observations:**

- Template creation "+ Custom" flow hit the dormant `merge_fields` stringify bug → fix pushed same session (`9e349be`).
- Doron needed to verify Bari's workspace view (templates visible under "RED UMBRELLA TEMPLATES") but couldn't without logging in as Bari → surfaced as a seedling (Admin Impersonation Mode, private/SEEDLING-TRACKER.md).
- Video URL input needed to be pasted into Bari's settings but Doron couldn't impersonate → same seedling, second hit in 30 minutes — strong signal this gap will keep biting.
- Current-business signal on the Documents tab reads `profile.business_id` — works for today's single-business case, resolves cleanly in Phase 3 when the business switcher becomes the authoritative source.
- Test template created in Doron's workspace (business_id `69ea4eb5d5b69f39bbcc404f`) deleted post-session.

**Decisions made:**

- **DEC-163** Two-tier template architecture — system + business-scoped user-owned
- **DEC-164** Business-first branding composition in FS document rendering
- **DEC-165** Template preview before commit
- **DEC-166** Bari-prep user-template provisioning via admin migration path
- **DEC-167** Write-mutation schema-conformance audit protocol (from the `merge_fields` bug root-cause)

**Tech debt logged (private/TECH-DEBT.md, new file this session):**

- FSDocumentTemplate `rls.update` creator-only — business teammates cannot edit each other's templates; Bari cannot edit the two migration-loaded templates. Workaround: fresh "+ Custom" copy. Fix: remove `rls.update` per DEC-095 amendment pattern.
- Phase 2 carryover — FieldServiceProfile + User `security.update: true` with no RLS. Wide-open by design to let Phase 2 migration run. Phase 5 (membership gate) re-tightens per DEC-095 amendment pattern.
- Phase 2 migration scripts `eslint-env node` placement bug in `scripts/migrations/TEMPLATE.js` and `scripts/migrations/phase-2-production-migration.js`. Cosmetic, no runtime impact.

**Seedlings logged (private/SEEDLING-TRACKER.md):**

- Admin Impersonation Mode (Phase 6+)
- Shared Base44 Entity Schema Validator Module (Living Feet DEC-146 pattern — architectural mitigation for the class of bug DEC-167 addresses procedurally)
- BusinessProfile Website-Shaped Redesign (video render becomes live at that point)

**Next up:**

- Bari workspace live check from Bari's device (2026-04-24 morning)
- Phase 3 — business switcher
- Phase 4 — Desk rename + business-scoped rendering (DEC-160, DEC-156)
- Phase 5 — membership gate + re-tighten FSProfile/User `rls.update`
- Round 2 — Stripe Connect (prerequisite for real money flow + legacy grace population)
- BusinessProfile redesign (video render goes live)
- DECISIONS.md drift audit + merge session

**Ship-it timestamp:** 2026-04-23, evening. Session closed.

---

## Session Log — 2026-04-24 (Phase 3 marathon)

**Focus:** Multi-build day closing most of Round 1 Phase 3. Six community-node commits + one Spec-Repo architecture commit. First external revenue logged (Bari, $500 retainer). Migration plan resolved (Pattern C+, Phase 6 trigger). Service area becomes structured. Vocabulary settled (Jobsite → Desk).

**Shipped to community-node (origin/main):**

1. **Build 1 commit-handler patch (`c0d7c3f`):** SpaceSpinner pointer-capture issue resolved — center-tile commits now fire reliably; `onCenterTap` prop added. The cockpit-native business switcher (DEC-168) is functional end-to-end after this. Preceded by a TDZ-error patch (`e6b4c4c`) and a diagnostic commit (`87a8ee4`).
2. **Build 2 — Directory visibility filter + Settings toggle (`65e3fd7`):** new `src/utils/directoryVisibility.js` helper (`filterListedBusinesses`, predicate `b.listed_in_directory !== false`) applied at all three public surfaces — `Directory.jsx`, `NetworkPage.jsx`, `Home.jsx`. Owner-only "Directory Visibility" card in `BusinessSettings` with immediate write + toast (matches the Build 2 pattern). `listed_in_directory` added to `PROFILE_ALLOWLIST` in `updateBusiness/entry.ts`. Mycelia, LLC stops leaking to public surfaces; admin surfaces unaffected (owners always see their full tree per DEC §13.1).
3. **Build B — Profile Settings editors + tagline render + photos + accepts toggles + empty-state nudge (`6521232`):** preceded by diagnostic commit `57db9d6`. Closes the origination gap from Phase 2 — businesses created via reparenting (Mycelia, Red Umbrella) skipped the directory content `BusinessOnboarding` would have captured, so Settings now carries editors for every rendered-but-previously-uneditable field. Tagline editor in Basic Info; universal `services[]` structured editor (port of `BusinessOnboarding` add/remove/update pattern); standalone Photos card (upload-then-append, reuses `Step2Details.jsx`); standalone Accepts Payments card (Joy Coins + Silver toggles, immediate write); empty-state nudge banner (owner-only, only while sparse, session-dismissable). `BusinessProfile.jsx` subtitle ladder fixed: `tagline → getCategoryDisplayLabel → "New to LocalLane"`. `PROFILE_ALLOWLIST` audited; no additions needed. The legacy `services_offered` textarea was removed (new writes go to `services[]`); legacy data still renders via the profile's existing fallback.
4. **Build C — Jobsite → Desk vocabulary rename (`9598128`, DEC-170):** three `PLATFORM-LABEL` changes in `MyLaneSurface.jsx` (label + welcome map) and `HomeFeed.jsx` (priority spinner). Inside-the-business cockpit no longer says "Jobsite"; says "Desk." `FieldServiceAgent` persona text intentionally preserved (domain vernacular). Bari's subcontract preserved (user content, not platform copy). No URL or component file renames — Phase 4 (DEC-160) will rename the implementation tier; this build cleans the user-visible vocabulary.
5. **Build D — Cockpit centering on wide viewports (`47d1af2`):** root cause was `.mylane-content-area.panel-open { margin-right: 300px }` reserving width for an agent panel that's already an absolute overlay (Living Feet violation — the panel was load-bearing in two places: the absolute overlay layout and the margin reservation). Removed the margin rule; layout now centers cleanly on 375 / 1280 / 1400 / 1600 / 1920 / 2560 px.
6. **Build E — Service area structured editor (`7c21c3e`, DEC-174):** new `src/config/laneCountyTowns.js` with curated 21-town list (Coburg, Cottage Grove, Creswell, Dexter, Dunes City, Elmira, Eugene, Fall Creek, Florence, Junction City, Lowell, Marcola, McKenzie Bridge, Noti, Oakridge, Pleasant Hill, Springfield, Veneta, Vida, Walterville, Westfir — incorporated cities + notable unincorporated communities). Each town carries `{slug, display_name, region_slug: 'lane-county'}` for forward compatibility with the Phase 6 Region entity (DEC-172). New `src/components/business/TownMultiSelect.jsx` reusable curated multi-select chip component (matches Build B's `product_tags` chip visual). `BusinessSettings.jsx` replaces the freeform `service_area` Input with `TownMultiSelect`, universal across archetypes — no longer gated to `service_provider`. `service_area` is now `array<slug>`; legacy strings preserved verbatim and rendered with an owner-only "(legacy)" annotation on `BusinessProfile.jsx`. `serviceAreaMutation` writes immediately on chip toggle (matches Build 2's `acceptsMutation`). `service_area` was already in `PROFILE_ALLOWLIST`; no server-side changes.

**Shipped to Spec-Repo (origin/main):**

7. **Architecture v4.1 amendments (`955f8e2`):** DEC-169 (folder architecture — cockpits render folders at every depth; root universal + contextual; workspace at the leaf), DEC-170 (Home collapses into Desk inside a business — Home is a Personal-scope concept; Desk is the home of business work), DEC-171 (path-based direct doors `/b/{slug}` for Round 1 — Base44 has no wildcard subdomains; custom domains for Round 2+; URL is the primary scope source for `useActiveBusiness`), DEC-172 (Region as first-class entity with `seed / sprouting / established` lifecycle; "carried in the wind" growth — visitors from unfounded regions become seeds of those regions; Phase 6 implementation), DEC-173 (resurface before rebuild — when a previously-built surface is needed, find it in the codebase or git history first; rebuild from scratch is the last resort; standing rule across all phases).

**Decisions made:**

- **DEC-169** Folder architecture
- **DEC-170** Home collapses into Desk inside a business
- **DEC-171** Direct doors are path-based for Round 1 (custom domains Round 2+)
- **DEC-172** Region as first-class entity with lifecycle states
- **DEC-173** Resurface before rebuild
- **DEC-174** `service_area` is `array<slug>` on Business (forward-compatible with Phase 6 Region/Town foundation)
- **DEC-175** Migration to Supabase + Vercel deferred to Phase 6, combined with Region foundation backfill (single fragility window). All 8 Base44 agents retired during migration; new warm-presence AI companion designed fresh based on Bari's "AI tour guide" framing. Sandbox new platform on `lanecountyrecess.com`; `locallane.app` stays on Base44 during construction. Disciplined seam-hardening through Phase 4-5 (Build F bundles SDK wrap into `src/api/`).

**Organism milestone — first external revenue:**

Bari Swartz paid a **$500 retainer check on 2026-04-24**. Pricing structure agreed: $45/mo platform (founding rate, locked vs $69 launch standard), $45/hr dogfood rate, $90/hr service rate, $40 service call, $350 half-day, $650 full-day. **First external revenue in LocalLane history.** Phase milestone, logged.

**Migration plan resolved (DEC-175 — Pattern C+):**

Migration research doc at `community-node/docs/migration-research.md` (commit `78fc8c7`) evaluated five patterns. Selected: **C+ — build to prepare on Base44, migrate at Phase 6 combined with Region backfill.** Rationale:
- Phase 6 already opens the database for Region backfill — adding the platform migration to that window incurs one fragility cost instead of two.
- Eight existing Base44 agents have hardcoded entity-name vocabulary. Retiring them and birthing a single warm-presence companion fresh at migration time is cheaper than porting eight.
- Bari's "AI tour guide" framing is the design seed for the new companion — softer, fewer agents, more presence.
- `lanecountyrecess.com` is the sandbox for the new platform (Supabase + Vercel) so `locallane.app` keeps running on Base44 during construction.
- Phases 4 and 5 will harden seams: Build F bundles the SDK wrap into `src/api/` (no new direct CRUD anywhere), giving the swap layer a single point of replacement at migration time.

**Build queue (pending):**

- **Build F — Multi-category support + SDK wrap into `src/api/`** (bundled — F touches many files anyway, validating the wrapper shape with the first real consumer). Closes Phase 3.
- **Build G — Desk tile icon swap** (cosmetic, ~15 min — HardHat → Briefcase or similar).
- **Build H — Workspace content centering on wide monitors** (cosmetic; needs more thought than a one-line fix; defer past Build F).
- **Phase 3.5 — Direct doors** (`/b/{slug}` per DEC-171).

**Phase position:**

- **Round 1 Phase 3 ~95% complete.** Switcher (Build 1 patch), directory visibility (Build 2), profile editors (Build B), Desk vocabulary rename (Build C), centering fix (Build D), service area structured editor (Build E). Build F closes Phase 3.
- **Phase 3.5 (direct doors)** is next.

**Carryover items:**

- `community-node/docs/migration-research.md` was supposed to be deleted post-decision per its own ephemeral note; still present in main as of `78fc8c7`. Cleanup owed in a future community-node commit (not this Spec-Repo session).
- DECISIONS.md drift between Spec-Repo and community-node still pending (carryover from 2026-04-23).

**Ship-it timestamp:** 2026-04-24, evening. Session closed.

---

## Session Log — 2026-04-25 (Phase 3 closeout + multi-machine infrastructure)

**Focus:** Phase 3 closed across Builds F, G, and H. One Base44 schema fix (`service_area`). Multi-machine development infrastructure brought online (Mac mini as primary alongside MacBook Pro). DEC-176 through DEC-181 added. Strategic clarifications: Phase 3.5 deferred, new Phase 5 (pre-migration cleanup) inserted, payment infrastructure deferred.

**Shipped to community-node (origin/main):**

1. **Build F.1 — SDK wrap foundation + businessCategories config hoist (`946b9eb`):** Foundation for the Base44 SDK wrap landing in `src/api/`. Multi-category config (`businessCategories`) hoisted from where it lived inline into a config module ready to be consumed by the wrap. First migration-prep seam-hardening step per DEC-175.
2. **Build F.2 — TownMultiSelect → SlugMultiSelect rename (`cd8d700`):** Generalized Build E's reusable curated-multi-select chip component from town-specific naming to the broader slug pattern. Preparation for the multi-category use case in F.3 (subcategories are also slugs).
3. **Build F.3 — Wire SlugMultiSelect into BusinessSettings + Directory pill filter patch + updateProfile wrap amendment (`bb76fbc`):** Multi-category support live end-to-end via `subcategories[]`. Directory pill filter patched to drive off the new structure. Wrap amended to add `updateProfile()` wrapping the `updateBusiness` server function (DEC-177 — write-path conformance, not just field-shape conformance — surfaced when initial wrap delegated to `base44.entities.Business.update()` while 29 owner-write call sites route through the server function gated by `PROFILE_ALLOWLIST`). Closes Build F.
4. **Build G — Desk tile icon swap (`a2c46b5`):** HardHat → Briefcase. Cosmetic. The HardHat icon was archetype-leaky (read as Field Service) for what is now the universal Desk surface.
5. **Build H — Workspace content centering on wide viewports (`9c3d080`):** Closes Phase 3. Same root cause as Build D (cockpit centering) but at the workspace-content layer.

**Shipped to Spec-Repo (origin/main):**

6. **Path alignment commit (`29351e4`):** All `~/Documents/LocalLane/` references in repo docs aligned to `~/Documents/GitHub/`. Five replacements in `audits/MEAL-PREP-READINESS-AUDIT.md`. Strikethrough historical reference to deleted `locallane-spec-repo` preserved as historical fact. **Shipped via Hyphae from the Mac mini — first Hyphae session run from the new primary machine.** Round-trip smoke test (commit on mini, push, pull on laptop) passed.
7. **Phase 3 closeout docs commit (this session):** DECISIONS.md DEC-176 through DEC-181, STATUS-TRACKER updates, SEEDLING-TRACKER additions, ACTIVE-CONTEXT refresh, PROJECT-BRAIN multi-machine note, LAUNCH-CHECKLIST Phase 3 marks + Phase 5 additions.

**Base44 schema fix applied by Doron (via agent prompts):**

- **`Business.service_area`** field type changed from `string` to `array<string>` to match Build E's code-side restructure (DEC-174). First surfaced by Bari smoke-test 2026-04-25 — every owner save returned `422 "Error in field service_area: Input should be a valid string"`. Decision DEC-178 codifies pairing code-level schema changes with Base44 dashboard updates so this whole class of regression doesn't recur.
- **`Business.categories`** field added in error during Build F Phase 1 verify; left in place pending Phase 5 cleanup (DEC-176). Field is permissive (`array<string>`, default `[]`) and costs nothing sitting empty. Multi-category writes flow through `subcategories[]` per DEC-055.

**Infrastructure migration (today):**

- **Mac mini** added as primary development machine alongside MacBook Pro 2017. Both machines now run identical setups: GitHub Desktop, Claude Desktop, Claude Code (Hyphae) v2.1.119, Node.js v24.15.0 with `~/.npm-global` prefix, SSH keys authenticated to github.com/withdoron.
- **Repos moved** from `~/Documents/LocalLane/` to `~/Documents/GitHub/` on both machines (matches GitHub Desktop's default clone path).
- **All four repos** (community-node, Spec-Repo, private, ephraim-games) on SSH remotes on both machines.
- **Working discipline:** pull as the first action of any session, push after every commit. Already the Hyphae default cadence — now load-bearing for multi-machine.
- **DEC-181** records the setup. Mac mini is primary (more powerful, eventual Clawbot host); MacBook Pro is secondary (mobility, field visits to Bari).

**Decisions made:**

- **DEC-176** Business.categories field added in error, left in place
- **DEC-177** Schema-conformance audits include write-path conformance (extends DEC-167)
- **DEC-178** Code-level schema changes paired with Base44 dashboard updates (extends DEC-093, DEC-167)
- **DEC-179** Phase 3.5 Direct Doors deferred to post-migration (Bari has redumbrellaservices.com, no URL pressure)
- **DEC-180** Phase 5 — Pre-migration cleanup added to roadmap between Phase 4.5 and Phase 6
- **DEC-181** Multi-machine development setup (Mac mini primary, MacBook Pro secondary, paths aligned at `~/Documents/GitHub/`)

**Strategic clarifications:**

- **Phase 3.5 (Direct Doors) deferred to post-migration** per DEC-179. Bari's $500 retainer covers Field Service workflow + direct platform time, not public profile replacement. He already operates redumbrellaservices.com.
- **New Phase 5 (Pre-Migration Cleanup) added** per DEC-180. Inserted between Phase 4.5 (Seedlings) and Phase 6 (Migration). Covers dead code removal, unused entity audit, archetype/main_category/sub_category_id consolidation into `subcategories[]`, walking-the-app cleanup findings.
- **Payment infrastructure deferred to post-migration.** Membership gate (was Phase 5, DEC-155) and Stripe Connect (was Round 2) both move to the post-migration window. Cheaper to build payment once on Supabase+Vercel than to build it twice.

**Field Service node assessment:**

Bari is a paying user, multi-category classification working end-to-end after Build F. Node now considered **production-shaped** given paying-user dependency. Score nudged to ~95/100. Flag raised: NODE-LAB-MODEL.md (private repo) likely needs a phase-review note — Field Service may have crossed the seed → sprout → grow → thrive threshold with the paying-user signal. Not updated this session (NODE-LAB-MODEL is in private/, outside this Spec-Repo + community-node commit scope).

**Carryover items (still pending):**

- `community-node/docs/migration-research.md` cleanup (was supposed to be deleted post-DEC-175, still in main)
- DECISIONS.md drift between Spec-Repo and community-node (pre-existing, dedicated session)
- community-node `context/` doc files diverged from Spec-Repo (`ACTIVE-CONTEXT.md`, `STATUS-TRACKER.md`, `SESSION-LOG.md`, `PROJECT-BRAIN.md` all dated 2026-04-15) — same drift pattern as DECISIONS.md, dedicated session needed.
- Field Service node phase review in NODE-LAB-MODEL.md (private repo, separate session).

**Seedlings logged (this session):**

- `legacyCategoryMapping` cleanup (`categoryData.jsx:229-240`, Phase 5 candidate)
- `BusinessEditDrawer` derived-write pattern (`BusinessEditDrawer.jsx:75-98`, Phase 5 candidate)
- HardHat string-icon in `workspaceTypes.js:232` (Phase 5 candidate when archetype-neutralizing)
- Persistent Base44 SDK 404 console spam on every page load (root-cause investigation candidate)
- Duplicate `DC` key React warning in Radix Select (likely state-code Select; separate cosmetic fix)

**Phase position:**

- **Round 1 Phase 3 closed.** All builds (1-patch, 2, B, C, D, E, F, G, H) shipped. Phase 3.5 deferred to post-migration.
- **Phase 4 next.** Desk implementation rename + business-scoped rendering (DEC-160, DEC-156); plus reaffirmed scope: MyLaneSurface hook reordering, MyLaneDrillView latent bug fix, eslint-plugin-react-hooks exhaustive-deps enforcement, resurfacing buried surfaces per DEC-173.
- **Pre-migration progression:** Phase 4 → Phase 4.5 (Seedlings: Admin Impersonation, post-migration welcome flow) → Phase 5 (pre-migration cleanup, NEW) → Phase 6 (Migration to Supabase + Vercel + Region foundation, Pattern C+ per DEC-175).

**Multi-machine smoke test:**

This is the first Hyphae session running from the Mac mini. The path-alignment commit (`29351e4` Spec-Repo) was created on the mini and pushed via SSH; pulling on the MacBook Pro would complete the round-trip smoke test. Closeout commit from this session is the second test of the same loop.

**Ship-it timestamp:** 2026-04-25, evening. Session closed. Phase 3 closed. Ready for Phase 4.

---

## Session Log — 2026-04-26 (Phase 4 warmup + DEC-182 + Cursor retirement + Field Instrument seed committed)

**Surface:** Claude.ai (Mycelia thread) + Hyphae on Mac mini.

**Focus:** Phase 4 warmup (community-node doc-drift sync) ran clean; the four findings it produced compounded into three downstream pieces of work in the same session — DEC-182 (architectural call ratifying the no-mirror policy), Cursor retirement from canonical docs, and the cleanup of two stale community-node root files. Plus: FIELD-INSTRUMENT-SEED.md (private repo) finally committed after living on the laptop since 2026-04-12; Pedrom thread brought current with v0.1 protocol outcome (live test 2026-04-24).

**Shipped to community-node (origin/main):**

1. **Phase 4 warmup — context layer drift sync (`fe9fad9`):** community-node `CLAUDE.md`, `AGENTS.md`, and all three `context/` files (PROJECT-BRAIN, ACTIVE-CONTEXT, SESSION-LOG) brought current with Spec-Repo canonical. Drift gap from 2026-04-15 closed. Spec-Repo's 1367-line SESSION-LOG replaced community-node's stale 654-line copy (community-node had condensed-mirror entries for 2026-04-04 and 2026-04-05 — fully covered by Spec-Repo's superset, so replacement was clean, not divergent). Three findings flagged: broken `@`-imports in CLAUDE.md (`@ARCHITECTURE.md`, `@STYLE-GUIDE.md`, `@.cursorrules` — none exist locally), Cursor-retirement inconsistency across docs, two orphan root files. All addressed in subsequent commits today.
2. **Cursor + stale-files cleanup (`b7b1a19`):** `community-node/PUNCH-PASS-AUDIT.md` removed (2026-02-07 Punch Pass → Joy Coins language audit, pre-Community-Pass artifact, no code references). `community-node/DEC-025-ENTITY-PERMISSIONS.md` removed (Phase 3a entity-permission deployment checklist, settings superseded multiple times since via DEC-115 / DEC-136 / DEC-140). `community-node/context/PROJECT-BRAIN.md` re-synced from Spec-Repo canonical — first explicit demonstration of the DEC-182 single-source-with-sync flow (Spec-Repo edited as canonical, community-node mirror refreshed downstream in the same pass).

**Shipped to Spec-Repo (origin/main):**

3. **`.cursorrules` deleted (`4cb0e3d`):** Cursor-era artifact removed via `git rm`. (This commit was supposed to also include the PROJECT-BRAIN edits and DEC-182 append but those weren't staged — the Edit tool leaves changes unstaged. Caught on the next `git status`. Lesson recorded; see Posture note.)
4. **PROJECT-BRAIN Cursor retirement + DEC-182 (`6638c29`):** Continuation commit. PROJECT-BRAIN.md drops "Cursor IDE (visual editing)" from AI Tools, drops "Base44+Cursor" from the living-feet tooling-stack progression, removes the entire "Cursor Prompt Format" section, removes `.cursorrules` row from the File Map, bumps Last updated stamp. **DEC-182 (Single-Source Documentation, Scheduled Drift Sync) appended to DECISIONS.md** — codifies the architectural call: Spec-Repo is canonical for project documentation, tool-specific repos reach across via explicit `~/Documents/GitHub/Spec-Repo/...` paths, the narrow `context/` mirror in community-node is refreshed by scheduled drift-sync passes (one Hyphae prompt per Phase or per Monthly Sharpening), CLAUDE.md and AGENTS.md remain community-node-native (not mirrors). DEC-182 wording adjusted from the suggested text to make the file-categories distinction precise (CLAUDE.md/AGENTS.md don't exist in Spec-Repo at all, so they aren't mirrors — only `context/` is).

**Shipped to private (origin/main):**

5. **FIELD-INSTRUMENT-SEED.md committed to root (`e00bcda`):** Originally drafted 2026-04-12 in Mycelia thread, saved to laptop outputs, never committed. Located today on laptop, reviewed, substantively updated to fold in v0.1 outcome (live test 2026-04-24 with Pedrom Rejai — both AIs hit the posture the protocol asked for; Pedrom's AI flagged a framing-bias failure mode that became the single most valuable output of v0.1; both parties agreed to keep building). Revised to remove personal-to-Doron and LocalLane-specific framing — now a project-only living document. 244 lines. Placed at private repo root to match the existing flat organizational pattern (no `projects/` subfolder exists; other seed-stage cross-project work — BOMB-SQUAD-GROWERS.md, BJJ-RANKED-QUEUE.md, BOOK-FRAMEWORKS.md — also lives at root).

**Decisions made:**

- **DEC-182 — Single-Source Documentation, Scheduled Drift Sync.** Spec-Repo is canonical; tool-specific repos reach across, do not mirror. The narrow exception is `community-node/context/` (PROJECT-BRAIN, ACTIVE-CONTEXT, SESSION-LOG), refreshed via scheduled drift-sync. Demonstrated in commit `b7b1a19` (community-node mirror refresh in same session as the Spec-Repo edit).

**Cleanup completed:**

- Cursor IDE removed from canonical PROJECT-BRAIN docs in both repos.
- Spec-Repo `/.cursorrules` deleted.
- `community-node/PUNCH-PASS-AUDIT.md` deleted (pre-Community-Pass artifact).
- `community-node/DEC-025-ENTITY-PERMISSIONS.md` deleted (superseded permission model from Phase 3a).
- Two-commit lesson recorded for Hyphae: stage all modifications via `git add` before commit; `git rm` stages deletions but the Edit tool leaves modifications unstaged. Manifested as the `4cb0e3d` → `6638c29` Spec-Repo split today.

**Field Instrument (sibling product, seed-stage, separate from LocalLane):**

- v0.1 protocol live-tested 2026-04-24 with Pedrom Rejai. Successful — both AIs hit the posture the protocol asked for. Pedrom's AI flagged a framing-bias failure mode in the protocol — the single most valuable output of v0.1.
- Mycelia drafted a post-meeting follow-up email (em-dash-free, two variants) ready to send.
- Flagged a Eugene Bigfoot Beverages Director of Operations posting to Pedrom as a possible fractional-consulting opportunity tied to his Junction City client visit.
- GitHub repo `alibi-protocol` planned but deferred pending Pedrom's response.
- Companion artifacts (HYPHAE briefings, SELF-PORTRAIT-TEMPLATE, PARTICIPATION-GUIDELINES) remain on laptop; will commit alongside repo setup once moved to mini.

**Carryover items (still pending):**

- Sweep remaining Cursor references in `Spec-Repo/WORKFLOW.md` (~17 occurrences), `ARCHITECTURE.md:156`, `README.md:261/265/277`, and `checklists/farm-program-launch.md:60`. `MAP-VIEW.md:9` (historical estimate) and `DECISIONS.md:93` (DEC-099 historical rationale) intentionally left intact as append-only history. Queued for the May 4 Monthly Sharpening.
- `community-node/docs/migration-research.md` cleanup (still pending from 2026-04-25).
- DECISIONS.md drift between Spec-Repo and community-node (pre-existing, dedicated session needed).
- NODE-LAB-MODEL.md phase-review note for Field Service crossing production-shaped (private repo, deliberate review pending — flagged again this session, not updated as a side-effect of ship-it).
- Phase 4 main work: MyLaneSurface hook reordering, MyLaneDrillView lines 48-52 latent bug, eslint-plugin-react-hooks exhaustive-deps enforcement, resurfacing buried surfaces per DEC-173.
- Bug log carryovers: Base44 SDK 404 console spam, duplicate DC key React warning, `Business.categories` empty field per DEC-176.

**Posture note for the record:**

Today was a heavier session than the morning briefing planned. The Phase 4 warmup ran clean and the four findings it produced created bandwidth for the architectural call (DEC-182), the cleanup, and the Field Instrument capture. The day compounded rather than drifted. Worth noticing: this is the pattern when warmups go well. Plan light, ship clean, let downstream work earn its place.

One self-correction worth recording: Mycelia overweighted a casual phrase from Pedrom's email ("my Mycelia") and was about to write a "two Mycelias in this work" observation into the canonical seed doc. Doron caught it. Pulled from the doc in revision. Worth noting because it's the framing-bias failure mode Pedrom's AI flagged in v0.1, manifesting in real time, in this conversation. The protocol's own first lesson lived through.

The collaboration may continue tonight before bed. This ship-it captures state through this point.

**Ship-it timestamp:** 2026-04-26, evening. Session closed.

---

## Session Log — 2026-04-26 (continued, evening) — Phase 4 plan in fully-planned state + DEC-183 + DEC-184

**Surface:** Claude.ai (Mycelia thread) + Hyphae on Mac mini. Continuation of the day's earlier ship-it.

**Focus:** Earlier ship-it (commits `9fa698f` Spec-Repo + `e4d0fa2` private) closed in a settled state — Phase 4 main work was named as "next" but not yet planned. Evening session did the planning. Three artifacts shipped: Hyphae's pre-Phase-4 audit (`PHASE-4-MIGRATION-PLAN.md`), Bari's working list in a new per-collaborator folder structure, and a Section 8 amendment to the migration plan that closes all seven open questions Hyphae raised. Two architectural decisions ratified along the way: DEC-183 (Walk the Path Before Sinking Thought) and DEC-184 (Greenfield Alibi Project as First Supabase + Vercel Build).

**Shipped to Spec-Repo (origin/main):**

1. **`PHASE-4-MIGRATION-PLAN.md` (`1ed1a6c`):** 355 lines. Hyphae's pre-Phase-4 audit. Maps current `community-node/src/` against v4.1's folder model (Sections 10.1, 13.1, 14, 17, 20). Inventoried 60+ files across MyLane navigation, dashboard tab implementations, business-context machinery, hooks, registry. Mapped each to one of five buckets (Direct match / Move-rename / Partial / Net-new / Retire). Identified five files named in prior session logs that don't exist at expected paths (`MyLaneBreadcrumb.jsx`, `WhatsChangedBar.jsx`, `BusinessDashboard.jsx`, standalone `OverlayContainer.jsx`, standalone `BusinessSwitcher.jsx`) — stale references. Confirmed `enabled_spaces` field doesn't exist anywhere in the codebase (pure NET-NEW). Confirmed `listed_in_directory` toggle is already shipped in Build 2 (BusinessSettings.jsx + `directoryVisibility.js`). Confirmed DEC-179 contradicts v4.1's assumption that `/b/{slug}` routing is Phase 4 work. Proposed sequence: 4.1 (entity) → 4.2a (root folders) → 4.2b (Businesses-as-folder) → 4.3 (Home → Desk) → 4.4 (preview pulse) → 4.5 (spaces add/remove) → 4.6 (resurface pass) → 4.7 (Desk rename mechanical sweep). Surfaced seven open questions for Mycelia + Doron planning.

2. **Phase 4 migration plan Section 8 amendment (`b519ef3`):** +115 lines, header line amended to reflect evening planning. Ten subsections close all seven open questions:
   - 8.1 Preview pulse silence-by-default, signal-when-warranted (anti-filler, anti-scan).
   - 8.2 Folder placement static for Phase 4; user-determined shortcuts deferred (rejection of dynamic placement).
   - 8.3 Multiple businesses under Businesses folder; holding hierarchy in data not display.
   - 8.4 Apple Finder spatial model as reference (with explicit borrow/reject lists; no panoptic tree view, no static thumbnails, no desktop metaphor).
   - 8.5 URL nesting deferred per DEC-179; behavior works as if nested in component state.
   - 8.6 Desk inherits Home's content as-is for Phase 4; future pin-to-Desk pattern noted as Phase 5/6 candidate.
   - 8.7 Discover stays as fifth root folder.
   - 8.8 Admin contextual root in Phase 4 (Thing 1 only); admin lens inside every space deferred to Phase 4.5.
   - 8.9 Playmaker contextual root, default placement, current shipping behavior.
   - 8.10 `enabled_spaces` backfill: `["profile"]` for all except Doron's businesses (self-activate later via 4.5 UI or direct Base44 edit) and Bari's Red Umbrella (inspect actual usage — at minimum Profile + Desk + Settings + Finance if profile exists).

**Shipped to private (origin/main):**

3. **`private/users/bari/BARI-WORK-LIST.md` (`b651c91`):** new per-collaborator folder structure established. 114 lines. Captures Bari's named priorities: custom contracts (active — clarity-on-meaning conversation owed), business profile polish (shelf, returns when Phase 4 settles), e-sign + invites for clients/subcontractors (shelf — subcontractor scope depends on authority model parked in v4.1 §8), estimates with change-order workflow + dual-direction payment ledger (active alongside Phase 4 — full inflow + outflow ledger needed for Bari's 25% management fee transparency). Operating context section notes DEC-179 retainer scope (workflow help, not website replacement), schema-conformance discipline applies, Construction Gate (DEC-092) applies.

**Decisions made tonight:**

- **DEC-183 — Walk the Path Before Sinking Thought.** Path-walking cadence between sub-phase shipments. Each sub-phase ships, gets used, generates real-world friction signal, only then informs the next. Sub-phases not pre-sequenced for back-to-back execution. The reminders example illustrates: using a primitive reminders system tells Doron exactly what to spec when the proper version is built. Vision-without-path produces rework; path-walking is faster across the full arc even if any single step looks slower. Time-pressure (custody trial, Bari's needs) doesn't change this — strengthens it.
- **DEC-184 — Greenfield Alibi Project as First Supabase + Vercel Build.** The Field Instrument (alibi) develops in slow hours alongside Phase 4/5 LocalLane work. By the time Phase 5 cleanup finishes and Phase 6 migration starts, the alibi build has produced platform-learning fluency. Three purposes from one body of work: the alibi project itself, platform-learning for Phase 6, pressure-test of how Mycelia + Hyphae operate on a greenfield project on the new stack. Migrating an existing app onto an unfamiliar platform compounds two unknowns simultaneously — building greenfield isolates the platform-learning unknown.

**Tomorrow's first move:**

Phase 4.1 entity prompt — `Business.enabled_spaces` field added in Base44 (paired prompt + code per DEC-178), backfill existing businesses per Section 8.10 rules. Smallest possible move that earns the right to think about Phase 4.2. Mycelia drafts the prompt fresh tomorrow morning.

**Carryover items (still pending):**

- `NODE-LAB-MODEL.md` update for Field Service crossing production-shaped (~95 score, paying user). Flag persists from earlier ship-it.
- `DECISIONS.md` drift between Spec-Repo and community-node — pre-existing structural divergence; queued for May 4 Sharpening.
- `community-node/docs/migration-research.md` cleanup — supposed to have been deleted post-DEC-175; queued for May 4 Sharpening.
- Cursor reference sweep across `WORKFLOW.md` / `ARCHITECTURE.md` / `README.md` — queued for May 4 Sharpening (all in SuperMemory).
- Companion artifacts for Field Instrument (HYPHAE briefings, SELF-PORTRAIT-TEMPLATE, PARTICIPATION-GUIDELINES) — still on laptop; will commit when moved to mini and Pedrom responds.

**Posture note for the record:**

Tonight's late session produced two architectural decisions (DEC-183, DEC-184) that change how future planning conversations should be shaped. DEC-183 specifically pushes back on today's own pattern (115-line Section 8 detailing decisions about deferred features) and names the working principle that should govern future work: walk a short path, generate spec from use, then build. The reminders example (Doron uses primitive reminders, knows exactly what to spec when the proper version is built) is the canonical illustration. DEC-184 operationalizes DEC-183 at platform-migration scale: greenfield alibi build before LocalLane migration so platform-learning happens on a small surface area first.

Five commits across two repos today before this ship-it. Two earlier ship-it commits (`9fa698f` Spec-Repo + `e4d0fa2` private). After this commit, the day totals eight commits across three repos: community-node `fe9fad9`, `b7b1a19`; Spec-Repo `4cb0e3d`, `6638c29`, `9fa698f`, `1ed1a6c`, `b519ef3`, this session-end commit; private `e00bcda`, `e4d0fa2`, `b651c91`, this private session-end commit. A heavy day, but the heaviness was distributed across distinct workstreams (Phase 4 warmup, DEC-182 + Cursor cleanup, Field Instrument seed commit, Pedrom thread brought current, Phase 4 fully-planned state, two new DECs) rather than concentrated on any single bottleneck.

**Ship-it timestamp:** 2026-04-26, late evening. Session closed in fully-planned state. Tomorrow opens on Phase 4.1.

---

## Session Log — 2026-04-28 (Phase 4.2-tiles structurally complete + Engagements entity)

**Surface:** Hyphae on Mac mini. Single coherent day arc — ten Hyphae shipments across community-node, Spec-Repo, private, plus one Base44 entity, in roughly half a day.

**Focus:** Phase 4.2-tiles design pivot ratified and shipped end-to-end. Tiles cockpit became the v1 default; spinner gated to dev allowlist (DEC-147 pattern). Six sub-builds shipped per DEC-183 path-walking — design pivot doc, tile primitive, breadcrumb component, tile cockpit at root, per-business folder rendering, plus two bug fixes surfaced when tile cockpit routed more users through Events. Engagements design fully closed and entity built in Base44. Field Service removed from Personal as cleanup follow-up. Eight new DECs ratified.

**Shipped to community-node (origin/main):**

1. **Phase 4.2-tiles-1 — Generic Tile primitive (`a3ac463`):** Created `src/components/ui/Tile.jsx` (121 lines). Refactored `src/components/business/BusinessCard.jsx` (201 → 184 lines) to wrap Tile. Three import sites verified unchanged. `data-tile-kind` attribute pattern introduced for future per-kind styling.
2. **Phase 4.2-tiles-2 — BreadcrumbPath component (`caae822`):** Created `src/components/ui/BreadcrumbPath.jsx` (121 lines). Cockpit-agnostic with `mode="primary"` and `mode="adjacent"` presentation modes. Composes existing shadcn breadcrumb primitives (DEC-173 compose-not-extend). PascalCase `Path` suffix avoids APFS case-insensitive collision with the existing lowercase `breadcrumb.jsx`.
3. **Phase 4.2-tiles-3 — Tile cockpit at root (`77571b7`):** Created `src/components/mylane/TilesCockpit.jsx` (158 lines). Modified `src/main.jsx` (pre-paint cockpit bootstrap — tiles is the new default). Modified `src/components/mylane/MyLaneSurface.jsx` (+178/-30): COCKPIT_PICKER_ALLOWLIST constant, force-migration useEffect, tileLeafSelected state, AccountOverlay cockpit toggle gated to allowlist. Tile cockpit became default for everyone; spinner/compass gated to allowlisted users only.
4. **joyCoinCost TDZ fix (`34bc25a`):** Three joy-coin derivation lines moved up in `EventDetailModal.jsx` to precede their consumers. Root cause: Base44 auto-builder commit `cfdcdb9e` (2026-04-22) re-added declarations 75 lines below the original references — latent regression exposed when tile cockpit routed more users through Events. Pattern saved to SuperMemory: Base44 auto-builder commits warrant code review, not blind trust.
5. **Network undefined fix (`ae2d723`):** Optional-chained four unguarded `event.x` reads in `EventDetailModal.jsx` that occurred above the existing `if (!event) return null;` guard. Older defensive-coding gap exposed by tile cockpit routing more users through Events flow. Race condition flagged at Events.jsx call site for future cleanup if silent-fail-to-open becomes confusing.
6. **Phase 4.2-tiles-4 — Per-business folder rendering + uniform navigation (`84a9889`):** Created `src/config/spaceTypes.js` (123 lines) — eight-entry catalog (`profile`, `settings`, `desk`, `finance`, `team`, `kitchen`, `property`, `events`; Profile + Settings flagged universal) with `resolveBusinessSpaces()` helper. TilesCockpit grew to 338 lines (handles five tile-grid modes including owned-business tiles + per-business space tiles). MyLaneSurface +150/-54 (descendedBusinessId, descendedSpaceId state, handleSelectBusiness, handleSelectSpace, handleTileAscend, BusinessSpacePlaceholder). Removed Dev Lab from folder tree (FlaskConical import dropped, dev-lab branch in renderContent removed). DEC-148 overlay pattern retired for tile cockpit users (still active for spinner). DEC-168 lateral switcher pattern retired for tile cockpit users. Per-business spaces all render placeholders for v1; workspace wiring deferred to tiles-5+. **First consumer of `Business.enabled_spaces`.**
7. **Cleanup — Field Service removed from Personal (`2c01950`):** 3 files +14/-14. Removed `field-service` leaf entry from Personal's children in `folderTree.js` + dropped Briefcase import. Removed orphaned `has_field_service_profile` predicate in `folderPredicates.js`. Removed Estimates card-builder block in `HomeFeed.jsx` (was looking up the now-missing field-service space). Field Service workspace component, `WORKSPACE_TYPES.field_service` entry, agent/admin/invite/registry surfaces all preserved as infrastructure for tiles-5+ business-Desk wiring.

**Shipped to Spec-Repo (origin/main):**

8. **Tile cockpit design pivot — Section 5 + 8.13 (`a96ae43`):** Section 5 sequence updated; Phase 4.2-tiles absorbed 4.2b/4.3/4.4/4.5. Section 8.13 added — eleven locked design decisions covering tile primitive shape, Settings universal, category-driven accents preserved, cockpit picker pattern, hybrid-mode breadcrumb, space-type catalog principle, cold-open synthetic root, enabled_spaces unconsumed (until tiles-4), breadcrumb supersedes center-tap descent.
9. **Phase 4.2-tiles-1 shipped (`4598419`):** Section 5 marks 4.2-tiles-1 ✅; Section 8.14 added.
10. **Phase 4.2-tiles-2 shipped (`081882b`):** Section 5 marks 4.2-tiles-2 ✅; Section 8.15 added.
11. **Phase 4.2-tiles-3 shipped (`65ff952`):** Section 5 marks 4.2-tiles-3 ✅; Section 8.16 added — force-migration logic, allowlist gate, default-cockpit bootstrap, accent palette decision.
12. **Phase 4.2-tiles-4 shipped (`8b94ec1`):** Section 5 marks 4.2-tiles-4 ✅; Section 8.17 added — space-type catalog, retired patterns, placeholder strategy.
13. **Field-service-from-Personal cleanup note (`1551f30`):** Section 8.17 follow-up paragraph documenting the cleanup.

**Shipped to private (origin/main):**

14. **Engagements design close (`406154b`):** Three resolved open questions — smart defaults per role, view+action permissions blob with two-party e-sign for change orders, email + in-app notification + indefinite pending. Two architectural flags — two-party-acceptance recurring primitive, bid-request / job-listing upstream workflow. Engagements design now structurally locked + all detail questions resolved.

**Shipped to Base44:**

15. **Engagement entity created.** All fields per spec. Read permission deviation: Base44 doesn't support multi-field OR conditions on read at the schema layer; set to authenticated, with row-level scoping moved into query logic (existing precedent: Recommendation, Debt entities). Pattern saved to SuperMemory: post-Supabase migration, RLS policy `(auth.uid() = initiator_id) OR (auth.uid() = recipient_id)` replaces this workaround.

**Decisions made today:**

- **DEC-185** — Phase 4.2-tiles design pivot. Tiles primary cockpit pattern; spinner preserved as dev-only alternate.
- **DEC-186** — Settings as a universal space (never in enabled_spaces). Profile + Settings render unconditionally for every business.
- **DEC-187** — Category-driven tile accents preserved; no per-business `brand_color` field added in v1.
- **DEC-188** — Cockpit picker dev-allowlist via `COCKPIT_PICKER_ALLOWLIST` (DEC-147 pattern).
- **DEC-189** — Hybrid-mode breadcrumb component (`mode="primary"` for tile cockpit, `mode="adjacent"` for spinner/future).
- **DEC-190** — Space-type catalog principle: enabled_spaces consumers read from a config (`spaceTypes.js`), never inline conditionals.
- **DEC-191** — Uniform navigation pattern: every root tile descends into render layer; DEC-148 overlays and DEC-168 switcher retired for tile cockpit users.
- **DEC-192** — Engagements design fully closed: smart defaults per role, view+action permissions blob, change orders trigger e-sign for both parties, email + in-app notification with indefinite pending.

**Carryover items + flags (parking lot for tiles-5+ planning):**

1. **Tiles-5 next session:** Settings + Profile workspace surfaces + pricing-structure design. Pre-build design conversation about Profile/Settings split-point + pricing-model shape. Pricing field architecture in `spaceTypes.js` (null for now); charging deferred until Stripe integration.
2. **Tiles-7 (queued):** Personal Profile + Settings — architectural symmetry. Adds `enabled_spaces` (or equivalent) field to User entity in Base44. Personal's Profile + Settings spaces. Public/private toggle. Foundation for user reviews. 2-3 sub-builds.
3. **Per-business workspace wiring** for Profile/Desk/Finance/Team — existing renderers take user-scope props that need re-scoping. Field Service specifically requires a business-scoped resolver (`MyLaneDrillView.jsx:53` resolves `fieldServiceProfiles?.[0]`). Meaningfully more work than a simple dispatch.
4. **JoinFieldService welcome-card "Go to desk" button** soft-broken (gracefully degrades to no-op). Fix in tiles-5+ Desk-wiring or as small adjacent cleanup. Same shape as existing `'business'` welcome no-op from Section 8.12.
5. **Engagement scoped-query server function** owed during tiles-5+ area; will retire during Supabase migration in favor of RLS policy.
6. **Phase 5 pre-migration cleanup catalog** — accumulating items; cataloging sweep before migration starts.
7. **Optional-chain harmonization sweep** + **defensive-gap audit** — small consistency/safety passes.
8. **MyLaneSurface size** (1,682 lines) approaching split-worthy; possibly during the queued hook reordering work.
9. **Visual affordance check on breadcrumb segments** — verify click-to-ascend is discoverable in real use.
10. **Reviews infrastructure** for users + businesses (future, tied to tiles-7).
11. **Bari's Estimates surface dark in HomeFeed** until tiles-5 wires per-business Desk. Real-user signal blackout window. Path-walking acceptable.

**Tomorrow's first move:** Phase 4.2-tiles-5 — Settings + Profile workspace surfaces + pricing-structure design conversation. Mycelia drafts the prompt fresh in the next session.

**Posture note for the record:**

Today's arc — six tiles sub-builds, two bug fixes, one design close, one entity creation, one cleanup pass — fit into roughly half a day because the foundation laid in tiles-1 and tiles-2 (small generic primitives) compounded across tiles-3 and tiles-4. The space-type catalog (`spaceTypes.js`) is the third living-feet config in the codebase (alongside `folderTree.js` + `folderPredicates.js`); future Engagements-as-folder additions plug in without refactor. DEC-183 path-walking held — each sub-build shipped, was inspected, and informed the next without back-to-back execution. Two regressions surfaced (joyCoinCost TDZ from a Base44 auto-commit, network-undefined defensive-gap older latent bug) were caught and fixed in flight; the joyCoinCost finding generalized to a Base44 auto-builder pattern saved to SuperMemory. Engagements parallel workstream advanced from "structurally locked, three details open" (yesterday) to "structurally locked, all questions answered, entity built" (today). Phase 4.2-tiles is structurally complete; the remaining tiles work (5+) is workspace wiring per space type, not navigation architecture.

**Ship-it timestamp:** 2026-04-28, end of day. Phase 4.2-tiles structurally complete. Tomorrow opens on tiles-5 (Settings + Profile + pricing).

---

## Session Log — 2026-04-30 (Field Service Phase 1 build sprint — eight commits + paired Base44 schema + five DECs)

**Surface:** Hyphae on Mac mini. Single intense build day compressed what was originally scoped as a multi-week effort. Phase 1 of the Field Service financial workflow shipped end-to-end across community-node + Base44.

**Focus:** Phase 1 Field Service is functionally complete. The estimate-to-CO-to-payment pipeline now carries the full architecture from `FINANCIAL-WORKFLOW-INTENT.md` and `FINANCIAL-WORKFLOW-SPEC.md`: estimate as project spine, signed COs as additive amendments with their own e-sign + recompute math, layered cost tracking via Sub Payment + Client Payment in the universal Log surface, project-level financial header (Contract / Received / Paid Out / Net Cash), and a daily-driver polish bundle that makes the workspace feel finished. Bari-prep window remains open; tomorrow morning's first move is dogfood verification of today's last commit then Estimate Types prompts to support Bari's first real estimate entry.

**Shipped to community-node (origin/main):**

1. **Phase 1 Item 2c — CO math + signing flow + total_budget recompute (`32ccb92`):** Created `signChangeOrder` server function (mirrors `signEstimate` pattern). Added portal token fields to FSChangeOrder (`portal_token`, `portal_link_active`, `sent_for_signature_at`, `recalled_at`). Relaxed FSChangeOrder + FSProject Update RLS to "No restrictions" (DEC-095/DEC-140 pattern — security membrane moves to function level). Per-project sequential CO numbers via `generateCONumber()` (`CO-001`, `CO-002`, …). Lightweight Project Detail / Client Portal CO blocks. **Architectural primitive:** signed CO `amount` is the canonical contribution to FSProject.total_budget; the recompute formula is `original_budget + sum(amount where status='signed')`.

2. **Phase 1 — CO form unification + RQ v5 invalidation fix (`e72e28c`):** Extracted `LineItemsEditor` (typed line items, voice input, qty/unit price/amount math) shared between FSEstimate and FSChangeOrder builders. Extracted `calcTotals` + `CATEGORIES` + helpers into `src/utils/fsLineItems.js`. Added percentage fields to FSChangeOrder (`overhead_profit_pct`, `tax_rate`, `tax_amount`, `other_amount`) so COs share the estimate's math vocabulary. Fixed React Query v5 invalidation bug across 5 sites — bare-array form `invalidateQueries(['key'])` is a silent no-op in v5; must be `invalidateQueries({ queryKey: ['key'] })`.

3. **Phase 1 — Edit-Draft on COs (`ef14ae9`):** New `editingCOId` state, `openEditCOForm` helper, `saveCOMutation` branches between create and update. Edit button only renders for draft COs; locked once status moves into the signing flow (awaiting_signature, signed, accepted, declined, voided).

4. **Phase 1 Items 4 + 5 — Log payment types + Project Detail financial header (`c55504c`):** Log surface gains a type picker — Daily Log (existing) + Sub Payment (new) + Client Payment (new). Sub Payment / Client Payment write FSPayment with the right `direction` + party fields per `FINANCIAL-WORKFLOW-SPEC` §2.6. New `useFSPayments` shared query hook. Project Detail four-metric financial header (Contract / Received / Paid Out / Net Cash) sits above the existing Budget breakdown — same data, daily check-in framing. Existing Payments section becomes view-only with a "Log a payment" handoff to the new Log entry. Financial Ledger Estimated column now iterates signed CO line items (per Item 2c, signed COs amend the contract; the ledger composition needs to reflect that).

5. **Phase 1 — Feature flag wiring fix (`3c218d4`):** Root cause: `MyLaneDrillView.jsx:177` was reading `profile.features` (a key that doesn't exist on the entity; the entity has `features_json`). Fix: extracted `getFeatures(profile)` helper into `src/utils/fsFeatures.js` with `FEATURE_DEFAULTS`. All flags now read consistently from `features_json` per **DEC-194**. Asymmetric failure pattern documented in commit body and DEC: default-off `=== true` flags broke (O&P, Xactimate); default-on `!== false` flags appeared to work — both broken, only the default-off ones surfaced.

6. **Phase 1 — Management Fee separated from O&P + Log scroll-to-top (`db138bf`):** New `management_fee_pct` + `management_fee_amount` fields on FSEstimate + FSChangeOrder. New Settings toggle (defaults off). `calcTotals` extended to accept Management Fee as a 5th argument; backward-compatible. Display order across all five render surfaces: **Subtotal → Management Fee → O&P → Other → Tax → Total** — Management Fee precedes O&P because for GCs (the more common Eugene case) it's the primary line. **DEC-195** ratified: two first-class features, both subtotal-only basis, never stack. Log mount effect added — walks up to closest scrollable ancestor and resets scrollTop=0 (the `.mylane-content-area` scroll position persists across tab switches; "Log a payment" from deep on Project Detail was landing users at the bottom of the Log form).

7. **Phase 1 polish bundle (`148290d`):** Sales Tax toggle (defaults off, gates Tax inputs and renders across Estimate Builder, CO Builder, Estimate Preview, CO list breakdown, Client Portal CO blocks). Extracted `CurrencyInput` component applied to 10 sites (DEC-089 fractal audit — Unit Price + every dollar-amount input the user sees). Estimate Cancel button (mirrors CO form pattern). PDF branding: `index.html` title `Base44 APP` → `LocalLane`, per-print title swaps producing `Estimate-EST-2026-001.pdf` / `ChangeOrder-CO-001.pdf` filenames. CO Delete (drafts, single-step) + Void (signed/accepted, two-step typed VOID confirmation). New `voidChangeOrder` server function mirrors `signChangeOrder` pattern — voided CO status preserved for audit, excluded from `total_budget` recompute (filter `signed | accepted` naturally excludes voided as its own status). Voided CO render: muted gray badge, line-through title and amount, action row replaced with "Voided {date} — {reason}" info line.

8. **Phase 1 — Settings persistence + scroll-to-top after save + format-while-typing (`317950e`):** Root cause of "toggles appear to revert after save": Settings invalidated `['fs-profiles']` after every write, but the actual profile cache lives at `['mylane-profiles-v2', userId]` per DEC-130 — invalidation against an unsubscribed key is a silent no-op in React Query. New `invalidateFSProfiles(queryClient, userId)` helper applied to 10 invalidation sites — **DEC-196**. Bug had been latent since the original Settings was written; only became visible under rapid-iteration testing because mylane-profiles-v2 has a 5-minute `staleTime` that masked the issue when users left enough time between save and re-visit. New `scrollToTopOf(startEl)` helper extracted into `src/utils/scrollToTop.js`; FieldServiceLog refactored to use it (Living Feet — second consumer earned the extraction). CurrencyInput format-while-typing with cursor management via the digit-and-dot-count-before-cursor invariant — count digit/dot chars before the cursor in the raw input, place cursor after the same count of digit/dots in the reformatted output.

**Shipped to Base44 (paired with code commits):**

- **FSPayment** — `direction`, `party_type`, `party_name`, `party_id`, `method` (merged enum), `reference`, `notes` (Phase 1 Item 4 schema).
- **FSProject** — `original_budget` documented as immutable, `total_budget` documented as derived; Update RLS relaxed to "No restrictions" (DEC-140 pattern); Bari's Holman project backfilled `original_budget = $121,657.57`.
- **FSChangeOrder** — status enum extended with `awaiting_signature`, `signed`, `voided`; new fields `signed_at`, `signature_data`, `amount`, `voided_at`, `voided_reason`; portal fields `portal_token`, `portal_link_active`, `sent_for_signature_at`, `recalled_at`; Update RLS relaxed; signing flow + void flow server functions published.
- **FSEstimate** — `management_fee_amount` added (`management_fee_pct` already existed in schema).
- **FSChangeOrder** percentage fields — `management_fee_pct`, `management_fee_amount`, `overhead_profit_pct`, `tax_rate`, `tax_amount`, `other_amount`.

**Decisions ratified today (DEC-193 through DEC-197 — see `Spec-Repo/platform/DECISIONS.md`):**

- **DEC-193** — FSChangeOrder `total` vs `amount` distinction. `amount` is canonical for `total_budget` recompute; `total` is the line-items working/display number. The two diverge when modifiers (Mgmt Fee, O&P, Tax, Other) land on a CO; conflating them would silently under-bill the parent project.
- **DEC-194** — `features_json` is the canonical FieldServiceProfile feature flag store. All reads through `getFeatures(profile)`; top-level legacy boolean fields deprecated. Asymmetric failure pattern (default-off broken, default-on appearing-to-work) documented for future flag work.
- **DEC-195** — Management Fee distinct from O&P. Two first-class features, both subtotal-only basis, never stack on each other or on Tax. Display order locked across all surfaces.
- **DEC-196** — Cache invalidation must target the subscriber's actual queryKey. RQ v5 invalidates against unsubscribed keys are silent no-ops; helper-per-canonical-cache pattern (`invalidateFSProfiles`) prevents drift.
- **DEC-197** — Fee/insurance toggles default off. Opt-in only; no industry-preset auto-defaults; no location-based heuristics. Standard infrastructure flags (Permits, Subs, Payments, Timeline) default on because they're visibility-only.

**Operational notes (decisions made today that didn't rise to DEC-level):**

- **CO signing flow uses clipboard, not email.** Already covered by DEC-096 (Request Signature Is One Action) — same pattern as FSEstimate. E-sign hardening with email magic link auth deferred until real risk surfaces (bigger CO amounts, less-known clients, or first dispute). No new DEC.
- **Voided CO render pattern.** Detail-level: muted gray "Voided" badge, line-through title and amount, action row replaced with `Voided {date} — {reason}` info line. Filter `signed | accepted` naturally excludes voided records — no filter changes needed anywhere. Operational, not architectural.
- **Living Feet (DEC-146) applied twice today.** `CurrencyInput` extracted on its second consumer (was inline in 10+ places before). `scrollToTopOf` extracted on its second consumer (was inlined in FieldServiceLog mount effect from `db138bf`). Same shape both times: a small primitive earns its extraction once it has more than one consumer.

**Things deferred / staged but not shipped today:**

- **E-sign hardening (email magic link auth).** Deferred per Doron until a real risk surfaces. Current portal-token + clipboard model is the right shape for now; harden when scale or stakes change.
- **Base44 schema cleanup of legacy top-level feature flag fields.** Paired prompt staged at `community-node/base44-prompts/PHASE-1-DEPRECATE-LEGACY-FEATURE-FLAGS.md`. Doron runs when ready; not blocking anything.
- **Estimate Types expansion** (`fixed_price` / `flat_fee` / `time_and_materials`). Base44 prompt + Hyphae prompt drafted, ready to ship in a fresh session tomorrow morning. Adds `estimate_type` enum + 4 supporting fields to both FSEstimate and FSChangeOrder. Supports the three first-class billing models from `FINANCIAL-WORKFLOW-INTENT.md` §2 (transparency-as-architecture).
- **Permits library enhancement** — saved per-profile portal links with last-used surfacing. Phase 2 work; seedling.
- **`management_fees_enabled` flag cleanup.** Confirmed dead in `features_json` (now correctly resurrected for the Management Fee feature). No follow-up needed.
- **`['fs-profile']` (singular) cache audit.** Separate narrower cache used by FieldServiceHome's `guide_dismissed` toggle and one Settings invitee handler. Not part of `invalidateFSProfiles` helper. Worth a separate pass when convenient; not blocking.

**Pending human verification (dogfood test window 2026-05-01 morning):**

- Commit `317950e` end-to-end — Settings persistence across all 8 toggles (Permits, Subs, Management Fee, O&P, Xactimate, Sales Tax, Payments, Timeline), scroll-to-top after save lands the toast in view, format-while-typing on every CurrencyInput site (Unit Price, Other Amount, Hourly Rate, Total Budget, Sub/Client Payment, Material unit cost, Labor rate, CO Other Amount).
- Apply paired Base44 prompt `community-node/base44-prompts/PHASE-1-CO-VOID-STATUS.md` if not yet applied. CO Void requires the schema fields (`voided` enum value, `voided_at`, `voided_reason`) to be live in the Base44 dashboard.

**Tomorrow's first move:**

Dogfood verification of `317950e` (above), then Estimate Types prompts (Base44 schema + Hyphae build), then Bari's first real estimate entry against the new Phase 1 surface. Parallel: Dan Sikes logo variants via Gemini (separate workstream, doesn't block).

**Carryover items + flags (still pending across the broader project):**

- Phase 4.2-tiles-5 still next on the tiles workstream (Settings + Profile workspace surfaces + pricing-structure design conversation). Today was Phase 1 FS, not Phase 4 tiles — the two workstreams ran in parallel.
- Base44 publish blocker workaround documented (Kathy at Base44 ran a checkpoint reset to clear it). Today's Base44 schema work + server functions published cleanly under that workaround. Escalation request `95a004a0` remains open as durable fix.
- `community-node/docs/migration-research.md` cleanup pending (since 2026-04-25).
- DECISIONS.md drift between Spec-Repo and community-node — pre-existing structural divergence; queued for May 4 Sharpening.
- NODE-LAB-MODEL.md phase-review note for Field Service crossing production-shaped — flag persists.

**Posture note for the record:**

Today compressed what was originally scoped as a multi-week effort into one intense build day. Eight commits in community-node, five new DECs, one paired Base44 schema arc covering FSPayment + FSProject + FSChangeOrder + FSEstimate. Two of the eight commits were diagnostic-led: `3c218d4` chased a feature flag bug to a typo'd key name three layers deep (`profile.features` vs `profile.features_json`) — the asymmetric failure pattern is now a saved lesson; `317950e` chased a Settings persistence bug to an invalidation queryKey that hadn't matched a live subscriber since DEC-130 collapsed the profile queries — invalidation against an unsubscribed key is a silent no-op, masked by 5-min staleTime, surfaced only under fast iteration. Both bugs had been latent for weeks. Both ratified into DECs (DEC-194 and DEC-196) so the next equivalent bug is structurally precluded rather than just fixed.

The CO Void path specifically deserves a note: the two-step typed-VOID confirmation pattern came from the existing workspace-delete dialog (FieldServiceSettings), preserving consistency on destructive-action friction; the void render (line-through + muted badge + replaced action row) came from the spec's "preserve as legal artifact, mark as undone" framing in FINANCIAL-WORKFLOW-SPEC §2.4. The fact that the existing `signed | accepted` filter naturally excluded voided records (because `voided` is its own status enum value) meant zero filter changes anywhere downstream — a clean architectural payoff from naming the new state precisely.

The CurrencyInput's format-while-typing algorithm uses one invariant — count of digit-and-dot chars before the cursor in the raw input — to manage cursor position across reformat. That count is invariant under thousands-separator and dollar-sign insertion, which is what makes the cursor stay where the user expects when typing in the middle of a formatted number. Built by hand in ~40 lines + glue rather than adding a `react-number-format` dep; tradeoff captured in the commit body.

Field Service is now production-shaped at the architectural level, not just at the score level. Bari's day-to-day workflow is supported end-to-end. Tomorrow's work moves from "build the architecture" to "use it on a real estimate."

**Ship-it timestamp:** 2026-04-30, end of day. Phase 1 Field Service functionally complete, pending dogfood test of `317950e`. Tomorrow opens on dogfood + Estimate Types prompts + Bari's first real estimate.

---

## Session Log — 2026-05-01 (PDF saga: print-stylesheet fix attempt → printNode helper after iframe-context miss)

**Surface:** Hyphae on Mac mini. Single dogfood-driven fix arc that revealed a structural lesson about verification surface vs production surface.

**Focus:** Phase 1 functionally complete (yesterday); Doron-as-Bari attempted to generate the Patricia Heath estimate PDF (EST-2026-005, ~30 line items, ADU build at 88154 5th St Veneta, total ~$170K) and hit two bugs: page clipping (~14 line items rendered, rest cut off, page indicator showing 1/1) and wrong filename (`LocalLane___Base44.pdf` instead of `Estimate-EST-2026-005.pdf`). The fix attempts crossed two surfaces (synthetic localhost vs Base44 Act-As-User editor preview iframe) before landing.

**Shipped to community-node (origin/main):**

1. **VoiceInput import regression fix (`83faaba`):** Restored `VoiceInput` import in `FieldServiceProjects` after a prior refactor (`e72e28c`) dropped it. Latent regression that surfaced once the change-order form opened in Project Detail.
2. **First PDF fix attempt (`ca7e9df`):** Closed the page-clipping by replacing the `position: absolute` + `visibility: hidden` print-area pattern with a `:has()`-based `@media print` selector that hides everything except the print area's ancestor chain and descendants. Added `overflow: visible` override on print to defeat the line-item table wrappers' `overflow-x-auto` (which the spec resolves to `overflow: auto` on both axes, clipping tall tables in print). Added filename via `document.title` swap before `window.print()`. Same one-line fix pattern applied to `FieldServiceDocuments.jsx` (.doc-print-area). Verified the `:has()` selector logic against a synthetic DOM that mirrored the real ancestor chain — siblings hidden, ancestors preserved, print area + all 30 line-item descendants stayed visible. **Filename swap confirmed via runtime test:** at the moment `window.print()` fires, `document.title === "Estimate-EST-2026-005"`. Shipped, closed the bug — in the synthetic DOM. Doron tested in Base44's Act-As-User editor preview surface and the bug was unchanged: still clipping at ~14 line items, still 1/1 page indicator.
3. **printNode helper (`e91b696`):** Diagnosis of why the first fix failed in production: Base44's editor renders the published app inside a fixed-height iframe; `window.print()` from inside that iframe targets the parent document, and Chrome's print pipeline clips our content to the iframe element's height regardless of any inner @media print rules. No CSS in our app can reach across that boundary. **Fix shape:** route all "print this DOM subtree" surfaces through a fresh hidden iframe with copied stylesheets and `iframe.contentWindow.print()` — that print call targets only the inner document, no parent chrome, full pagination. Extracted as `src/utils/printNode.js` (Living Feet — same one-helper used by FieldServiceEstimates and FieldServiceDocuments, future surfaces drop in). Verified via runtime test that parent `window.print()` is never called, inner iframe `contentWindow.print()` is, all 30 line items + totals + signature are present in the iframe doc, title is set on the inner doc.
4. **CLAUDE.md lesson (`8fec399`):** Two pitfall entries added — synthetic-DOM-only verification is not production verification when the surface is non-standard (iframe-wrapped, embedded, sandboxed); printNode helper is now the canonical path for "print this DOM subtree" — use it instead of `window.print()` so the print pipeline targets a fresh iframe document and survives any parent-frame embedding.

**Decisions ratified today (formalized into DEC-198 on 2026-05-04):**

- The synthetic-DOM-verification-is-not-production-verification rule for non-standard surfaces.
- printNode as the canonical print mechanism in iframe-wrapped contexts.

**The structural lesson:**

Yesterday's Phase 1 felt complete because it WAS complete in standalone localhost — that's where Hyphae verifies, that's where the test surface is reachable. Doron's only viable test surface is Base44's Act-As-User editor preview because he doesn't have Bari's account credentials and can't test on the live published URL with Bari's data. The verification gap was structural, not procedural: the fix was correctly verified against a synthetic DOM, but the synthetic DOM was the wrong surface. The right verification path was always going to require Doron's eyeballs on Base44's preview because that's where the production surface lives for him.

The printNode pattern's payoff extends beyond this fix. The hidden-iframe-with-copied-stylesheets approach handles every iframe-wrapped host we'll encounter — Base44 editor preview now, future embedded widgets, the eventual Supabase + Vercel sandbox during the Phase 6 migration window. One helper, one pattern, every surface.

The triple-title-set for the filename came on 2026-05-03 (separate session); see that session's log for the second half of this saga.

**Ship-it timestamp:** 2026-05-01, end of day. Three commits to community-node + one CLAUDE.md docs commit. Doron tested printNode on his own estimate (locallane.app live) and confirmed all-pages render + correct filename. The Base44 Act-As-User preview filename quirk surfaced in Doron's followup testing — handed off to the next session.

---

## Session Log — 2026-05-03 (Bug bundle: log rollup, tab nav reset, PDF filename triple-set, required-field UX audit)

**Surface:** Hyphae on Mac mini. Doron-as-Bari and Doron-as-Dan dogfooding surfaced four independent bugs across the dogfood loop; Hyphae closed each in a focused investigation pass before fixing.

**Focus:** Three independent bugs from dogfooding fixed in one bundled commit, plus a follow-up required-field UX audit triggered by a Base44 schema error leaking to the user. No shared root cause across the bundle; bundled because each was bounded.

**Shipped to community-node (origin/main):**

1. **Log rollup invalidation, tab nav reset, PDF filename triple-set (`cb26d4e`):** Three independent fixes:
   - **Log rollup query-key gap.** FSLog mutation invalidated `fs-materials-all` and `fs-labor-all` (the all-* keys backing the project list view) but not the per-project keys `fs-project-materials` / `fs-project-labor` / `fs-project-photos` that the project DETAIL view's `projectSpent` rollup subscribes to (FieldServiceProjects.jsx:352, 364). Per-project keys never marked stale; user saw old totals until React Query's 5-min default `staleTime` (DEC-130) expired or the view fully unmounted. Symptom "first save updated, second didn't, eventually caught up" was a coincidence — both saves were equally invalidation-incomplete; fresh data only on `staleTime` expiry. Closed by adding the per-project keys to the FSLog invalidation list.
   - **Tab nav tap-on-active reset.** `MyLaneDrillView` is the platform's single workspace tab nav (lines 243–264, click handler line 252); each workspace component holds its own internal `view` state. Tapping a tab the user was already on was a state no-op leaving the inner component parked in detail/form/edit views. Fix at the tab-nav layer: `tabResetKey` integer that increments on tap-on-active and threads into the rendered `TabComponent`'s `key` prop, force-remounting the inner component so its internal `view` state resets to initial. Living Feet — one change, every workspace inherits the behavior.
   - **PDF filename triple-set in iframe context.** Yesterday's `printNode` shipped page-clipping fix but the PDF saved as `LocalLane___Base44.pdf` instead of `Estimate-EST-2026-005.pdf` in Base44's Act-As-User preview. Diagnosis: Chrome's filename source in deep-nested iframes (Base44 top → app preview iframe → printNode iframe) falls back to a parent-frame title in some Chrome versions. Belt-and-suspenders fix sets the title in three reachable places: iframe `<title>` tag (already correct), iframe `document.title` via JS after `document.close()` (covers parser-timing edge cases), and the parent app's `document.title` swapped for the print duration with restoration on a 2-second delay. Cross-origin Base44 top-level document remains unreachable; if Chrome reads that, only `window.open()` would fix it.
2. **CLAUDE.md seedlings (`60c72cd`):** Three pitfall entries — printNode triple-title-set rationale (so a future maintainer doesn't "simplify" away the parent title swap and re-introduce the iframe-context filename bug); list/detail query-key pairs travel together for invalidation (the most reusable lesson — will bite again whenever a list query is split from a per-id detail query); tab nav tap-on-active reset pattern (so a future workspace doesn't accidentally rely on tap-on-active being a no-op).
3. **Required-field UX audit + fixes (`bdd90e4`):** Triggered separately when Doron hit a raw Base44 schema error (`Error in field tasks_completed: Input should be a valid string`) on Daily Log's empty Work Completed textarea. The field is required at the FSDailyLog entity level but the UI didn't mark it with `*` and didn't validate before submit, so the schema rejection surfaced as a developer-style toast. Audit across all Field Service forms (Daily Log, Sub Payment, Client Payment, Estimate, Document Template, Document, Permit Inspection, Project, Change Order, ClientSelector, People) found six fields across five forms with the same gap shape. Closed every gap found in one pass:
   - **Daily Log** `tasks_completed`: added `*` to the "Work Completed" section header (the section header IS the label for this lone-field section); added validation guard for `logType === 'daily'` with toast `Please describe the work completed`.
   - **Estimate** `title`: `*` already on label (good); added `handleSave(status, opts)` wrapper that toasts `Please enter an estimate title` before invoking `saveMutation`. Both Save Draft and Save & Copy Link route through it.
   - **Document Template** `title` + `content`: added `*` to both labels; added `handleSave` guards toasting `Please enter a template title` and `Please add template content`.
   - **Permit Inspection** `type`: added `*` to label; `addInspection` mutationFn throws `Inspection type is required` up front, existing onError toasts it.
   - **Change Order** `title`: `*` already on label (good); `saveCOMutation` mutationFn throws `Please enter a change order title` up front.
4. **CLAUDE.md canonical asterisk pattern (`a0c8a56`):** Documents the canonical pattern (literal `*` in `LABEL_CLASS` label, client-side guard with human message before any Base44 call, save-button `disabled` as defense in depth not a substitute), the wizard-shape exception (multi-step gating IS the signal, no asterisk needed), and the explicit decline of a shared `<RequiredField>` wrapper — forms differ enough (conditional fields, wizards, multi-mode submit paths) that the inline pattern is short enough to copy without abstraction overhead. Revisit only if a single form's validation list exceeds ~6 fields.

**Decisions ratified today (formalized into DEC-199 + DEC-200 on 2026-05-04):**

- List/detail query-key invalidation pairs travel together (DEC-199).
- Required-field UX standard with asterisk + client-side toast, no schema errors leak to user (DEC-200).
- printNode triple-title-set rationale folded into DEC-198.

**Audit findings beyond the closed gaps (carried forward as follow-ups):**

- **Estimate `saveMutation` bare-array `invalidateQueries(['fs-estimates', ...])`** at FieldServiceEstimates.jsx:629 — silent no-op in React Query v5 per DEC-196. After saving a new estimate, the list query may not refresh. Same root-cause family as the log rollup bug. Flagged for an Estimate invalidation sweep.
- **FSChangeOrder per-project query key `['fs-change-orders', selectedProject?.id]`** may not be invalidated by all CO mutation paths. Same sweep candidate.
- **Permit edit/inspection labels** use `text-xs text-muted-foreground/70` instead of `LABEL_CLASS` — visual inconsistency, not a required-field gap (underlying selects have valid defaults). Standardize when next touching the file.
- **FieldServiceReport.jsx still uses direct `window.print()`** — low-risk surface (its own tab, not Act-As preview) but should migrate to printNode for consistency when next touched.

**Posture note for the record:**

Today's arc — three independent bugs in `cb26d4e`, then a separate audit + fix in `bdd90e4` — fit into roughly half a day because each investigation was scoped tight before fixing. The dogfood loop's bug-find-fix-verify cadence is now showing its compounding value: each round closes a class of bugs (query-key drift, navigation no-ops, schema-error leakage), not just the single instance Doron hit. The required-field audit specifically would have been at least three separate dogfood reports if not surfaced as a sweep. The `<RequiredField>` decline is the right call for now — abstraction overhead doesn't pay off until the inline pattern repeats six times in one form, which hasn't happened.

The dogfood lesson today is structural: bugs that surface during real workflow (not synthetic test, not feature build) are reliably a small number of structural shapes. Yesterday's lesson was "synthetic verification ≠ production verification"; today's lesson is "list/detail query-key pairs travel together." Both are now codified as DECs (DEC-198, DEC-199) and CLAUDE.md notes so the patterns don't recur.

**Ship-it timestamp:** 2026-05-03, end of day. Four commits to community-node — three fixes + one CLAUDE.md docs. Doron's verification of the bundle landed on 2026-05-04.

---

## Session Log — 2026-05-04 (Verification + Stewardship Space spec capture + ship-it docs)

**Surface:** Mycelia in Claude.ai chat (strategic) + Hyphae on Mac mini (this commit).

**Focus:** Doron verified all May 1–3 fixes in Base44 Act-As-User preview and confirmed Phase 1 dogfood-complete. Strategic conversation between Doron and Mycelia produced the Stewardship Space spec — a structural principle that affects pricing, agent architecture, geographic strategy, and the platform's long-term shape. This ship-it commit catches all session-of-record documents up to the May 1–3 work and lands the Stewardship spec in the canonical Spec-Repo location.

**Verifications confirmed by Doron:**

- **Tab nav tap-on-active reset** — works as expected. Tapping the Projects tab while in a project detail view returns to the project list.
- **Log rollup updates immediately on save** — previously blocked by the required-field UX bug; works after the May 3 fixes landed. Two log entries in quick succession against a project both update the detail view "Spent" rollup immediately, no manual refresh needed.
- **Required-field UX shows the right toasts** — Doron tried each of the previously-broken forms (Daily Log empty Work Completed, Estimate empty Title, Change Order empty Title) and got human-readable toasts instead of Base44 schema errors.
- **PDF filename works correctly on the live surface** — Doron's own estimates on locallane.app save with the right filename (`Estimate-EST-2026-XXX.pdf`). The remaining filename quirk is in deep iframe nesting in Base44's Act-As-User preview specifically — a debug-surface artifact, not a user-facing bug.
- **Bari's Patricia Heath estimate (EST-2026-005)** — entered, generates correct multi-page PDF (all ~30 line items + management fee + totals + signature blocks), ready for Bari's pre-send cleanup.

**Strategic capture:**

The Stewardship Space spec landed in `Spec-Repo/spaces/stewardship/STEWARDSHIP-SPACE.md` as a first-class space spec alongside Field Service, Recess, Harvest Network, Creative Alliance, Gathering Circle. Cross-referenced from PROJECT-BRAIN, PRICING-ECONOMICS, and the TCA spec. Three operational tensions named for future PRICING-ECONOMICS sessions: (1) pricing-as-bottleneck (cannot be Doron-negotiated business by business; must be rule-based or steward-mediated within structural bounds); (2) transparency between businesses (Chamber of Commerce moment — perceived fairness depends on the rules being public); (3) incentive risk on percentage-of-dynamic-pricing (steward earning a cut of what their network pays creates a structural incentive to advocate for higher prices, mitigated by gardener meetings + aggregate platform-layer visibility). Eight open questions queued for the next focused PRICING-ECONOMICS session and the eventual Stewardship Space build phase.

**Decisions ratified today:**

- **DEC-198** — `printNode` helper as canonical print mechanism in iframe-wrapped surfaces. Slim public-repo pointer + full context in this ship-it commit per DEC-030 split rationale.
- **DEC-199** — List/detail query-key invalidation pairs travel together. Companion to DEC-196: DEC-196 is the right form of invalidation; DEC-199 is every key the subscribers use.
- **DEC-200** — Required-field UX standard. Six fields fixed across five forms; canonical pattern documented in CLAUDE.md; shared validation wrapper explicitly declined.
- **DEC-201** — Stewardship Space as strategic principle. Future workspace, post-Phase 6 build window. Pre-migration the role runs informally with Doron-as-steward serving Bari and Dan.

**Shipped to Spec-Repo (this commit):**

1. `Spec-Repo/spaces/stewardship/STEWARDSHIP-SPACE.md` — new file, full Stewardship spec.
2. `Spec-Repo/platform/DECISIONS.md` — DEC-198 through DEC-201 appended.
3. `Spec-Repo/context/ACTIVE-CONTEXT.md` — refreshed to reflect Phase 1 dogfood-verified + May 1–3 commit history + DEC-198 through DEC-201 + Stewardship spec capture.
4. `Spec-Repo/context/SESSION-LOG.md` — three new session entries (2026-05-01, 2026-05-03, 2026-05-04).
5. `Spec-Repo/platform/STATUS-TRACKER.md` — session log row added for the May 1–4 window.
6. `Spec-Repo/platform/checklists/LAUNCH-CHECKLIST.md` — shipped items appended for the May 1–3 commit window.

**Mirrored to community-node (this commit):**

1. `community-node/context/ACTIVE-CONTEXT.md` — synced from Spec-Repo canonical.
2. `community-node/context/SESSION-LOG.md` — synced from Spec-Repo canonical.
3. `community-node/DECISIONS.md` — DEC-198 through DEC-201 appended (note: the community-node mirror has known drift between DEC-148 and DEC-198; the gap is pre-existing and outside this ship-it scope).
4. `community-node/STATUS-TRACKER.md` — session log row added.
5. `community-node/checklists/LAUNCH-CHECKLIST.md` — shipped items appended.

**Open follow-ups carried forward (not closed in this commit):**

1. **Estimate invalidation sweep** — covers FieldServiceEstimates `saveMutation` bare-array `invalidateQueries` (DEC-196 family) + per-project FSChangeOrder key gap (DEC-199 family). Same root-cause family, one focused sweep.
2. **Permit edit/inspection labels** — visual consistency pass to convert `text-xs text-muted-foreground/70` to `LABEL_CLASS`.
3. **FieldServiceReport.jsx printNode migration** — low risk, do when next touched.
4. **Documents UX session** — Doron's question about whether Documents should require a client.
5. **community-node/DECISIONS.md drift** between DEC-148 and DEC-198 — pre-existing, outside this ship-it.

**Posture note for the record:**

The May 1–3 window is the first sustained dogfood-driven fix arc since Phase 1 functionally closed. Each round produced a structural lesson (DEC-198, DEC-199, DEC-200), not just a fix. The cadence — dogfood → bug → focused investigation → fix → CLAUDE.md note → DEC formalization → next dogfood — is the loop the platform was built to run. Stewardship Space (DEC-201) names what Doron is already doing in miniature with Bari and Dan; capturing the spec now means when the role scales beyond Doron's personal attention, the architectural decisions are already made.

**Ship-it timestamp:** 2026-05-04, end of day. Phase 1 dogfood-verified end-to-end. Tomorrow's first move: Estimate invalidation sweep (DEC-199 + DEC-196 family).

---

## Session Log — 2026-05-04 (evening) (Platform-wide invalidation sweep + Two-World Architecture + Nursery Model spec)

**Surface:** Hyphae on Mac mini (sweep); Mycelia in Claude.ai chat (strategic conversations).

**Focus:** Single coherent evening arc — a platform-wide query-invalidation audit closed Doron's long-standing dogfood complaints about "lots of places need a refresh after creation," and two extended strategic conversations crystallized the foundational Two-World Architecture principle and the Nursery Model spec. The morning's Stewardship Space spec and the evening's Nursery Model are now companion specs resting on the same foundational principle.

**Shipped to community-node (origin/main):**

1. **Platform-wide invalidation sweep (`60ebb11`):** Audit cross-referenced every `useMutation` in the codebase against every `useQuery` subscriber. Two trap families fixed in one sweep — (a) **bare-array form** — 56 calls across 21 files using `invalidateQueries(['key'])` (silent no-op in React Query v5 per DEC-196). All converted to object form `invalidateQueries({ queryKey: ['key'] })`. Touches FS, admin, dashboard, team, finance, mealprep, propertymgmt, ClientPortal, FrequencyStation, Recommend. (b) **Coverage gap** — six FS mutation surfaces missing per-id detail keys their subscribers depended on. FSEstimate (8 mutation sites) was invalidating only the list key; added per-client + per-estimate + per-project bare-prefix keys. FSClient detail-view update was missing list invalidation. FSProject CRUD (4 sites) + CO sign/void (2 sites) + estimate convert-to-project all missing per-id detail and per-client keys. FSPayment write missing dashboard `fs-payments-all`. FSDailyLog/Material/Labor/Photo write missing timeline-view + client-portal subscribers. Most egregious bug restored: `Recommend.jsx` had 12 silent invalidations — every Nod/Vouch/Recommendation save was a silent no-op until this commit.
2. **CLAUDE.md sub-lessons (`e7bd500`):** Three sub-rules extending the existing DEC-199 entry — audit cadence (when adding a new useQuery, grep every useMutation that writes the entity); list-vs-detail asymmetry (list mutations usually skip detail invalidations; detail mutations almost always need to invalidate the list too — most "didn't refresh" reports come from this direction); bare-prefix invalidation pattern (`['fs-X']` matches all `['fs-X', anyId]` subscribers — use when the mutation handler doesn't have easy access to a specific id).

**Shipped to Spec-Repo (this commit):**

3. **`spaces/nursery/NURSERY-MODEL.md`** — new file, full Nursery Model spec. Companion to `spaces/stewardship/STEWARDSHIP-SPACE.md` (committed earlier today at `e0e89ca`).
4. **`context/PROJECT-BRAIN.md`** — Two-World Architecture section added as a top-level foundational principle, placed immediately after Circulation Over Extraction (the natural sibling — both name foundational economic shape; DEC-203 references the placement). The principle is theologically grounded ("as within so without," kingdom-of-God-within-you, mustard seed parable, many-rooms image) and structurally precise. Names what was implicit across multiple earlier decisions but never formalized at the foundational level.
5. **`platform/DECISIONS.md`** — DEC-202 through DEC-205 appended.
6. **`context/ACTIVE-CONTEXT.md`** — refreshed to reflect platform-wide refresh-on-save restored + two new strategic principles captured.
7. **`context/SESSION-LOG.md`** — this entry.
8. **`platform/STATUS-TRACKER.md`** — Session Log row appended; Field Service node status reflects the invalidation sweep.
9. **`platform/checklists/LAUNCH-CHECKLIST.md`** — invalidation sweep items checked off.

**Mirrored to community-node (this commit):**

10. **`context/PROJECT-BRAIN.md`** — synced from Spec-Repo canonical (full overwrite, includes the Two-World Architecture addition).
11. **`context/ACTIVE-CONTEXT.md`** — synced.
12. **`context/SESSION-LOG.md`** — synced.
13. **`DECISIONS.md`** — DEC-202 through DEC-205 appended (mirror gap between DEC-148 and DEC-198 still pre-existing; the five most-recent DECs (198–205) are now present in the mirror).

**Strategic conversations that produced the new specs:**

- **Two-World Architecture conversation:** surfaced explicitly while working through Gina's emerging charcuterie business — specifically, how Mycelia LLC could support Gina structurally without either (a) imposing internal trust-based logic on external counterparties (insurance, licensing, venue contracts) or (b) importing the world's adversarial logic into the Mycelia-Gina relationship (equity grabs, defensive lawyering, fee extraction). Naming the principle resolved the design question and unlocked the Nursery Model. The principle is theologically grounded in "as within so without" (Hermetic correspondence) and "the kingdom of God is within you" (Luke 17:21), with the mustard seed parable and Christ's "many rooms" image as the architectural picture. Captured at DEC-203 + PROJECT-BRAIN.md.

- **Nursery Model conversation:** prompted by Doron mentioning three wedding inquiries to Gina from her Instagram and asking about pricing strategy. Crystallized through extended strategic exchanges. Mycelia LLC operates as a sovereign nursery for life-aligned businesses; transplant rather than exit is the goal; market-rate fee allocations rather than gifts; contractors not employees; explicit capital allocation budget. The church kitchen possibility (TCA's prospective home location has a large commercial kitchen) is a near-term parallel track — if licensable, it gives the church real income, gives nursery participants affordable kitchen access, and embodies the "teach a man to fish" principle Doron holds. Captured at DEC-204 + DEC-205 + NURSERY-MODEL.md.

**Decisions ratified today (evening):**

- **DEC-202** — React Query invalidation sweep complete; bare-array form canonically banned; list/detail key pairs travel together as standard.
- **DEC-203** — Two-World Architecture as foundational principle. Inside the organism: plain-language understanding, fee allocations, sovereignty-preserved. Outside: legal contracts, insurance, regulatory compliance. Bridge: honest translation, no confusion of layers.
- **DEC-204** — Nursery Model strategic principle. Mycelia LLC as sovereign nursery; transplant rather than exit; market-rate everything; contractors not employees; sovereignty preserved by structural design.
- **DEC-205** — Mycelia as its own bank for nursery participants. Capital advances from explicit annual budget; recovered via revenue-percentage agreements; downside risk borne by Mycelia per nursery agreement.

**Items needing Doron's verification in Base44 Act-As-User preview (from the invalidation sweep):**

- Estimates create/edit/send-for-signature → confirm immediate refresh, no manual reload.
- Client edit from detail view → confirm Clients tab list shows changes without reload.
- Change Order sign/void → confirm `total_budget` recomputes everywhere displayed.
- Convert estimate to project → confirm both surfaces update.
- Payment logging → confirm dashboard Net Cash + Project Detail Paid Out both update immediately.
- Recommendations (Recommend.jsx) → confirm Nod/Vouch badges appear without reload (longest-standing silent bug — 12 invalidations in one file).
- Frequency Station → confirm submitted seed appears in My Seeds without reload.
- Admin Business edits → confirm list updates without reload.

**Open follow-ups carried forward (not closed in this commit):**

1. **Shared invalidation helpers** (`src/utils/fsInvalidations.js` with `invalidateEstimates`, `invalidateProjects`, `invalidateLogs`) — strong Living Feet candidate; four-key set repeats 8x at FSEstimate alone. Refactor commits and bug-fix commits should be separate.
2. **Query-key naming drift** — three inconsistencies worth standardizing: profile-scoped vs bare key forms; `['fs-payments', projectId]` vs `['fs-payments-all']` naming inconsistency; three names for "photos for one project" (`fs-client-photos`, `fs-project-photos`, `fs-timeline-photos`). Document for now, restructure later.
3. **Estimate Types expansion** (Base44 + Hyphae prompts queued) — `fixed_price` / `flat_fee` / `time_and_materials` enum + 4 supporting fields.
4. **Insurance toggle as %** — held for Doron thinking.
5. **Hourly rate verification** — confirm FSDailyLog labor rate reads from the right setting.
6. **PDF formatting polish** — dedicated session.
7. **Documents UX session** — Doron's question about whether Documents should require a client.
8. **Log → Project surface architecture with line-item attribution** — Phase 2 milestone.
9. **Dan Sikes logo Gemini variants** — separate workstream.
10. **`FieldServiceReport.jsx` printNode migration** — low risk; do when next touched.
11. **Permit edit/inspection labels** — convert `text-xs text-muted-foreground/70` to `LABEL_CLASS` for visual consistency.
12. **community-node DECISIONS.md drift** between DEC-148 and DEC-198 — pre-existing.

**Posture note for the record:**

Today (2026-05-04) was a structural day — the invalidation sweep closed a class of long-running bugs that touched nearly every surface (Frequency, Recommend, Admin, Estimates, Projects, Documents, Permits all had silent invalidations); the morning's Stewardship Space and the evening's Nursery Model named two structural roles that were happening informally; and the Two-World Architecture principle that landed in the evening surfaced after the Nursery work made it impossible to ignore. The architectural picture is now: a foundational principle (Two-World), two role-specific spaces resting on it (Stewardship at the platform-support layer, Nursery at the business-formation layer), and explicit capital allocation discipline (DEC-205) for the bank-and-investor function Mycelia LLC takes on with nursery participants. The "as within so without" framing names what every other architectural decision has been groping toward.

**Ship-it timestamp:** 2026-05-04, end of day (evening). Phase 1 dogfood-verified + invalidation sweep complete. Two new strategic principles captured. Tomorrow's first move: spot-check the eight invalidation-sweep verification items in Base44 Act-As-User preview, then return to the open queue (Estimate Types, Insurance toggle thinking, etc.).

---

## Session Log — 2026-05-07 (Bari-focused dogfood loop + empty-field derivation discipline + Phase 2 architectural investigation)

**Surface:** Hyphae on Mac mini (build commits across the day) + a parallel Hyphae session on Mac mini (Phase 2 architectural investigation, no code shipped). Mycelia in Claude.ai chat for strategic ordering, prompt drafting, and ship-it.

**Focus:** A heavy Bari-focused dogfood day. Strategic shift mid-session from "stop platform work for migration" to "fix Bari's experience first, migrate after." That pivot held through the day and produced fourteen feature/fix commits, two CLAUDE.md discipline additions, and a Phase 2 architectural investigation completed in parallel (output landing at `Spec-Repo/spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md`, awaiting Doron's review tomorrow morning).

**The day's arc:** PDF darkness polish (variable-layer overrides) → Contract Total derivation + drillable tiles + new ProjectTileDrillIn component → empty-field link derivation surfaced as a pattern through three primary commits → swept across five sibling surfaces with `useProjectLinkedEstimates` hook extracted → codified in CLAUDE.md as a load-bearing platform discipline → Documents section on Project Detail (entity-rollup family + four prefill keys = DEC-148 threshold met) → payment drill-in scroll-and-flash on Recent Payments (corrected memory drift on FINANCIAL-WORKFLOW-SPEC §2.6 — FSPayment and FSDailyLog are siblings, not parent-child). Two process-discipline rules added inline: no-debrief-without-commit-hash (after Hyphae shipped morning's work without committing) and the empty-field derivation principle itself.

**Shipped to community-node (origin/main):**

1. **`488973e`** — First-pass PDF font darkness via variable-level overrides for `--muted-foreground` and `--foreground-soft` in printNode. Living Feet at the variable layer — change one CSS variable, every consumer benefits.
2. **`e950fd5`** — Contract Total derivation (read-time from linked estimate, not stored field) + drillable tiles + new `ProjectTileDrillIn.jsx` component. First instance of empty-field derivation through links.
3. **`f55975c`** — V2 PDF darkness — alpha-modifier handling via `[class*="text-muted-foreground/"]` attribute selector.
4. **`ed75cdf`** — Single print dialog fix — idempotency guard (`let triggered = false`) in `waitAndPrint` to prevent both onload and timeout fallback firing.
5. **`3328c79`** — Syntax error repair — backticks → double quotes inside CSS comments inside JS template literal in printNode. Lesson: run a build/syntax check before pushing when touching code-as-string territory.
6. **`82503b0`** — CLAUDE.md discipline rule: no debrief without commit hash. Added after morning's work shipped without commit, surfacing in GitHub Desktop instead of debrief.
7. **`2111d11`** — Bidirectional estimate-project link in Contract Total derivation — query `estimate.project_id` for both link directions. Second instance of empty-field derivation.
8. **`72dc441`** — Home tab tile navigation — 4 of 6 tiles wired up to navigate to relevant space.
9. **`18a9ecc`** — Per-row drill-into-source navigation — localStorage prefill pattern; honest navigation > pretend navigation seedling captured (the FSPayment edit form gap is real but not tonight's scope).
10. **`5f35c0f`** — Projects list grouping derives client from linked estimate when `project.client_id` is empty. Third instance of empty-field derivation — DEC-148 threshold met.
11. **`2aaef46`** — Empty-field link derivation sweep across 5 sibling surfaces (Project Detail header, flat list cards, drill-in modal subtitles, FSLog project picker + Client Payment "From" line, FSDocument project filter). `useProjectLinkedEstimates.js` hook extracted as the canonical helper; `deriveProjectClient` companion function.
12. **`a11ae64`** — CLAUDE.md codification: "Empty-field derivation through links" pattern. Direct field always wins; empty falls through to the linked entity; pure read-time, no auto-write back.
13. **`193f4e8`** — Documents section on Project Detail. Same entity-rollup family as Permits, Change Orders, Recent Payments. Two new prefill keys (`fs-document-prefill-id`, `fs-document-prefill-project-id`) bring the localStorage prefill family to four uses — DEC-148 threshold crossed for `useConsumePrefill` hook extraction. CreateDocumentFlow gains `initialClientId`/`initialProjectId` props seeded from Project Detail's "+ Add Document" button. DEC-199 list/detail invalidation pair on five FSDocument mutation sites (bare-prefix `['fs-documents-by-project']` covers every mounted Project Detail subscriber).
14. **`fae9b01`** — Payment drill-in rows scroll-and-flash on Recent Payments. Hyphae caught a memory drift in Mycelia's prompt — the prompt cited FINANCIAL-WORKFLOW-SPEC §2.6 to justify "payments live inside daily logs," but the spec actually says the opposite ("Underlying entities remain distinct... unification is in the input surface, not the data model"). FSPayment has no `daily_log_id` field; Sub Payment / Client Payment write only an FSPayment record without creating a parent FSDailyLog. Hyphae pushed back before writing code. Option B shipped: row click closes modal, scrolls Recent Payments section into view, briefly rings the matching row. Honest navigation to the surface where payments actually live, no edit-form constraint violation.

**Phase 2 architectural investigation (parallel session, not yet committed):**

15. **`Spec-Repo/spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md`** — written 2026-05-07 evening by parallel Hyphae session. Output of HYPHAE-PHASE-2-UNIFIED-ARCHITECTURE-INVESTIGATION. Scope: trade-grouped collapsible estimates as platform default + subs/vendors as queryable People with autocomplete on every entry surface. Three approaches proposed (A: Light Promotion + Sub Picker, B: FSPerson Entity + Trade Library, C: Trade Promotion Only). Recommendation: Approach A. Twelve open questions for Doron, five being load-bearing for the approach choice. Three structural framing pushbacks Hyphae surfaced against the prompt's framing: (a) trade-grouping is half-built not greenfield (already gated behind `is_insurance_estimate=true` with `trade_categories_json`, `trade_category_id` on line items, EstimatePreview groups by trade, Settings has full taxonomy CRUD); (b) "existing People model" doesn't exist — workers and subs are JSON blob entries on `workers_json`, vendors have no storage at all, no FSPerson entity exists; (c) `sub_name` already wired today (LineItemsEditor → FSEstimate.line_items → render). **Status:** uncommitted in Spec-Repo working tree, hand-merged when Doron signs off. Build prompts come AFTER sign-off, not before.

**Shipped to Spec-Repo (this commit):**

16. **`platform/DECISIONS.md`** — DEC-206 through DEC-214 appended. Nine new decisions covering today's architectural patterns and process discipline.
17. **`context/ACTIVE-CONTEXT.md`** — refreshed to reflect Bari's platform in solid dogfood-ready shape, Patricia's hand-signature workaround in motion, Phase 2 investigation awaiting sign-off, migration deferred per today's strategic decision.
18. **`context/SESSION-LOG.md`** — this entry.
19. **`platform/STATUS-TRACKER.md`** — Session row appended with the day's commits and Phase 2 handoff status.
20. **`platform/checklists/LAUNCH-CHECKLIST.md`** — items resolved by today's commits checked off; new items surfaced (estimate lifecycle gating, drift visibility question, FSPayment edit deferral, Documents architecture inversion) added.

**Mirrored to community-node (this commit):**

21. **`context/PROJECT-BRAIN.md`** — synced from Spec-Repo canonical (no foundational changes today, but kept in sync per DEC-182).
22. **`context/ACTIVE-CONTEXT.md`** — synced.
23. **`context/SESSION-LOG.md`** — synced.

**Architectural patterns established (load-bearing for future builds):**

1. **Living Feet at the variable layer** (`488973e` / `f55975c`) — change one CSS variable, every consumer benefits. Print-fidelity discipline now canonical (DEC-210).
2. **Empty-field derivation through links** (`e950fd5` / `2111d11` / `5f35c0f` + sweep at `2aaef46` + codification at `a11ae64`) — three-instance threshold met (DEC-148), pattern formalized as DEC-206. Same shape applies to other entity link chains for future audit (team↔workspace, sub↔FSPeople, FSPayment.party_name↔FSClient).
3. **localStorage cross-tab prefill** (`18a9ecc` / `193f4e8`) — canonical for navigation between tabs that unmount/remount. Four uses now (`fs-log-prefill-type`, `fs-log-prefill-log-id`, `fs-estimate-prefill-id`, plus today's `fs-document-prefill-id` + `fs-document-prefill-project-id`). DEC-148 threshold met. `useConsumePrefill` hook extraction queued.
4. **Idempotency guard for belt-and-suspenders scheduling** (`ed75cdf`) — `let triggered = false; if (triggered) return; triggered = true;` pattern for any scheduling with parallel paths.
5. **Honest navigation > pretend navigation** (`18a9ecc` / `fae9b01`, DEC-209) — when destination action isn't supported, no navigation is more honest than half-navigation. When honest navigation IS available (scroll-and-highlight to existing on-page section), do that instead of closing the modal silently.
6. **Entity rollup section pattern on Project Detail** — Recent Payments / Permits / Change Orders / Documents (`193f4e8`) all share the same shape. Four instances now, ready for `<RecordSection>` primitive extraction.
7. **Drill-in navigator helper family** — `goToEstimatePreview`, `goToLogForRecord`, `goToCOOnPage`, `goToPaymentRow` (`fae9b01`), plus existing `onLogPayment`. Five instances, ready for `useDrillInNavigators` hook extraction.

**Process discipline learnings:**

- **No-debrief-without-commit-hash (DEC-208).** Hyphae shipped morning's work without committing — Doron found three uncommitted files in GitHub Desktop. Discipline rule added to CLAUDE.md inline (`82503b0`). Future debriefs lead with commit hash; uncommitted work surfaces explicitly with "⚠ work not yet committed" rather than buried.
- **Spec citation re-verification (DEC-212).** Tonight's Item 2 prompt cited FINANCIAL-WORKFLOW-SPEC §2.6 to justify "payments live inside daily logs" — but the spec says the opposite. Hyphae caught the drift before writing code. Going forward, when citing a spec in a Hyphae prompt, Mycelia re-reads the relevant section rather than relying on memory. Spec Review Protocol (DEC-151) extends to spec citations, not just codebase audits.
- **Time-logging for AI build sessions starts now (DEC-211).** Mycelia's hour estimates have been calibrated to human-engineer-hours, not Hyphae-hours. Today: what was framed as "2-4 weeks of Phase 2 build" Hyphae's investigation revealed is days of work. What was scoped as "1.5 hours tonight" became 14 commits across the day. Estimates without data are noise. Going forward, log per session: start time, end time, commit count, complexity tag, scope-expansion flag. After 4-6 weeks of data, real estimates become possible.
- **Hyphae syntax error in `f55975c`** shipped without local build check — backticks inside CSS comments inside a JS template literal broke parser. Repaired in `3328c79`. Seedling: run a build/syntax check before pushing when touching code-as-string territory.

**Strategic decisions ratified today:**

- **DEC-206** — Empty-field derivation through links (formalized as platform discipline).
- **DEC-207** — Migration deferred pending Bari reliability + Phase 2 architectural sign-off (strategic ordering).
- **DEC-208** — No-debrief-without-commit-hash (process discipline).
- **DEC-209** — Honest navigation > pretend navigation (UI principle).
- **DEC-210** — Print-fidelity discipline at the variable layer (Living Feet for print CSS).
- **DEC-211** — Time-logging for AI build sessions (calibration discipline).
- **DEC-212** — Spec citation re-verification (extends DEC-151).
- **DEC-213** — Documents architecture inversion (live where used; flat list dissolves).
- **DEC-214** — FSPayment edit capability deferred to Phase 2 financial-layer architecture.

**Items needing Doron's verification in Base44 Act-As-User preview (today's commits):**

- **PDF darkness end-to-end** — open Bari's Patricia Heath estimate, generate PDF, confirm muted-foreground and foreground-soft text are darker than before, no alpha-modifier classes leak through pale.
- **Contract Total derivation** — open a project linked to a signed estimate; confirm Contract Total tile reads the estimate's signed total + signed COs, not the stored `total_budget` field.
- **Drillable tiles** — tap each of the financial header tiles (Contract / Received / Paid Out / Net Cash); confirm drill-in modal opens with the right rows + math; tap math input on derived tiles re-targets drill-in.
- **Bidirectional link derivation** — open a project with `client_id` empty but linked-estimate's `client_id` set; confirm client name shows on Project Detail header, list cards, drill-in subtitles. Also test the inverse direction (project linked from estimate not estimate linked from project).
- **Documents section on Project Detail** — open Test Project, confirm Documents section visible between Permits and Photo Gallery; document card click navigates to Documents tab detail view; "+ Add Document" navigates to create flow with project + derived client pre-selected; empty-state copy renders cleanly when no documents linked.
- **Payment drill-in scroll-and-flash** — tap Received tile → tap any payment row → modal closes, Recent Payments section scrolls into view, matching row briefly rings primary-gold for ~1.5s. Same on Paid Out drill-in. Net Cash math input → re-target to Received works.
- **Mobile viewport** — exercise all of the above at phone width; confirm 44px tap targets preserved.

**Phase 2 architectural review handoff:**

Tomorrow morning Doron reviews `Spec-Repo/spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md` and signs off. Five open questions are load-bearing for the approach choice:

1. Approach A vs B vs C (recommendation: A — Light Promotion + Sub Picker).
2. Trade taxonomy presets — three proposed (Bari General Contractor 13-trade / CSI MasterFormat 16-division / Simple Three-Bucket); possibly add fourth for service_provider workspaces.
3. CSI codes optional or absent (recommendation: optional, off by default).
4. Patricia's existing data after default flip — auto-categorize, heuristic + review, or leave Unallocated (recommendation: Unallocated).
5. Markup modes — defer per-trade and per-line markup to Phase 3 (recommendation: defer).

After sign-off, focused Phase 2 build prompts come from Mycelia in subsequent sessions.

**Open follow-ups carried forward (not closed in this commit):**

Small wins (likely <1 Hyphae session each):
1. **Client Detail Documents section** — same pattern as Project Detail Documents (`193f4e8`), different scope key (per DEC-213 inversion direction).
2. **`useConsumePrefill` hook extraction** — four uses now, DEC-148 threshold met.
3. **`<RecordSection>` primitive extraction** — four entity-rollup sections share the shape.
4. **`useDrillInNavigators` hook extraction** — five `goToX` helpers in the family.
5. **`src/utils/fsInvalidations.js` helper file** (Known Issue #18 in ACTIVE-CONTEXT) — `invalidateEstimates`, `invalidateProjects`, `invalidateLogs`, plus today's `invalidateDocuments`.
6. **DEC-193 backfill consideration** — one-shot migrationHelpers script to write `original_budget` from linked estimate (restore immutable-snapshot semantics for legal correctness).

Medium architectural (likely 1-2 Hyphae sessions each):
7. **Estimate edit lifecycle gating** — discipline conversation: when does an estimate become read-only? How is Change Order workflow surfaced as the proper edit path post-signing? Doron's surfacing: "we don't want someone saving changes to a signed and approved estimate."
8. **Documents tab restructuring (DEC-213 second half)** — convert from flat global list to inbox + templates + search, with documents living where they're used. Project Detail section landed in `193f4e8`; Client Detail section + tab restructuring queued.
9. **Cross-entity link chain audit** — team↔workspace, sub↔FSPeople, FSPayment.party_name↔FSClient (per DEC-206's "same shape applies elsewhere" footnote).

Phase 2 (post-architectural sign-off, multi-session):
10. **Trade-grouped collapsible estimates as platform default** — flip `is_insurance_estimate` → `flat_layout` rename + invert; three taxonomy presets.
11. **Sub picker on workers_json** — autocomplete for subs/vendors with `business_name`, `primary_trade_id`.
12. **Empty-field derivation: line item trade derives from linked sub's primary trade** (extends DEC-206 to a fourth surface).

Phase 3+ (real architectural conversations needed first):
13. **FSPayment edit capability** — tied to Log-Line-Item Attribution Proposal sign-off, Spent redefinition, returns/refunds (DEC-214).
14. **8 open questions on Log-Line-Item Attribution Proposal** — Doron sign-off pending (May 5).
15. **Returns and refunds** — gated on financial-layer expansion.
16. **Client Communication tab on Project Detail (and ClientPortal)** — Bari's surfaced need: photos, voice messages, decisions, change requests captured per-project, bidirectional with client. Substantial new feature, deserves its own investigation prompt before any build.
17. **Light-theme `--primary-foreground` collision with bg-white wrapper** — latent bug for any future light-theme user printing.
18. **`FieldServiceReport.jsx` printNode migration** (Known Issue #17) — migrate when next touched.
19. **Drift visibility question** — when derivation works perfectly, contractors don't realize their records have empty fields. Visible "derived from estimate" badge or auto-backfill on first view. Conversation when contractor confusion surfaces.

**Posture note for the record:**

Today (2026-05-07) was about closing the loop on Bari's experience before any architectural pivot. Patricia signed Bari's $182K ADU contract on the platform (via PDF + hand-signature workaround for the unauthenticated-client signing bug). Every commit today made Bari's surface a step more reliable. The strategic shift from "stop and migrate" to "fix Bari first" was validated through-line: by end of day, the Phase 2 architecture investigation had also produced a defensible recommendation, Hyphae had pushed back on three framing assumptions in Mycelia's prompt (Spec Review Protocol DEC-151 working as designed), and the empty-field derivation pattern had crossed the three-instance threshold + been formally codified. The day's process discipline additions (DEC-208 commit-hash, DEC-211 time-logging, DEC-212 spec re-verification) are all corrections to drift that surfaced during the day — not retroactive cleanup, but real-time tightening. The Phase 2 proposal sits in the working tree pending tomorrow morning's review.

**Active paying members: 1 (Bari, $500/mo retainer).** First adult-tier nursery participant pending: Gina.

**Ship-it timestamp:** 2026-05-07, end of day. Bari's platform in solid dogfood-ready shape. Patricia signing via PDF workaround. Phase 2 architectural proposal awaiting Doron's review tomorrow morning. Migration deferred per DEC-207. Tomorrow's first move: review the Phase 2 proposal, answer the five open questions, then build prompts for the recommended approach.

---

## Session Log — 2026-05-08 (Phase 2.1 complete: trade-grouping default flip + Unallocated bucket + migrationHelpers structural fix)

**Wallclock:** 07:09 → ~08:45 PT (~96 min)
**Hyphae sessions:** 4 (Phase 2 sign-off commit, Phase 2.1 build, ClientPortal hooks fix, migrationHelpers audit + migration run)
**Max effort:** on throughout
**Commits on community-node main:** 3 (`6c3573f`, `4996051`, `cecec99`) plus the live migration --apply (5 records)
**Commits on Spec-Repo main:** 1 (`67b11df`) — Phase 2 proposal sign-off
**Migration:** `migrate-flat-layout-inversion` ran cleanly — 5 FSEstimate records inverted, 5 AuditLog rows written, idempotency confirmed (re-run skips all 5)

**Arc:**

- 07:09 Session start. Phase 2 proposal walkthrough in plain language.
- 07:18 Q1–Q5 answered, Approach A locked (Light Promotion + Sub Picker), 4 taxonomy presets (Bari General Contractor 13-trade / CSI MasterFormat 16-division / Simple Three-Bucket / Service Provider — Hourly), CSI codes off-by-default, Patricia's data left in Unallocated for manual tagging, per-trade/per-line markup deferred to Phase 3, substream order as proposed.
- 07:11 Hyphae shipped sign-off commit `67b11df` (Spec-Repo) — proposal status header updated to APPROVED + §13 sign-off section + closing line updated to "Approved 2026-05-08. Phase 2.1 build follows."
- 07:32 Phase 2.1 build prompt to Hyphae.
- 07:43 First Phase 2.1 commit landed: `6c3573f` — field rename `is_insurance_estimate` → `flat_layout` across 9 call sites (audit predicted 8; Hyphae found a 9th — the `<h2>{isInsurance ? 'INSURANCE ESTIMATE' : 'ESTIMATE'}</h2>` header in EstimatePreview, simplified to plain "ESTIMATE"). Schema rename in FSEstimate.jsonc. New action `migrate_flat_layout_inversion` in migrationHelpers + runner script `src/scripts/migrations/migrate-flat-layout-inversion.js` (idempotent via prior-AuditLog lookup). Toggle UI relabeled "Flat layout — Render line items as a single table, without trade groups."
- 07:55 Second Phase 2.1 commit landed: `4996051` — Unallocated bucket render. `groupedByTrade` memo rewritten to key by `tc.id` (was: `tc.name`) so untagged items don't silently merge with a workspace's actual "Other" trade. Sentinel bucket `{ id: '__unallocated__', name: 'Unallocated', order: -1 }` floats to top of grouped view. ClientPortal gains parallel trade-grouped render. Living Feet extraction: `getTradeCategories` + `DEFAULT_TRADE_CATEGORIES` to `src/utils/fsTradeCategories.js` (two consumers; Phase 2.2 presets work will be third).
- 07:50 ClientPortal hooks order violation caught by Base44 preview validation (instance #2 of "Base44 as production-correctness gate" pattern after `f55975c` → `3328c79` template-literal syntax yesterday). The two new useMemo calls sat below the early returns at lines 139–140; React's Rules of Hooks require stable order. Fixed in `cecec99` — moved hooks above the early returns, made dependencies undefined-safe (parseJSON returns [] on undefined; getTradeCategories falls back to default seed). `npm run build` exits 0; Vite dev mode silently passes the violation, production build catches it.
- 08:01 Migration secret regenerated by Doron, FSEstimate field rename applied via Base44 agent + published.
- 08:17 migrationHelpers `--apply` failing with verbatim error: `migrationHelpers call failed: Permission denied for update operation on FSEstimate entity` — even after `security.update` widened to `true` and the app published twice. Doron handed off to Hyphae for audit.
- 08:18–08:32 Hyphae's audit identified DEC-095 amendment pattern. Code path correct (`base44.asServiceRole.entities.FSEstimate.update(...)` in migrationHelpers, identical to `reparentBusiness` writing Business and `signEstimate` writing FSEstimate). The block is at the rls layer: FSEstimate's `rls.update: { created_by: "{{user.email}}" }` does not yield to `asServiceRole` identity in SDK 0.8.23. Same shape, same error message, same fix as the FieldServiceProfile fix in Phase 2 production migration (DEC-095 amendment, 2026-04-23). Audit confirmed via runtime: dry-run scanned 5 records correctly, `--apply` failed at the write step. Three-instance evidence (FieldServiceProfile fixed, FSEstimate to-fix, Business as working comparable) crossed DEC-148 threshold for promotion.
- 08:33 Mycelia's Base44 agent prompt removed `rls.update` key entirely from FSEstimate (security.update temporarily widened to true during migration, restored to `{ owner: true }` after).
- 08:34 Hyphae re-ran `--apply` with the migration secret. Clean execution: 5 records inverted (EST-2026-001 through EST-2026-005, including Patricia's ADU + Bari's Red Umbrella + 3 test records), 5 AuditLog rows written. Idempotency confirmed by re-running --apply (0 inverted, 5 skipped) and dry-run (0 will-invert, 5 already-migrated).
- 08:35 Verification pass via Act-As-User preview as Bari. Patricia's EST-2026-005 renders flat by default (visual preserved). Toggle "Flat layout" OFF → all 30 lines render under "Unallocated" bucket at top of trade-grouped view. Tagging the framing line into "Framing" trade splits it into its own group ($11,000 subtotal); Unallocated reduces to $134,360.93. **Total $182,013.69 unchanged across both modes**, confirming math is layout-independent. Toggle ON → flat render restores. New estimate creation defaults to trade-grouped. Mobile viewport, PDF/print, ClientPortal all rendering correctly.
- 08:38 `security.update` restored to `{ owner: true }`. `rls.update` permanently absent (do not re-add — see DEC-215). Migration secret retired from Base44 env config (single-use protocol honored).

**Decisions made:**

- **DEC-215** — `rls.update` must be absent on entities receiving `asServiceRole` writes. Promoted from DEC-095 amendment (FieldServiceProfile-specific) to a structural rule with three-instance evidence (FieldServiceProfile + FSEstimate + Business). Critical safety rail: "key absence is load-bearing" + "do not re-add this key." See DECISIONS.md.
- Phase 2 Architecture Approach A locked + signed off (logged at proposal §13).
- Phase 2.1 substream complete. Phase 2.2 (taxonomy presets — the 4 locked in Q3) is the next focused build prompt.

**Known Issues affected:**

- **KI #22 (Patricia signing-flow blocked)** — structurally unblocked as side-effect of `rls.update` removal from FSEstimate. Same root cause as the migration block. `signEstimate` server function should now succeed; PDF + hand-signature workaround can retire after in-platform signing is verified on a non-Patricia test estimate.

**Seedlings surfaced today:**

1. **`<TradeGroupedItemsTable />` component extraction.** Two consumers now (EstimatePreview + ClientPortal); Phase 2.4 (CO previews mirroring estimate grouping) likely becomes the third. Living Feet threshold approaching.
2. **Base44-as-production-correctness-gate pattern.** Two instances captured: `f55975c` → `3328c79` (template literal syntax, 2026-05-07), `4996051` → `cecec99` (Rules of Hooks, 2026-05-08). Discipline rule named in last debrief: run `npm run build` before pushing when touching hooks, template literals, or schema references. Third instance promotes to its own DEC.
3. **Pre-migration RLS audit checklist.** Living Feet candidate at 3+ entities — pattern: any entity needing `asServiceRole` writes must have `rls.update` absent. Suggested tooling: `pre-migration-rls-audit.js <entity-name>` reporting green/red. Not yet — flagging.

**Calibration data (DEC-211):**

| # | Session | Wallclock | Hyphae stamp | Complexity |
|---|---|---|---|---|
| 1 | Phase 2 sign-off commit | ~3 min | ~3 min | polish |
| 2 | Phase 2.1 build (rename + Unallocated bucket) | ~11 min | ~29 min | build |
| 3 | ClientPortal hooks fix | ~5 min | ~18 min | bugfix |
| 4 | migrationHelpers audit | (auditing only) | ~14 min | investigation |
| 5 | Migration `--apply` (post-fix) | ~2 min | ~2 min | execution |
| 6 | Part-2 restore + secret rotation | ~4 min | (Base44/Doron) | cleanup |

Calibration trend through sessions 1–5: Hyphae stamps appear to track wallclock for the bugfix and execution flavors but exceed wallclock for build and investigation flavors. Likely interpretation: Hyphae's stamps include audit + verification overhead that wallclock-as-Doron-experiences-it doesn't include (Doron's wallclock starts when he hands off and ends when he sees the debrief; Hyphae's stamps include the internal audit/verify cycle). Useful distinction emerging — both numbers are honest; they measure different things.

**Posture note for the record:** today was the first end-to-end Phase 2 substream. The single most useful thing today wasn't any individual commit — it was the audit on the migration permission-denied error (~14 min) that promoted DEC-095 amendment to a structural rule (DEC-215). The pattern was already named (FieldServiceProfile fix from 2026-04-23); the work was confirming the same shape applies to FSEstimate and naming the rule structurally. **Two-for-one outcome:** the same rls.update removal that unblocked the Phase 2.1 migration also structurally resolves Patricia's signing-flow workaround (Known Issue #22) — both blocked on the same identical line in the entity schema.

**Next:** Phase 2.2 (taxonomy presets — the 4 locked answers) up. New focused Hyphae session.

**Ship-it timestamp:** 2026-05-08, ~08:45 PT. Phase 2.1 complete + verified + restored. Mycelia secret rotated out. Tomorrow's first move: Doron's optional verification of Patricia's in-platform signing now that signEstimate is structurally unblocked.

---

## Session Log — 2026-05-08 (continued: Phase 2.2 + 2.3 + 2.4 + polish + DEC promotions)

**Wallclock:** 09:30 → ~14:30 PT (~5 hours after morning Phase 2.1 close)
**Hyphae sessions:** 4 architectural arcs (Phase 2.2 architecture consultation + build, Phase 2.2 polish bundle, Phase 2.3 architecture consultation + build, Phase 2.4 architecture consultation + build) — all run as continuations of the same long Hyphae session that started 11:43 PT
**Max effort:** on throughout
**Commits on community-node main (this section):** 17 commits — Phase 2.2 (`f466c07`, `6305063`, `44a3866`, `ff1d6da`, `49c0bfb`, `88132a3`); polish (`a6f9875`, `d02ed1f`, `47e00b8`, `3729bc7`); Phase 2.3 (`fe1415d`, `054e402`, `8236545`, `b282e88`); Phase 2.4 (`2472e39`, `0467db5`, `ff7e741`)
**Migrations applied (this section):** 4 — `migrate-flat-layout-rename`, `migrate-trade-categories-snapshot-backfill`, `migrate-company-name-to-business-name`, `migrate-add-workers-json-ids`
**Base44 schema changes (this section):** 4 — `flat_layout` → `group_by_trade` rename + `taxonomy_preset_id` + `trade_categories_snapshot` (Phase 2.2 schema bundle); wrap-shape correction on snapshot field (Phase 2.2 mid-day); `rls.update` re-removed after auto-restore (Phase 2.2 part-2); `FSPayment.party_id` description-only update (Phase 2.4)

### Arc

- 09:30 Mycelia surfaced taxonomy preset architectural concern (workspace-level vs per-estimate); per-estimate snapshot model needed for documents-as-frozen-identity discipline.
- 09:43 Hyphae Phase 2.2 architecture consultation (~5 min audit) → per-estimate snapshot model recommended (Push 1-6: helper extension, EMPTY_ESTIMATE seam, creation seam, Settings UI, editor picker, migration sequencing).
- 09:55 Phase 2.2 build prompt to Hyphae; Base44 schema applied via agent prompt with 11/11 checkpoints across rename + new fields + permissions.
- 10:14 Phase 2.2 architectural commits land: `f466c07` `isEstimateLocked()` extraction (5 inline gates → 1 helper), `6305063` `tradeTaxonomyPresets.js` config (4 locked presets), `44a3866` per-estimate snapshot bundle (helper extension + EMPTY_ESTIMATE + creation seam + Settings preset picker + editor picker), `ff1d6da` migration scripts + `pre-migration-rls-audit.js` Living Feet helper.
- 10:22 Migration #1 (`migrate-flat-layout-rename`) applied — 6 records, 6 AuditLog rows; idempotency confirmed.
- 10:24 Migration #2 (`migrate-trade-categories-snapshot-backfill`) applied — initial run failed Base44 validation: snapshot field is `object`-typed; migrationHelpers wrote raw array. Fixed in commit `49c0bfb` by re-wrapping as `{ items: [...] }`. Re-run succeeded — 6 records backfilled, 6 AuditLog rows. **DEC-216 trigger event.**
- 10:35 Phase 2.2 verification surfaces 4 polish/regression issues from Doron's Act-As-User preview: preset rename (`bari_general_contractor` → `general_contractor`), dropdown shadcn theming inconsistency, save mutation cache race causing preview staleness, line-item description regression (input clipped to zero width by shadcn `w-full` default), print pagination edge case in trade group wrappers.
- 10:42 Phase 2.2 fix-1 — preset rename + Phase 2.2 dropdowns shadcn-themed (commit `88132a3`).
- 11:07 Phase 2.2 fix-2 — line-item kind/trade dropdowns converted to shadcn Select (`a6f9875`); save mutation optimistic cache update fix for preview staleness (`d02ed1f`, DEC-130 React Query cache race pattern).
- 11:13 Phase 2.2 fix-3 — line-item description regression (`47e00b8`); shadcn `<SelectTrigger>` defaults to `w-full` and consumed entire flex row; fix used `w-auto` + `min-w-[110px]` + `flex-shrink-0` on in-row triggers. **DEC-217 trigger event.**
- 11:24 Phase 2.2 fix-4 — print pagination (`3729bc7`); removed `page-break-inside: avoid` from trade group wrapper that caused page-1 whitespace clipping.
- 11:33 Hyphae Phase 2.3 architecture consultation (~9 min audit). Findings: (1) `workers_json` schema description out-of-sync with actual write shape; (2) `ROLE_BADGES` + role select duplicated; (3) `parseWorkers` and `parseJSON` near-identical — Living Feet candidates at 3 instances; (4) snapshot interaction Option B (soft derivation with name-bridging) — recommend storing `primary_trade_id` as workspace-current-taxonomy id, deriving by name-match against estimate snapshot; (5) Phase 2.3 should ship schema + Settings UI together (not schema-only) per DEC-183 path-walking.
- 11:50 Phase 2.3 build prompt with Hyphae corrections: 4 presets locked, vendor fuchsia color, soft derivation Option B name-bridging, schema+UI bundled.
- 12:04 Phase 2.3 Living Feet pre-work shipped (`fe1415d` — `WORKERS_ROLES` constant + `parseWrappedArray` helper + `useWorkspacePeople` hook + refactor existing consumers as no-op); Migration #3 script shipped (`054e402` — `migrate-company-name-to-business-name.js` + helper action). Paused for Doron migration apply.
- 12:19 Migration #3 (`migrate-company-name-to-business-name`) applied — 4 FieldServiceProfile records, 2 items renamed, 4 AuditLog rows. Idempotency confirmed.
- 12:23 Phase 2.3 §5 + §6 shipped: code-side rename `company_name` → `business_name` (`8236545`, 7 line refs across 2 files); UI extension (`b282e88`) — Vendors `<Section>` + role-conditional fields + `primary_trade_id` picker (workspace-current taxonomy reference; sentinel pattern matches LineItemsEditor) + permissions guide entry.
- 13:46 Hyphae Phase 2.4 architecture consultation (~2 min audit, parallel queries converged fast). **Critical pre-work surfaced:** workers_json items have NO stable `id` field today (Phase 2.3 implementation oversight; architecture proposal Approach A's data shape included `id: string`). Phase 2.4's `<SubVendorPicker>` writes `sub_person_id` (line items) and `party_id` (FSPayment) — both require stable ids. Picker has no reliable reference target without backfill. **Other findings:** (1) `cmdk` (shadcn Command primitive) IS shipped at `src/components/ui/command.jsx` and unused — Phase 2.4 lights it up as first consumer; drop the proposed `<TypeaheadPicker>` primitive abstraction; (2) FSPayment uses `party_id` + `party_name`, NOT `payee_id`/`payee_name` — broaden semantic of existing field, no new field needed; (3) `isChangeOrderLocked()` — 7+ inline gates in FieldServiceProjects.jsx; three-instance threshold massively exceeded; (4) CO line item editor SHARES `LineItemsEditor` — single picker integration covers both estimate + CO surfaces.
- 14:00 Phase 2.4 build prompt with §0a workers_json id backfill mandatory pre-work + §0b `isChangeOrderLocked()` extraction + §1+§1b+§2+§3 picker bundle.
- 14:00 Phase 2.4 build session resumed; §0a (workers_json id backfill) shipped (`2472e39` — `add_workers_json_ids` action + runner + EMPTY_PERSON id field + PersonModal id generation via `newWorkerId()` + `claimWorkspaceSpot` dual-match). Paused for Base44 publish (function action sync).
- 14:01 Doron published Base44.
- 14:02 Migration §0a dry-run — 4 records scanned, 2 items receiving fresh ids (Doron Fletcher + Bari Wayne Swartz). Sample assignments confirmed sensible.
- 14:03 Migration §0a applied — 4 profiles migrated, 2 items received fresh ids, 4 AuditLog rows. Idempotency confirmed.
- 14:06 §0b shipped (`0467db5`) — `isChangeOrderLocked()` extracted to `fsEstimateLifecycle.js`; 5 inline lock-gate sites replaced; 6 status-discrimination sites preserved inline (display labels distinguish 'signed' vs 'accepted' specifically).
- 14:11 §1+§1b+§2+§3 bundled commit (`ff7e741`) — `<SubVendorPicker>` (cmdk + Popover composition) + `<QuickAddPersonModal>` (slim form: name + role + business_name + primary_trade_id) + LineItemsEditor integration (subcontractor line items render picker when `profile` threaded; legacy fallback to text input preserves backward compat) + FSPayment Sub Payment integration (replaces `payee_name` text input; auto-syncs `party_type` from picked person's role; dual-write `party_id` + `payee_name`).
- 14:18 Base44 description-only update for `FSPayment.party_id` applied (semantic broadened to also reference workers_json item ids when party_type is sub/vendor; no field-type or permission change).
- ~14:30 Ship-it cycle drafted.

### Decisions made

- **DEC-216** ratified — Base44 `object`-typed array fields require `{items: [...]}` wrap at write boundary (five-instance evidence: line_items, trade_categories_json, trade_categories_snapshot, workers_json, phase_labels). `parseWrappedArray` helper at `src/utils/wrapShape.js` is the canonical reader.
- **DEC-217** ratified — shadcn `<Select>` defaults to `w-full`; in-row layouts use `w-auto min-w-[N] flex-shrink-0`, standalone form fields use `w-full`. Failure mode caught in commit `47e00b8`. Five-instance evidence (`88132a3`, `a6f9875`, `47e00b8`, `b282e88`, `ff7e741`).
- Per-estimate taxonomy snapshot architecture (Phase 2.2) — locked at consultation; documents-are-frozen-identity discipline applied at the trade-categories layer.
- Vendor role color: fuchsia (`bg-fuchsia-500/20 text-fuchsia-400`).
- Workers_json items get stable `id` field (Phase 2.4 §0a pre-work); architectural correction of Phase 2.3 implementation gap.
- `<TypeaheadPicker>` primitive dropped — cmdk IS the primitive; build `<SubVendorPicker>` directly on cmdk + Popover composition.
- FSPayment.party_id semantic broadened to also reference workers_json item ids when party_type is sub/vendor (description-only update; no field-type change).

### Known Issues affected

- **KI #20 (estimate edit lifecycle gating)** — partial closure via `isEstimateLocked` extraction (Phase 2.2 §0) and `isChangeOrderLocked` extraction (Phase 2.4 §0b). Two of the lifecycle predicates now have shared helpers; KI #20's full closure (when does an estimate become read-only? change order workflow as proper edit path post-signing) remains a deeper architectural conversation.
- **KI #22 (Patricia signing-flow)** — structurally unblocked (DEC-215, applied 2026-05-08 morning). Verification still pending; PDF + hand-signature workaround can retire after in-platform signing is confirmed working on a non-Patricia test estimate.

### Seedlings flagged for future

1. **CO render parity with Estimates** — Phase 2.6 candidate; visual + architectural inconsistency (LineItemsEditor was shared but COs don't get all the editor improvements). Phase 2.4 partially addresses (picker integration covers both).
2. **Client-as-Hub architecture** — Phase 3 candidate; spec doc committed in this ship-it cycle at `Spec-Repo/spaces/field-service/CLIENT-AS-HUB-SPEC.md`. Every client/project page surfaces all associated records (estimates, projects, COs, payments, documents, communication, logs). Same "documents are self-contained" pattern as Phase 2.2 snapshot, applied one layer up.
3. **`migrationRunner` factory at 5-instance threshold** — extract `src/scripts/migrations/lib/migrationRunner.js` factory at the next migration write site. Five runners now share identical shape: env check, `callMigrationHelper`, `--dry-run`/`--apply` arg parsing, banner, dry-run formatting, error handler.
4. **`appendToWorkersJson(profile, newPerson)` helper at 2-instance threshold** (PersonModal save + Phase 2.4 quick-add). Phase 2.5/2.6 likely brings the third write site.
5. **`<TradeGroupedItemsTable />` extraction at 3 consumers** (EstimatePreview + ClientPortal + future CO previews if Phase 2.6 ships CO trade-grouped render).
6. **Native `<select>` consistency pass** — `payment_terms`, `project_id` still use raw HTML `<select>`. Living Feet pass when those surfaces are next touched per DEC-217.
7. **`applyFSEstimateUpdate(queryClient, profileId, saved)` helper** for the React Query cache race pattern (Hyphae's `d02ed1f` Living Feet flag) — apply to other FSEstimate mutations (markAsSent, sendForSignature, etc.) when next touched.
8. **`isEstimateEditable(estimate)` extraction** at 1+1 threshold (KI #20 territory).
9. **`cleanByRoleConfig(formData, config)` helper** for handleSave field clearing in PersonModal — threshold-watch when 5th-6th conditional clear lands.
10. **`<FormSelect>` wrapper** for shadcn Select standalone-form-field variant — five instances now (preset pickers + line-item dropdowns + PersonModal role/primary_trade_id + SubVendorPicker QuickAdd role/primary_trade_id); abstraction threshold not met because each carries different option-shape semantics; revisit when third standalone-form Select genuinely shares props.
11. **Phase 2.7+ single-line-entry-point UX redesign** — mocked this morning, deferred to spec doc.
12. **Pre-migration RLS audit checklist** now formalized as `pre-migration-rls-audit.js` helper. Five migrations ran today; pattern is solid.
13. **Stable id pattern for workers_json items** (Phase 2.4 §0a) — flagged that this same pattern likely needs to extend to other JSON blob arrays in the codebase if any exist (not yet audited).
14. **`RADIX_SENTINELS` extraction at 2-instance threshold** — `__no_trade__` (LineItemsEditor) + `__no_primary_trade__` (PersonModal + SubVendorPicker QuickAdd). Defer until 3rd sentinel lands.
15. **`signEstimate` `sub_name` refresh-on-lock** owed — when an estimate transitions to accepted/signed, `sub_name` text on each line item should refresh from linked workers_json record's CURRENT name before the lock takes effect. Captures visual at sign time. Out of scope for Phase 2.4; flag for `signEstimate` review during dogfood.
16. **CO surface lock-aware editor gating** — `editingCOId`-keyed lookup against `changeOrders[]` could resolve `co` for `disabled={isChangeOrderLocked(co)}`. Today's UX gates entry into the CO edit form by status outside the editor. Defense in depth.

### Calibration data (DEC-211)

| # | Session | Wallclock | Hyphae stamp | Complexity |
|---|---------|-----------|---------------|-------------|
| 1 | Phase 2 sign-off commit | ~3 min | ~3 min | polish |
| 2 | Phase 2.1 build (rename + Unallocated) | ~11 min | ~29 min | build |
| 3 | ClientPortal hooks fix | ~5 min | ~18 min | bugfix |
| 4 | migrationHelpers audit | (auditing only) | ~14 min | investigation |
| 5 | Phase 2.1 Migration --apply | ~2 min | ~2 min | execution |
| 6 | Phase 2.1 part-2 restore + secret rotation | ~4 min | (Base44) | cleanup |
| 7 | Phase 2.2 architecture consultation | ~5 min | ~5 min | investigation |
| 8 | Phase 2.2 build (initial bundle) | ~30 min | ~22 min | build |
| 9 | Phase 2.2 wrap-shape fix (DEC-216 trigger) | ~5 min | ~3 min | bugfix |
| 10 | Phase 2.2 fix-1 (preset name + dropdowns) | ~5 min | ~4 min | polish |
| 11 | Phase 2.2 fix-2 (line-item dropdown + preview staleness) | ~5 min | ~5 min | polish |
| 12 | Phase 2.2 fix-3 (description regression — DEC-217 trigger) | ~5 min | ~2 min | bugfix |
| 13 | Phase 2.2 fix-4 (print pagination) | ~3 min | ~3 min | bugfix |
| 14 | Phase 2.3 architecture consultation | ~9 min | ~9 min | investigation |
| 15 | Phase 2.3 LF pre-work + migration script | ~25 min | ~21 min | build |
| 16 | Phase 2.3 §5 + §6 post-migration | ~6 min | ~6 min | build |
| 17 | Phase 2.4 architecture consultation | ~2 min | ~2 min | investigation |
| 18 | Phase 2.4 build (full — §0a + §0b + §1/§1b/§2/§3 bundled) | ~19 min | ~13 min | build (multi-substream + migration) |
| 19 | Phase 2.4 Base44 description update | ~30 sec | (Base44) | description-only |

Calibration trend through 19 sessions: investigation flavors (consultation audits) consistently 2-9 min wallclock; bugfix and execution flavors track wallclock closely; build flavors with multi-substream scope diverge (Hyphae stamps include audit + verification overhead). Three architecture consultations today (~16 min total wallclock for all three) prevented at least 2-3x the build time that would have been wasted on wrong-shape implementations.

### Next

- **Phase 2.5** — empty-field derivation (line item trade derives from linked sub's `primary_trade_id` via name-bridging Option B per Phase 2 §6 lock-in). Read-time only, no auto-write-back, soft-fail to Unallocated when estimate snapshot doesn't contain a category matching the sub's workspace primary trade by name.
- **Phase 2.6** polish — mobile, dark theme, CO render parity, edge cases, optional reconciliation script for inline sub_name strings (deferred per Phase 2 §7.8 — natural workflow handles).
- **Then Phase 2 closes** and the queue picks up: Phase 2.7+ single-line-entry-point UX redesign, Phase 3 candidate (Client-as-Hub), Stewardship + Nursery launches.

**Ship-it timestamp:** 2026-05-08, ~14:30 PT. Phase 2.1-2.4 complete + verified at production-build level. Five migrations applied + idempotent. Two structural DECs ratified (DEC-216 wrap-shape, DEC-217 shadcn Select width). 17 community-node commits + 2 Spec-Repo commits this section. Patricia signing-flow regression check still owed (Doron, optional). Next session: Phase 2.5 architecture consultation or Phase 2.5 build (depending on Doron's read on derivation complexity).

---

## Session Log — 2026-05-09 (Saturday) (Phase 2.5 build → ship → rollback + migration; Phase 2.6 spec authored + sign-off audited + patched; DEC-218 "Half-done isn't done" + DEC-219 DEC citation hygiene ratified)

**Wallclock:** ~09:00 → ~13:30 PT (~4.5 hours)
**Hyphae sessions:** 8 (Phase 2.5 architecture consultation, Phase 2.5 build, Phase 2.5 rollback build, Phase 2.5 migration code, Phase 2.5 migration apply, Phase 2.6 exploratory architecture audit, Phase 2.6 spec commit + sign-off audit, Phase 2.6 patch 001)
**Max effort:** on throughout
**Commits on community-node main:** 3 (`95ccfb1` Phase 2.5 build, `197805e` Phase 2.5 rollback, `cc0f845` migration code) plus the live migration `--apply` (4 records, 1 actual data strip)
**Commits on Spec-Repo main:** 2 (`abb3916` Phase 2.6 spec, `2b8686d` patch 001)
**Migration:** `migrate-strip-primary-trade-id` ran cleanly — 4 FieldServiceProfile records scanned, 1 actual `primary_trade_id` value stripped (Doron's "Cabinetry & Countertops" test data on Consulting with Doron workspace), 4 AuditLog rows written (`workers_json_primary_trade_id_stripped`), idempotent re-run confirmed (4 already-migrated, 0 will-migrate). Patricia's data and Bari's Red Umbrella record completely untouched.
**Base44 schema changes:** none (Phase 2.5 was pure code; rollback was code + data strip, no schema change since `workers_json` is `object`-typed per DEC-216 and tolerates field removal at item level)

### Arc

- ~08:44 Mycelia session start; Phase 2.5 architecture consultation prompt drafted from morning's open thread.
- ~09:00 Hyphae Phase 2.5 architecture consultation (~50 min audit). Findings: (1) consultation framed `useDeriveLineTrade` as a hook, but pure function is right (no React state); (2) consultation listed 3 render sites with same shape — actually 2 grouping sites (Preview + ClientPortal) + 1 editor site (LineItemsEditor) with different shapes; (3) `peopleMap` extension on `useWorkspacePeople` is the right seam (5+ future consumers); (4) UX §4 leaned toward visible italic + "(derived)" suffix but proposal §11.2 explicitly mitigated against pressure — recommended italic + muted styling without suffix, info-dot for tooltip; (5) workers_json privacy on public ClientPortal is a pre-existing latent (FieldServiceProfile read returns workers_json to anyone with portal_token). Recommendation: pure function, ship as single coherent phase, defer DnD and consumer parseWorkers cleanup to Phase 2.6.
- ~10:00 Phase 2.5 build (`95ccfb1`) — `feat(field-service): empty-field trade derivation via name-bridging (Phase 2.5)`. 6 files, +218/−27. Pure function `deriveLineTrade(line, peopleMap, snapshotCategories, workspaceCategories)` in `fsTradeCategories.js` mirrors `deriveProjectClient` shape; `peopleMap` return field added to `useWorkspacePeople`; wired into EstimatePreview groupedByTrade + ClientPortal groupedByTrade (silent bucketing) + LineItemsEditor trade picker (italic + muted + info-dot for sub_person source). Forward-compat threading on CO editor in FieldServiceProjects.
- ~10:50 Phase 2.5 verification gap: dev server stuck on KI #24 stale state (yesterday's `projectIdToEstimate` redeclaration phantom from May 8 4:20 PT frozen in error state); production build passed cleanly (`npm run build` EXIT=0, fresh dist artifacts), dev preview hit pre-existing KI #4 SDK 404 boundary. Production verification owed via Base44 Act-As-User preview after publish.
- ~10:55 Doron's screen-walk through Mycelia's Phase 2.5 mockup surfaced two architectural realities the spec didn't account for: (1) single `primary_trade_id` per sub doesn't survive taxonomy switching (Tony Tile maps to "Tile" in GC but no name match in CSI MasterFormat — exact-name-match bridge silently soft-fails cross-taxonomy), (2) line item creation flow has trade dropdown visually before sub picker — users fill left-to-right, manually pick the trade before sub picker fires, derivation never has a chance. Doron's framing: **"Half-done isn't done."** Decision: roll back the user-visible derivation entirely, remove `primary_trade_id` field from subs, defer auto-derivation to Phase 3+ as proper per-taxonomy mapping.
- ~10:55–11:35 Phase 2.5 rollback. Comprehensive `primary_trade_id` audit confirmed scope (4 file consumers: `fsWorkersRoles.js` config flag, `fsTradeCategories.js` deriver — keeping per E7, `FieldServicePeople.jsx` PersonModal, `SubVendorPicker.jsx` quick-add modal). No unexpected consumers. Rollback (`197805e`) — `revert(field-service): roll back Phase 2.5 user-visible derivation + remove primary_trade_id from subs`. 9 files, +60/−228. Italic styling, info-dot, auto-bucketing all removed; Trade picker fully restored to pre-Phase-2.5 shape; `primary_trade_id` removed from PersonModal, QuickAddPersonModal, `EMPTY_PERSON`, `WORKERS_ROLES.hasPrimaryTradeId` config flag. Two scaffolding pieces preserved with rollback-context docstrings: `deriveLineTrade` pure function (now disconnected from render path but documented for future revisit), `peopleMap` extension on `useWorkspacePeople` (independently valuable Phase 2.6 polish target).
- ~11:25 Migration code (`cc0f845`) — `migration: strip primary_trade_id from workers_json items (Phase 2.5 rollback cleanup)`. 2 files, +286. New `strip_primary_trade_id` action handler in `migrationHelpers/entry.ts` (mirrors `add_workers_json_ids` shape); Node runner `migrate-strip-primary-trade-id.js` with dry-run + apply paths. Initial dry-run attempt confirmed Base44 server still on old entry.ts (`Unknown action: strip_primary_trade_id`). Paused for Doron publish.
- ~11:30 Doron published Base44 (entry.ts auto-syncs from main).
- ~11:32 Migration dry-run — 4 records scanned, 1 item with `primary_trade_id` populated (Doron's `Consulting with Doron` workspace, his own record with "Cabinetry & Countertops" from his test screenshot). Bari's Red Umbrella + 2 other profiles audit-only markers.
- ~11:35 Migration `--apply` — 4 profiles migrated, 1 item stripped (Doron's test data only), 4 AuditLog rows. Idempotent re-run confirmed (4 already-migrated, 0 will-migrate). **Single-secret protocol kept live for Phase 2.6.2's FSChangeOrder backfill migration.**
- ~11:40 Phase 2.6 exploratory architecture audit (~45 min). Reshape proposal: stacked editable rows → single entry-point + collapsible trade groups + drag-and-drop reorder + inline edit + signed-document confirm dialog. Hyphae pushbacks: (1) **CO parity gap is load-bearing** — FSChangeOrder lacks `group_by_trade`, `taxonomy_preset_id`, `trade_categories_snapshot`; recommend Phase 2.6.1 (Estimates only) + Phase 2.6.2 (FSChangeOrder schema + migration) split; (2) replace LineItemsEditor cleanly rather than refactor, three-component decomposition (`<LineItemForm>` + `<LineItemsByTrade>` + `<LineItemRow>`); (3) "Xactimate-default" framing imprecise — codebase has CSI MasterFormat preset (closest to Xactimate) plus GC/Simple/Service-Hourly; (4) DnD library cost real (no DnD installed; HTML5 drag fails on mobile touch) — name the dependency choice explicitly; (5) array-position ordering for v1 (no `display_order` schema field needed); (6) Unallocated bucket conditional rendering (push back on always-present); (7) workers_json privacy on public ClientPortal flagged as KI #27.
- ~12:25 Doron walked Mycelia's mockup iteration v1 → v4 + locked 13 design decisions; spec authored (~31 min Mycelia time).
- ~12:30 Phase 2.6 spec commit (`abb3916`) — `spec: Phase 2.6 line item entry redesign — entry-form-plus-groups, signed-off`. 396 lines new file at `Spec-Repo/spaces/field-service/PHASE-2-6-LINE-ITEM-ENTRY-REDESIGN.md`. 13 locked decisions covering architectural shape, group ordering, within-group ordering, Unallocated bucket, cross-group movement, group state, sticky checkbox, row anatomy, edit behavior, lockdown UX, validation, unsaved-on-navigate, empty state, subtotal strip, voice input. Phase 2.6.1 / 2.6.2 split; @dnd-kit selected; CSI MasterFormat uses preset order, others default to insertion order, drag overrides per-estimate.
- ~12:30–12:55 Phase 2.6 sign-off audit (~25 min). Audit findings: (a) ratify load-bearing decisions; (b) four documentation issues — DEC-148 cited for Living Feet but Living Feet is DEC-146; DEC-217 cited as "stable identifier" but is shadcn Select width; DEC-CD-018 hallucinated reference at §3.8.4; LineItemsEditor lifecycle internal contradiction (§3.1.2 says "retires" but §5.1 step 8 only swaps EstimateForm); §3.10.1 introduces three new line_item fields (`edited_after_lock`, `edited_at`, `edited_by`) but §4 data model doesn't document them; §3.11.1 validation gates Patricia's legacy `sub_name`-only lines without explicit rule. Build-readiness gate: yes-with-caveat — recommend small follow-up patch.
- ~13:00–13:15 Phase 2.6 patch 001 (`2b8686d`) — `spec: Phase 2.6 patch 001 — DEC reference fixes, lifecycle clarification, validation rule for legacy lines, edit-after-lock data shape, mobile picker direction, DnD substeps`. +50/−16. Seven sequential edits absorbing the audit findings; Doron's locked decision on validation: Option C (forces SubVendorPicker re-pick on legacy lines, natural-workflow reconciliation per Phase 2 §7.8). Phase 2.6.1 build now genuinely build-ready.
- ~13:20 Ship-it cycle drafted.

### Decisions made

- **DEC-218** ratified — **Half-done isn't done.** When a feature works ~30% of the time and fails silently the rest, the right move is removal, not iteration. Half-done creates noise in user mental models that compounds; better to revert the surface entirely than leave it as a confusing partial. Surfaced during Phase 2.5 rollback decision when Doron's screen-walk surfaced that auto-derivation fired correctly only when sub primary_trade_id matched a snapshot category by exact name AND user picked sub before trade — reality made both conditions rare. Promoted from session principle to formal DEC + foundational PROJECT-BRAIN principle. Status: Active. Applies platform-wide as a feature-evaluation discipline.
- **DEC-219** ratified — **DEC citation verification before locking spec text (Mycelia hygiene).** Mycelia must verify every DEC citation against canonical `DECISIONS.md` before locking spec text. Three hallucinated/wrong DEC references slipped through this morning's spec commit (`abb3916` cited DEC-148 for Living Feet — actually DEC-146; cited DEC-CD-018 — doesn't exist; cited DEC-217 as "stable identifier discipline" — actually shadcn Select width discipline). Hygiene rule: every DEC reference verified against canonical `DECISIONS.md` before commit, no citation from memory. Status: Active. Mycelia self-improvement discipline; not user-facing.
- **DEC-151 Spec Review Protocol applied (existing)** — Hyphae's exploratory architecture audit (~11:40–12:25 PT) caught the load-bearing CO parity gap (FSChangeOrder missing 3 schema fields), pushed back on the DnD library cost (forced explicit decision, not silent assumption), and corrected the Xactimate-default precision question. Audit-before-architecting paid for itself again — without it, Phase 2.6 would have shipped with a "flag flip" framing on CO parity that doesn't actually work.

### Known Issues affected

- **KI #24 — RESOLVED.** Yesterday's stale Vite dev-server `projectIdToEstimate` redeclaration phantom from May 8 4:20 PT cleared on its own when Hyphae restarted the preview server after the Phase 2.5 rollback. New dev server compiled cleanly with no Vite errors.
- **KI #27 — NEW.** workers_json privacy on public ClientPortal. ClientPortal reads the full FieldServiceProfile entity which includes `workers_json` (sub names + business_names; `primary_trade_id` stripped post-rollback). FieldServiceProfile has `permissions.read: true`. Anyone with a `portal_token` URL can fetch the contractor's full sub roster — Bari's competitive list of subs is exposed. Phase 2.5 didn't widen this exposure (read was already returning workers_json before Phase 2.5), but the issue is real. Fix is server-side: add a `getPublicFieldServiceProfile` server function that strips `workers_json` and returns only what ClientPortal needs (`business_name`, `brand_color`, `workspace_name`, `trade_categories_json`, `features_json`). Estimated build: ~30-45 min. Defer until directory exposure escalates or Bari complains.

### Seedlings flagged for future

1. **Phase 2.6 polish — `parseWorkers` deduplication via `peopleMap`.** Four duplicate `parseWorkers(profile?.workers_json)` inline helpers exist (`FieldServiceProjects.jsx:44-48`, `FieldServiceLog.jsx:75`, plus `parseWrappedArray` in `wrapShape.js`). With the `peopleMap` extension on `useWorkspacePeople` preserved through Phase 2.5 rollback, these helpers can migrate to `useWorkspacePeople(profile).peopleMap` (or `.allPeople` for array shape). DEC-146 Living Feet target — 4-instance threshold well past DEC-148's "three is a pattern" heuristic. Estimated work: ~20-30 min. Bundle into Phase 2.6.1 build or land as standalone polish commit.
2. **Seedling A — Desk Home tile drill-throughs.** Each numerical tile on the Desk Home (Clients, Active Projects, Estimates, This Month, Received, Team) should open a breakdown popup matching the existing Project Detail Received pattern. Each row in the breakdown clickable to drill into source records. Status: surfaced 2026-05-09 morning when Doron noted `$1,310 Received` tile was opaque (no idea where the number came from). Probably 2-3 hour focused session when prioritized. Phase 2 follow-up territory.
3. **Seedling B — `$1,310 Received` calculation discrepancy audit.** Specific bug in Desk Home Received aggregation. Doron has not recorded $1,310 as received but the tile shows it. Possible causes: aggregation pulling from wrong data source (counting estimated revenue as received), status logic counting pending/scheduled payments, cross-workspace bleed, date-range scoping wrong, or COs/estimate-acceptance double-counting. Investigation becomes feasible once Seedling A drill-through ships. Probably ½-1 hour focused work after Seedling A. Phase 2 follow-up territory.
4. **`getPublicFieldServiceProfile` server function (KI #27 fix when prioritized).** Strips `workers_json` from public-facing FieldServiceProfile reads.

### Calibration data (DEC-211)

| # | Session | Wallclock | Hyphae stamp | Complexity |
|---|---------|-----------|---------------|-------------|
| 1 | Phase 2.5 architecture consultation | ~50 min | ~50 min | investigation |
| 2 | Phase 2.5 build (single coherent phase) | ~50 min | ~45 min | build |
| 3 | Phase 2.5 rollback build (code only) | ~30 min | ~25 min | revert |
| 4 | Phase 2.5 migration code | ~10 min | ~10 min | build |
| 5 | Phase 2.5 migration --apply | ~5 min | ~5 min | execution |
| 6 | Phase 2.6 exploratory architecture audit | ~45 min | ~45 min | investigation |
| 7 | Phase 2.6 spec commit + sign-off audit | ~25 min | ~25 min | investigation + commit |
| 8 | Phase 2.6 patch 001 | ~15 min | ~15 min | polish |

Calibration trend through 27 cumulative sessions: today's investigation flavors held at the established 25–50 min range; build flavors continue to track Hyphae stamp closely; the rollback at ~30 min wallclock for 9 files / +60 / −228 is the first revert in the calibration table — comparable to a polish bundle in size, faster than a build because deletion is mechanically simpler than addition. Phase 2.5's architecture consultation paid for itself when it flagged the hook-vs-pure-function framing AND the CO parity gap that became Phase 2.6.2 scope; without it, Phase 2.5 would have shipped with the wrong abstraction AND Phase 2.6 would have shipped with a flag-flip framing on CO that doesn't work.

### Next

- **Phase 2.6.1 build** (~3-4.5 hours focused build with @dnd-kit + ~1h Doron-in-loop verification, single commit). Scope: entry-form-plus-groups workflow on FSEstimate alone; @dnd-kit drag-and-drop; three new components (`<LineItemForm>` + `<LineItemsByTrade>` + `<LineItemRow>`); confirm dialog for signed-doc edit interception; soft-delete-with-undo. Spec at `2b8686d`. Build queued for 2026-05-10.
- **Phase 2.6.2 build** (~2-3 hours focused build) — FSChangeOrder schema additions (`group_by_trade`, `taxonomy_preset_id`, `trade_categories_snapshot`, `trade_group_order`) + backfill migration (single-secret protocol — MIGRATION_SECRET kept live from today) + CO surface turn-on. Follows after 2.6.1 lands.
- **Then Phase 2 closes.** Queue picks up Phase 3 candidates (Client-as-Hub, Phase 2.7+ single-line-entry-point UX redesign — superseded by Phase 2.6 redesign), Stewardship + Nursery launches, FSPayment edit capability, Log-Line-Item Attribution Proposal sign-off.

**Ship-it timestamp:** 2026-05-09, ~13:30 PT. Phase 2.5 round-trip (build → rollback → migration → idempotent confirm) closed end-to-end. Phase 2.6 spec authored + sign-off audited + patched; build-ready baseline at `2b8686d`. 3 community-node commits + 2 Spec-Repo commits this section. Two new DECs (DEC-218 "Half-done isn't done" + DEC-219 DEC citation hygiene). Two new seedlings (Desk Home tile drill-throughs + $1,310 discrepancy audit) + KI #27 captured + KI #24 resolved. **Active paying members: 1 (Bari).**

---

## 2026-05-09 (Saturday afternoon — drill-through + Phase 1.0 commit 1 + spec patches 002-005 + Base44 incidents)

### Mid-day — drill-through Seedlings A+B (12:23-13:02 PT)

- ~12:23 Doron handed off Seedlings A+B audit prompt — drill-through breakdowns for Desk Home tiles (A) + `$1,310 Received` calculation discrepancy (B).
- ~12:23–12:30 Hyphae audit (~7 min) of `<ProjectTileDrillIn>` primitive at `src/components/fieldservice/ProjectTileDrillIn.jsx`. Findings: primitive already exists (no extraction owed); `$1,310 Received` bug root cause traced to `FieldServiceHome.jsx:153-158` missing direction filter. Sub Payments paid OUT to subs/vendors written with `direction: 'paid'` AND `status: 'received'` (the lifecycle marker, not "received income"); both directions union into "Received income" inappropriately.
- ~12:46–12:49 Hotfix commit (`472583c`) — added direction filter `(p.direction || 'received') === 'received'` + `parseFloat` normalization on the `paymentsReceived` aggregation. Mirrors gold-standard `summarizePayments` helper at `useFSPayments.js:27-38` used by Project Detail. ~3 min wallclock.
- ~12:53–13:02 Drill-through build commit (`14ba199`) — 6 tile drillConfig entries on FieldServiceHome (Clients / Active Projects / Estimates / Spent This Month / Received / Team) reusing existing `<ProjectTileDrillIn>` primitive; `useConsumePrefill` hook extracted to `src/hooks/useConsumePrefill.js` (Living Feet — 5+ inline consumers funneled through one hook); "This Month" tile renamed "Spent This Month" (its actual semantic is outgoing materials/labor cost, not income — sitting next to "Received" with old label invited mental-model confusion); migrated existing inline prefill consumers (Estimates + Log) where 3-line swap was clean; Documents inline consumer left in place (multi-key conditional with shared ref doesn't compose into single-key hook); three new prefill keys wired (`fs-people-prefill-client-id`, `fs-people-prefill-worker-id`, `fs-projects-prefill-project-id`/`payment-id`); Project Detail consumer wired with paired-key guard + ref-based single-fire scroll-flash mirroring same-component `goToPaymentRow` pattern. ~9 min wallclock for full build (Mycelia speculative was 3-5h; Hyphae actual 16-30x faster as expected pattern composition work).
- Doron published Base44 + reported "still $1,310" — initial diagnosis was correct (filter shape) but $1,310 was actually legitimate `direction: 'received'` test-data records from Test Client; the drill-through itself revealed the truth.

### Afternoon — Phase 1.0 spec evolution + commit 1 build (~13:30–14:47 PT)

- Doron uploaded specs to Mycelia: `LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md` (May 5, 330 lines) + `FINANCIAL-WORKFLOW-SPEC.md` (April 29, 817 lines).
- Doron locked **eight attribution Qs** (all to recommended defaults from May 5 spec): per-line rollup contractor-only on ClientPortal for fixed-price (Q1 → DEC-220); CO void → auto-shift attributed payments to Unallocated (Q2); `projectSpent` redefined to include attributed FSPayment(paid) (Q3); picker = type-ahead searchable from day one (Q4); picker = chronological order, estimate first then signed COs in order (Q5); FSDailyLog "primary line item" concept skipped per-day (Q6); picker label = "Line item" (Q7); FSCostItem library connection = forward-compat flag only (Q8).
- Doron locked **seven edit/delete Qs**: all four cost-tracking entities get edit/delete; soft delete (`deleted_at` + `deleted_by`); cleared-payment immutability with Reverse flow (`parent_payment_id` forward-compat); three-dot menu UX (`<RowActionsMenu>` composing shadcn DropdownMenu); cascade delete for FSDailyLog (children soft-delete with parent); edit modal reuses existing forms in `mode="edit"`; AuditLog row per edit + per delete.
- Doron chose **Option Z phasing** — ship attribution + edit/delete together as one architectural piece (rather than splitting commits across phases).

**Spec patches shipped (Spec-Repo, four sequential):**

| Patch | Commit | Content |
|---|---|---|
| 002 | (earlier afternoon) | Eight attribution Qs locked + seven edit/delete Qs + Option Z combined phasing — appends §12 (Decisions locked) + §13 (Edit/delete on cost-tracking entities) + §14 (Combined phasing) + §15 (DEC-219 enforcement update) |
| 003 | `f4e179f` | Citation hygiene fixes (DEC-178/193 misattribution corrections + dropdown-menu primitive reference replacing hallucinated "Recurring Transactions / FrequencyContext" pattern) + cascade atomicity callout (`softDeleteWithCascade` server function) + DEC-219 enforcement update — Hyphae sign-off audit caught two DEC drifts + one hallucinated codebase reference; same DEC-219 hygiene shape applied to non-DEC-citation drift case |
| 004 | `4d6c0fb` | §13.6 Material/Labor attribution (Phase 1.0 commit 1.5 scope) + §12 Q6 amendment — surfaced during Doron's commit 1 walkthrough; per-row attribution on FSMaterialEntry + FSLaborEntry rather than per-day inheritance on FSDailyLog parent |
| 005 | `0dbe54e` | §13.6 Pattern A/B/C/D enumeration replacing phantom Pattern 2/4 references — Hyphae's patch 004 sign-off audit observation; future readers can interpret §13.6 standalone without chat-history context. Pattern A (per-row) chosen over Pattern B (FSDailyLog inheritance) / Pattern C (allocation arrays) / Pattern D (FSCostItem auto-suggest) |

**Phase 1.0 commit 1 shipped (community-node) — `04162a8`:**

- 12 files, 746 insertions / 42 deletions
- New: `src/utils/softDelete.js` (`excludeDeleted` helper), `src/hooks/useContractLineItems.js` (chronological union of estimate + signed CO line items, dev warning on missing ids per spec §10), `src/components/fieldservice/LineItemPicker.jsx` (type-ahead picker composing shadcn Command + Popover; graceful degradation for no-project / no-estimate / orphaned-line cases), `base44-prompts/PHASE-1-0-LINE-ITEM-ATTRIBUTION-AND-SOFT-DELETE.md`
- Modified: FieldServiceLog.jsx (LineItemPicker integration on Sub Payment + Client Payment forms; `line_item_id` added to FSPayment payload), FieldServiceProjects.jsx (largest — workspace allPayments query, projectSpent + spendByProject semantic update including FSPayment(paid), per-line rollup view section, Spent tile caption, drill-in subtitle/footer/rows update, soft-delete sweep), FieldServiceHome.jsx + FieldServiceClientPortal.jsx + FieldServiceTimeline.jsx + FieldServiceReport.jsx + useFSPayments.js + ClientPortal.jsx (soft-delete read-path filter sweep at 27 sites total)
- Wallclock: ~13 min Hyphae build (Mycelia speculative 3.5-5h; Hyphae audit estimate 3.5-5h; actual ~16-23x faster — calibration data point #71)
- Doron verified working in production after publish: LineItemPicker visible on Sub Payment + Client Payment forms; "No line items available — Unallocated" graceful degradation; per-line rollup view renders with Estimated / Billed / Cost / Variance columns + Unallocated row at bottom; Spent tile shows new caption "Materials + labor + sub payments"; drill-in subtitle/footer updated.

### Diag-ping #1 + revert (verifying deploy pipeline)

- After commit 1 shipped, Doron's hard-refresh on Sub Payment form did NOT show LineItemPicker initially. Two hypotheses: (a) Base44 deploy pipeline slow, (b) picker integration bug.
- Diag-ping commit (`cb7292a`) — tiny visible amber badge at top of Log tab to test deploy pipeline narrowly. Outcome C confirmed: deploy was just slow earlier; both diag marker AND picker landed together.
- Revert commit (`212be2f`) — single-block delete after Outcome C confirmed.

### Base44 platform incidents (3 in 100 minutes — KI #28)

- **Gate 1 (Phase 1.0 commit 1 schema — FSPayment + soft-delete fields on 4 entities):** APPLIED CLEAN. Auto-commit `22ed68f`. 10 fields added across 4 entities (FSPayment.line_item_id, FSPayment.parent_payment_id, FSPayment.deleted_at, FSPayment.deleted_by; FSMaterialEntry.deleted_at + deleted_by; FSLaborEntry.deleted_at + deleted_by; FSDailyLog.deleted_at + deleted_by). RLS audit confirmed all four entities have `rls.update: {"created_by": "{{user.email}}"}` PRESENT.
- **Gate 2 (rls.update removal on all four entities):** **BLOCKED by Base44 platform issue.** Security panel won't load, agent approval prompts stuck pending, hard refresh + manual edit both blocked. **KI #28 captured.** Resolution deferred. Critical: gates commit 2's `withAuditLog` + `softDeleteWithCascade` server functions (asServiceRole writes against all four entities require rls.update absence per DEC-215). Commit 2 build deferred until KI #28 resolves.
- **Commit 1.5 schema gate (FSMaterialEntry.line_item_id + FSLaborEntry.line_item_id):** **FAILED with timeout/error.** Request ID `0432acde-c8e7-42d4-b92d-8d5947f6fb3c`. Both writes rolled back per Doron's entity browser verification. **KI #28 territory expanded — multi-symptom incident.** Commit 1.5 build deferred until Base44 schema agent recovers.

### Diag-ping #2 (verify deploy pipeline post-schema-error)

- After 16:11 PT schema agent error, raised the question: is broader Base44 platform impaired or just the schema agent? Tiny visible commit (`ecdf140`) — sky-blue badge at top of Desk Home, different surface from diag-ping #1 to clearly distinguish as fresh check.
- Revert bundled into this ship-it cycle.

### Security work

- Two HTTP security headers cleared via Base44 Security panel:
  - `X-Frame-Options: SAMEORIGIN`
  - `Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), midi=(), vr=(), gyroscope=(), accelerometer=(), magnetometer=(), interest-cohort=()`
- Five RLS Issues findings ratified as **deliberate per DEC-095 amendment + DEC-215** — NOT to be "Fixed" via Base44 panel. Architectural state: `asServiceRole` writes require `rls.update` ABSENCE; resolved cleanly post-Supabase migration when RLS layer changes.
- Two Exposed Secrets findings (hardcoded admin user IDs in `migrationHelpers` + `reparentBusiness` server functions) — captured as **KI #29**. Pre-migration cleanup target.
- Two Unauthenticated Backend Functions findings (`voidChangeOrder` lacks auth check; `manageNetworkApplication` hardcoded email auth) — captured as **KI #30** (voidChangeOrder) + **KI #31** (manageNetworkApplication). Pre-migration cleanup targets.

### Migration discussion opened

- Doron framing: *"I am getting over base44 and the issues we are having. Perhaps it is time we start to work on migration."* — surfaced after the third Base44 incident in 100 minutes.
- Mycelia honest recalibration: 30-50 combined hours (Hyphae + Doron) rather than the multi-month framing from the original Phase 5/6 spec. Sequencing: complete "Bari working well" first (Phase 1.0 commit 2 + Phase 2.6.1 + Phase 2.6.2 + polish + KI #27), then migrate. Custody trial 2026-05-19 respected as constraint.
- Migration audit deferred to dedicated future session — substantive enough to warrant standalone scope.

### Decisions ratified afternoon

- **DEC-220** ratified — **Per-line rollup contractor-only on ClientPortal for fixed-price contracts.** First of eight attribution-decision locks from `LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md` §12 row 1; the per-line rollup view (Estimated / Billed / Cost / Variance per contract line item) renders on Project Detail (contractor surface) but NOT on ClientPortal (public-facing client surface) for fixed-price contracts. Two-World Architecture (DEC-203) at the trust boundary: per-line cost data is contractor-internal; client sees only what she contractually needs (high-level Contract / Received / Paid Out / Net Cash banner). Cost-plus / T&M handling deferred to post-migration when Estimate Types ship. Status: Active. Reference: spec §12 row 1.
- The other seven attribution Q-locks remain captured in `LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md` §12 (rows 2-8) — internal to the Phase 1.0 / commit 1.5 build scope, not separately ratified as DECs since they are not platform-wide architectural rules.

### Known Issues affected (afternoon)

- **KI #28 NEW** — Base44 platform incidents (multi-symptom): Security panel won't load (gates Gate 2 rls.update removal across 4 entities — blocks commit 2 build), schema agent timeout/error (rolled back commit 1.5 schema additions — Request ID `0432acde-c8e7-42d4-b92d-8d5947f6fb3c`), deploy pipeline slowness (initial commit 1 publish lag — confirmed via diag-ping cycle). Multiple symptoms suggest broader platform stability issue rather than isolated single surface. Awaiting Base44 recovery.
- **KI #29 NEW** — Exposed Secrets findings: hardcoded admin user IDs in `migrationHelpers` + `reparentBusiness` server functions. Captured during afternoon Security panel review. Pre-migration cleanup target.
- **KI #30 NEW** — `voidChangeOrder` server function lacks auth check (Unauthenticated Backend Functions finding). Pre-migration cleanup target.
- **KI #31 NEW** — `manageNetworkApplication` hardcoded email auth (Unauthenticated Backend Functions finding). Pre-migration cleanup target.
- **KI #26 (FSPayment.rls.update PRESENT)** — now expanded scope: gates not just future asServiceRole writes against FSPayment but also Phase 1.0 commit 2's `withAuditLog` + `softDeleteWithCascade` server functions across all four cost-tracking entities (FSPayment, FSMaterialEntry, FSLaborEntry, FSDailyLog). Resolution rolled into KI #28's Base44 platform recovery.

### Calibration data afternoon (DEC-211 #64 through #74)

| # | Session | Wallclock | Hyphae stamp | Complexity |
|---|---------|-----------|---------------|-------------|
| 64 | Drill-through Seedlings A+B audit | ~7 min | ~7 min | investigation |
| 65 | Drill-through hotfix (direction filter) | ~3 min | ~3 min | hotfix |
| 66 | Drill-through build (6 tiles + hook + rename) | ~9 min | ~9 min | build (pattern composition, 16-30x faster than estimate) |
| 67 | Spec patch 002 sign-off audit + commit | ~25 min | ~25 min | investigation + commit |
| 68 | Spec patch 003 commit | ~9 min | ~9 min | spec patch |
| 69 | Spec patch 004 commit | ~5 min | ~5 min | spec patch |
| 70 | Spec patch 005 commit | ~2 min | ~2 min | spec patch (single edit) |
| 71 | Phase 1.0 commit 1 build | ~13 min | ~13 min | build (~16-23x faster than 3.5-5h estimate) |
| 72 | Diag-ping commit + revert | ~3 min | ~3 min | tiny diagnostic |
| 73 | Diag-ping #2 commit | ~2 min | ~2 min | tiny diagnostic |
| 74 | Cumulative ship-it cycle | (this session) | (this session) | docs sweep |

Pattern continues: build flavors at familiar-pattern composition compress 16-30x; audits hold at estimated wallclock; spec patches compress to ~minutes once Find/Replace boundaries are clear.

### Next session opens with

1. **Phase 1.0 commit 1.5 build** — when Base44 schema agent recovers from KI #28. Retry of `base44-prompts/PHASE-1-0-COMMIT-1-5-MATERIAL-LABOR-ATTRIBUTION.md` (FSMaterialEntry.line_item_id + FSLaborEntry.line_item_id additions). Build prompt + spec already ready (spec at `0dbe54e`).
2. **Phase 1.0 commit 2 build** — when KI #28 fully resolves AND Gate 2 (rls.update removal on all four cost-tracking entities) clears. Edit/delete on all four entities + cleared-payment immutability + Reverse minimum-viable + cascade-delete server function.
3. **Phase 2.6.1 + 2.6.2 builds** — queued; spec at `2b8686d`; CO migration uses MIGRATION_SECRET kept live from Phase 2.5 rollback.
4. **Migration audit** — dedicated session to scope the 30-50 hour Hyphae+Doron migration to Supabase + Vercel.
5. **Five-tile drill-through verification** — deferred from morning (Doron walking each of 6 Desk Home tiles in production).

**Ship-it timestamp:** 2026-05-09 ~16:30 PT. Cumulative Saturday: 7 community-node commits + 6 Spec-Repo commits across the day. Three new DECs (DEC-218, DEC-219, DEC-220). Four new KIs (#28, #29, #30, #31). Phase 1.0 commit 1 shipped + verified; commit 1.5 spec-ratified, build deferred on KI #28; commit 2 blocked on KI #28. Drill-through Seedlings A+B closed. Migration discussion opened (audit deferred to future session). **Active paying members: 1 (Bari).**

---
