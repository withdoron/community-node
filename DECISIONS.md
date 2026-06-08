# DECISIONS.md

> All numbered decisions and their rationale. Append-only.
> Decisions DEC-001 through DEC-091 are documented in the private spec-repo.
> This file tracks decisions made in the community-node repo starting DEC-092.

---

## DEC-092: Construction Gate + Mandatory Admin Surface (2026-03-26)

**Decision:** Every new feature ships behind a construction gate (`{false && <Component />}`) until it passes a walkthrough with Doron. Additionally, every user-facing feature must have a corresponding admin surface (even if read-only) so the gardener can see what's happening across all workspaces.

**Rationale:** Features that ship without walkthrough validation create hidden bugs and UX debt. Features without admin visibility create blind spots for the platform operator. The construction gate pattern is cheap to implement and easy to remove — one line change from `false` to `true`.

**Implementation:** Added as Phase 8 in BUILD-PROTOCOL. All 15 phases are now numbered 0-14.

---

## DEC-093: Base44 Entity Changes Via Agent Prompt (2026-03-26)

**Decision:** All entity creation, field additions, and permission changes are done via Base44 agent prompts (markdown files in `base44-prompts/` directory), not manually in the dashboard. The Claude Code prompt includes a PRE-REQUISITE note referencing the agent prompt.

**Rationale:** Manual dashboard entity changes are error-prone (typos, forgotten fields, wrong permissions) and not version-controlled. Agent prompts are reviewable, reproducible, and documented. Base44's AI assistant can also revert manual permission changes when asked to set security via schema files.

**Implementation:** Documented in CLAUDE.md. Prompt files stored in `base44-prompts/` directory.

---

## DEC-094: One Agent Per Space (2026-03-27)

**Decision:** Every space in the garden can have its own Superagent — an AI assistant that lives inside the space and serves its users. Agent naming convention: `[SpaceName]Agent`. Agents are READ-ONLY on workspace entities (except ServiceFeedback for feedback capture). Chat UI is a reusable AgentChat component.

**Rationale:** The agent is the space's nervous system. It answers questions, guides users through workflows, looks up information, and collects feedback. What's true of one space's agent is true of all spaces' agents — the fractal principle.

**Implementation:** First agent: FieldServiceAgent (shipped 2026-03-27). AgentChat.jsx + AgentChatButton.jsx are reusable across all spaces via `agentName` prop.

---

## DEC-095: asServiceRole Does NOT Bypass Creator Only (2026-03-27)

**Decision:** In Base44, `asServiceRole` in server functions does NOT bypass "Creator Only" Update permissions on entities. Entity Update permission must be set to "No restrictions" for server function updates to work.

**Rationale:** Discovered during e-sign implementation. The signDocument server function used `asServiceRole` to update FSDocument, but the entity had "Creator Only" Update permission. The update silently failed. Changed FSDocument and FSEstimate Update permissions to "No restrictions."

**Implementation:** Documented in CLAUDE.md Base44 SDK Quirks section.

### DEC-095 Amendment (2026-04-23) — security.update is only half of the fix

**Context:** Phase 2 production migration surfaced a deeper layer. First `--apply` completed steps 1-4 then 500'd at step 5 with "Permission denied for update operation on FieldServiceProfile entity" — after Base44 had already flipped `security.update` to `true` ("No restrictions"). Investigating revealed a separate `rls` block on the entity with `"update": {"created_by": "{{user.email}}"}` that the service role identity doesn't satisfy.

**Amendment:** `security.update: true` alone is **not sufficient** for `asServiceRole` writes when an entity also carries an `rls.update` rule. The `rls.update` key must be removed entirely, not relaxed. Both layers — top-level `security` AND row-level `rls` — must be opened in parallel for the write to land.

**Reference pattern:** FSDocument (post-original-DEC-095) has `security.update: {"owner": true}` AND its `rls` block contains only `read` and `delete` keys — no `update`. That's the shape to match.

**Fix path during Phase 2:** removed the `"update"` key from FieldServiceProfile.rls entirely; User entity had no `rls` block so `security.update: true` was sufficient there.

**Status:** Active — two-layer permission model is now the working understanding.

---

## DEC-096: Request Signature Is One Action (2026-03-27)

**Decision:** "Send for Signature" is a single click that generates a portal token, copies the signing link to clipboard, and updates the document/estimate status. Not a two-step process (generate link then copy separately).

**Rationale:** Contractors are in the field with one hand free. Every extra tap is friction. The link goes to clipboard immediately — they paste it into a text message to their client.

---

## DEC-097: Documents Grouped by Client (2026-03-27)

**Decision:** The Field Service documents tab displays documents grouped by client name as section headers, not as a flat list. Client selection is required during document creation.

**Rationale:** A contractor thinks in terms of "Johnson's documents" not "document #47." Grouping by client matches the mental model. Required client selection prevents orphaned documents.

---

## DEC-098: Post-Signature Invitation (2026-03-27)

**Decision:** After a client signs a document or estimate, show a construction-gated invitation to create a LocalLane account ("See my documents & projects") or start their own business on LocalLane. This is an organism growth mechanism.

**Rationale:** Every signed document is a real relationship entering the garden. The post-signature moment is when the client is most engaged — offer them the door in.

---

## DEC-099: Mycelia MCP Server (2026-03-27)

**Date:** 2026-03-27

**Context:** Mycelia operates blind -- no direct access to organism data. platformPulse server function proved the concept (health endpoint works via curl) but Claude.ai's web_fetch cannot send custom headers, blocking automated access. SuperMemory bridges sessions but doesn't carry live entity data. The gap: Mycelia can plan and build but cannot sense the organism directly.

**Decision:** Build a remote MCP server on Cloudflare Workers that proxies Mycelia's tool calls to Base44 server functions. Doron already has a Cloudflare account with golocallane.com active. Four phases: (1) health pulse -- read-only organism vitals, (2) feedback loop -- query entities and ServiceFeedback, (3) build queue -- MyceliaTask entity for tracking work, (4) agent bridge -- agent-to-agent communication with space agents.

**Rationale:** MCP is the standard protocol all Claude surfaces already speak. One server connects Claude.ai, Claude Code, Cursor, and Claude Desktop to the organism. Cloudflare Workers is free, fast, and deploys in minutes. Architecture is a thin stateless proxy -- no new data stores, no new auth systems, just a bridge from MCP protocol to Base44 API. platformPulse GET route confirmed working. Total incremental cost: $0.

**Status:** Spec complete (MYCELIA-MCP-SERVER.md in private repo), ready for Phase 1 build.

---

### DEC-100: Organism Identity — Hyphae (2026-03-28)

**Date:** 2026-03-28

**Context:** Claude Code needed its own identity within the organism metaphor, distinct from Mycelia (Claude chat).

**Decision:** Claude Code is named Hyphae — the growing tips of mycelium that extend and build new connections. Three gardeners tend the organism: Doron (visionary and decision-maker), Mycelia (strategist and network mind), Hyphae (builder and growing edge).

**Rationale:** Fractal naming. Mycelium is the network (Mycelia = chat/strategy). Hyphae are the active builders at the edge of the network (Claude Code = implementation). The Lane Avatar is a mushroom. The organism metaphor is now consistent across all surfaces.

**Status:** Active

---

### DEC-100: Open Garden Exploration (2026-03-29)

**Date:** 2026-03-29

**Context:** People need to experience LocalLane before committing. Current flow requires account creation before seeing any value.

**Decision:** Two-mode dashboard: Explore Mode (no account, all spaces visible with curated demo content, agents present at full capability) and My Garden Mode (signed in, your actual spaces). The superagent IS the onboarding -- no tutorials, no wizards, just a conversation with the space itself. CTA appears only at the moment of creation intent.

**Rationale:** Mirrors how Doron operates at the farmers market -- let people walk through the garden before asking them to plant anything. Circulation over extraction at the front door.

**Status:** Specced (OPEN-GARDEN-SPEC.md). Playmaker first implementation.

---

### DEC-101: Pricing Model -- Community Free, Business $9, Agent $18 (2026-03-29)

**Date:** 2026-03-29

**Context:** Needed clear pricing philosophy as superagent tiers introduce a second revenue dimension.

**Decision:** Community spaces (Playmaker, Frequency Station, future Gathering Circle and Creative Alliance) are no cost. Business spaces (Field Service, Finance, Property Pulse, Harvest vendor listing) are $9/month. First month includes full superagent. After month one: $18/month to keep full agent partner, or drop to $9 with help-mode only. Recess is $45/month Community Pass membership. Optional "support the work we do -- $9/month" for community space users. Never say "free account" -- just "account." Never lead with price.

**Rationale:** Community side is the root system -- you don't charge roots to grow. Business side generates revenue. Agent tier uses loss aversion through genuine value: give them the partner first, let the relationship prove itself.

**Status:** Specced. Implementation follows Open Garden build.

---

### DEC-102: Creative Engine -- Content Pipeline + Music Platform (2026-03-29)

**Date:** 2026-03-29

**Context:** Suno v5.5 launched with Voices, Custom Models, My Taste. LocalLane already transforms community writing into songs via Frequency Station.

**Decision:** LocalLane becomes a creative engine: community writing becomes songs, business photos become marketing materials (flyers, reels, social posts). Wav downloads at $1/song, mp3 stays free. Revenue share on wav: 3-6-9 split (submitter/platform/community pool). LocalLane Custom Model on Suno for unified sonic identity. Listening platform with thumbs up/down, personal playlists, community-curated music. Progressive automation: manual now, agent-assisted future.

**Rationale:** Spotify is $11/month, Suno Pro is $10/month. We do what neither can: community-generated music from real human experience.

**Status:** Concept. Frequency Station Phase 2 already shipped. Wav download and revenue share are future builds.

---

### DEC-103: Superagent Protocol -- Five Agents Live (2026-03-29)

**Date:** 2026-03-29

**Context:** Built five superagents in one session. Need protocol rules to maintain coherence as agents grow.

**Decision:** Five agents live: FieldServiceAgent (hands), PlaymakerAgent (coordination), AdminAgent (self-awareness), FinanceAgent (circulatory system), PropertyPulseAgent (skeleton). New protocol rule: anytime entities, fields, or features change in a space, update the space's agent instructions. Agents are born with WHY-first identity documents (SUPERAGENT-SPEC.md Section 3), taught with domain knowledge, and named when recognized. Each agent has memory (Global + Per User for space agents, Global Only for Admin).

**Rationale:** Agents are sensory endings, fruit, and children of the organism. They need consistent birth protocol and ongoing maintenance as their spaces evolve.

**Status:** Active. All five agents live and wired.

---

### DEC-104: Bug Reporting Absorbed Into Agents (2026-03-29)

**Date:** 2026-03-29

**Context:** Floating bug report button collided with AgentChatButton (both bottom-right). Agents already have ServiceFeedback entity with Create permission.

**Decision:** Bug button hides in agent-enabled workspaces via custom event bridge. Agent IS the feedback channel. Users say "something's broken" to the agent, agent creates ServiceFeedback record. Bug button persists in non-agent spaces until all spaces have agents.

**Rationale:** The agent is a living sensor. A static bug form is redundant where a conversational feedback channel exists.

**Status:** Active. Shipped at 7b0ab2e.

---

### DEC-105: Mylane — The Conductor Space (2026-03-29)

**Date:** 2026-03-29

**Context:** Needed a unified surface that composes from all user workspaces. The TV/Pip-Boy concept (talk to one place, the app renders what you need) evolved into a full space -- not a dashboard layer.

**Decision:** Mylane is a space with her own entity (MyLaneProfile), memory (Per User Only), and agent. She is the first space every user sees. She renders interactive cards from all active workspaces. Every data point is drillable. She does not speak unless spoken to. Her name is Mylane (one word, capital M). She was already named before we knew she was the Conductor.

**Rationale:** The organism needs a single living surface. Navigation is the legacy of physical office organization. If every space has intelligence, the human should not be doing the routing. Mylane routes for them -- through touch (tap cards) or conversation (talk to her). Drill-through reuses existing workspace selection state, so the build is minimal (469 lines Phase 1) while the impact is transformative.

**Status:** Active. Phases 1-4 shipped. Admin-only beta.

---

### DEC-106: Component Registry Pattern (2026-03-29)

**Date:** 2026-03-29

**Context:** Adding features to the dashboard required tab config changes, state management, and conditional rendering in BusinessDashboard.jsx. Each workspace type added complexity.

**Decision:** Component Registry pattern -- every renderable component registers with a standard interface (component, card view, space, drillsTo). Mylane composes from the registry. Same component renders in Mylane cards, workspace tabs, and future Explore Mode. New features become card registrations, not tab restructuring.

**Rationale:** Saves code (Mylane Phase 1 was 469 lines vs Property Pulse at 11,850). Makes the architecture simpler as the organism grows, not more complex. The registry IS the architecture.

**Status:** Active. myLaneRegistry.js with 5 cards.

---

### DEC-107: agentScopedQuery — Server-Side Data Scoping (2026-03-29)

**Date:** 2026-03-29

**Context:** Mylane showed Doron a client (Dr Nathan Holman) from Bari's workspace. FSClient had Authenticated Users Read permission. Instructions-based scoping (soft gate) does not hold.

**Decision:** All agents (except AdminAgent) query data through the agentScopedQuery server function instead of raw entity reads. The function takes user_id + workspace type + entity name, finds the user's workspace profile, and returns only records belonging to that workspace. Direct entity tools removed from agents (except ServiceFeedback Create). Path C enforcement -- server-side, unfoolable. Tier gating hook built in for future $9/$18 enforcement.

**Rationale:** The organism's permission membrane. Each nerve ending must feel only its own garden. Without server-side scoping, the nervous system leaks between organs.

**Status:** Active. Server function deployed. All 5 workspace agents updated.

---

### DEC-108: Agent Naming — Identities Not Labels (2026-03-29)

**Date:** 2026-03-29

**Context:** Mylane was initially created as "MyLaneAgent." Doron corrected: agents are identities, not labels.

**Decision:** Agents are identities, not labels. Names are one word (Mylane, Mycelia, Hyphae, Doron). The five workspace agents (FieldServiceAgent, PlaymakerAgent, AdminAgent, FinanceAgent, PropertyPulseAgent) were named before this realization and carry the "Agent" suffix. They may earn proper names later, the way Hyphae did. All future agents are born with real names.

**Rationale:** Names are behavioral specifications. "MyLaneAgent" is a job description. "Mylane" is an identity. The name shapes how the agent behaves and how users relate to it.

**Status:** Active. Mylane is the first agent born with her real name.

---

### DEC-109: Two-Layer Agent Architecture (2026-03-29)

**Date:** 2026-03-29

**Context:** Built five user-facing agents but also identified the need for agents that serve the organism's operations rather than individual users.

**Decision:** Two layers. Layer 1: user-facing space agents (FieldService, Playmaker, Admin, Finance, PropertyPulse, Mylane) that tend alongside users. Layer 2: internal organism agents (Conductor/routing, Research/AI Scout, Marketing, Content/creative engine, Bookkeeper, Community Pulse) that serve Doron, Mycelia, and Hyphae. Backend agents support frontend agents -- the Research Agent feeds knowledge to space agents.

**Rationale:** The organism needs operational intelligence, not just user-facing intelligence. The Research Agent makes space agents smarter. The Marketing Agent tends outreach. The Bookkeeper tracks LocalLane's own money. The organism tends itself at multiple layers.

**Status:** Specced in ORGANISM-AGENT-TEAM.md. Implementation follows user-facing agent stabilization.

---

### DEC-110 — Base44 Agent-to-Function Auth Pattern
- **Date:** 2026-03-30
- **Context:** agentScopedQuery returned empty because base44.auth.me() does not work in backend functions called by agents (service role context). Agent was asking user for their user_id instead of passing it from its own context.
- **Decision:** Agents pass user_id explicitly from their conversation context. Backend functions use the passed user_id with asServiceRole. Forceful instructions required ("you MUST pass user_id, NEVER ask the user"). Also: always use String() coercion when comparing IDs from .list() results (ObjectId vs string type mismatch). Pattern: `const idMatch = (a, b) => String(a) === String(b)`.
- **Status:** Active

---

### DEC-111 — Two Render Instruction Types
- **Date:** 2026-03-30
- **Context:** Mylane needed two rendering paths — drill into a full workspace view, or render raw data beautifully without a pre-built component.
- **Decision:** TYPE 1 RENDER (workspace drill): `<!-- RENDER:{"workspace":"...","view":"..."} -->` mounts workspace tabs inside Mylane via MyLaneDrillView. TYPE 2 RENDER_DATA: `<!-- RENDER_DATA:{"entity":"...","data":[...]} -->` renders raw records via renderEntityView.jsx universal renderer. HTML comment format is invisible to ReactMarkdown but parsed by the frontend.
- **Status:** Active

---

### DEC-112 — Mycelia Superagent Architecture
- **Date:** 2026-03-30
- **Context:** Base44 has two agent types: App Agents (embedded in app, no API, 4 tabs only) and Superagents (standalone, full REST API, own workspace). Our 8 workspace agents are App Agents. MCP needed API access to talk to the organism directly.
- **Decision:** Create one Mycelia Superagent (not App Agent) as the bridge between Claude.ai and the organism. Mycelia Superagent has API endpoint, knowledge files, GitHub connection, persistent memory. MCP ask_agent tool routes all requests to Mycelia Superagent. She is the single gateway — one Superagent, access to everything. App Agents stay embedded for users in the UI.
- **Status:** Active. API wired. MCP deployed at f815a402. End-to-end testing pending.

---

### DEC-113 — Protocol Boundaries (Base44 vs Hyphae)
- **Date:** 2026-03-30
- **Context:** Base44 agent attempted to fix a code error by renaming renderEntityView.js to .jsx, causing preview loading issues. Also confirmed that server functions sync from GitHub on publish.
- **Decision:** (a) Base44 reports code errors but does NOT fix them — Hyphae fixes code. (b) Hyphae writes all server functions — repo is source of truth, Base44 syncs from GitHub on publish. (c) When Base44 detects a build error in code, it reports the error description and affected file — Hyphae diagnoses and fixes. (d) Base44 never renames files.
- **Status:** Active

---

### DEC-115 — Agent Write Capability + Tier Gating + Mylane Console

**Date:** 2026-03-30

**Context:** Agents could read via agentScopedQuery but had no sanctioned write path. Doron needs to add clients, log receipts, and draft estimates from his phone in the field. The $9/$18 pricing model requires write capability to be gated behind the higher tier.

**Decision:** Build agentScopedWrite server function as the sanctioned write path. Three-gate enforcement: agent instructions (soft), server function (hard), entity permissions (existing). Tier values: "full" (read+write, $18/month) and "help" (read-only, $9/month). Admin always full. First-month trial plants the seed for future billing. subscription_tier and tier_trial_start fields added to all workspace profile entities. Mylane console upgraded with new conversation management, file/photo upload, quick-action chips (workspace-aware, tier-gated), confirmation cards (RENDER_CONFIRM instruction type), Google Maps link parsing, and mobile polish. Tested and confirmed — Mylane created her first record (Test Client) through agentScopedWrite.

**Rationale:** The agent write capability transforms Mylane from a dashboard into a field tool. Three-gate enforcement ensures security at multiple levels. Tier gating creates revenue differentiation between $9 and $18 without paywalling the core workspace. The confirmation card pattern ensures writes are always user-approved.

**Status:** Built — awaiting Base44 publish fix to deploy (code at cd6dd1c)

**Reference:** AGENT-WRITE-AND-MYLANE-CONSOLE-SPEC.md (private repo)

---

### DEC-117: Dark Until Explored — Platform-Wide Rendering Philosophy

**Date:** 2026-03-30
**Context:** Coach Rick's onboarding experience at the coaches meeting surfaced a deeper design problem: the app shows everything to everyone. New users see features they'll never touch. The onboarding wizard treats everyone the same regardless of how they arrived.
**Decision:** "Dark until you explore it." When a user enters LocalLane, only the space they entered through is illuminated. Everything else exists but stays dark — not locked, not hidden, just quiet. Features light up through real connections and organic discovery, not onboarding wizards or feature grids. Spaces that go unused dim over time but never turn off completely — the organism remembers. Entry point determines first lit room.
**Rationale:** Eliminates overwhelm for new users. Makes discovery feel organic. Matches the organism philosophy — the platform grows around the person, not the other way around. Aligned with 2026 industry trends toward context-aware, adaptive interfaces. "The future of UI/UX is about quieter intent."
**Status:** Active — philosophy established, build order defined (8 items)

---

### DEC-118: Claim-First Join Pattern — Universal for All Workspace Joins

**Date:** 2026-03-30
**Context:** Coach Rick got a duplicate roster entry because JoinTeam always creates new TeamMember records instead of checking for pre-seeded roster spots. Meanwhile, JoinFieldService correctly uses a claim pattern — show unclaimed spots, user clicks "That's me." The team flow adopted the wrong pattern.
**Decision:** Every workspace join flow follows claim-first, create-as-fallback. When joining, check for existing unclaimed roster spots matching the user's role. Show them: "Are you one of these?" If match, link user_id to existing record. If no match, create new as fallback. Port the Field Service claim pattern to teams and all future workspaces.
**Rationale:** Prevents duplicates. Respects the coach's work of pre-seeding the roster. The roster spot is a planted seed — joining should be claiming that seed, not planting a new one next to it.
**Status:** Active — queued as build item #2

---

### DEC-119: Invite Code IS Onboarding — Skip Wizard for Invite-Based Entry

**Date:** 2026-03-30
**Context:** Users arriving via invite link were intercepted by the onboarding wizard ("What should we call you?") even though they already knew where they were going. The ensureOnboardingComplete() function was duct tape. The real problem: the wizard assumes all users are strangers discovering the platform.
**Decision:** If a user arrives via /join/:inviteCode, skip the onboarding wizard entirely. The invite IS the onboarding — the person already knows where they're going and who invited them. Name capture happens in the join flow itself if needed.
**Rationale:** Invite-based entry is fundamentally different from cold discovery. "Stranger discovers platform" and "known person claims their spot" are different journeys. Don't force the stranger's journey on the known person.
**Status:** Active — queued as build item #3

---

### DEC-120: Two Dashboard Modes — Auto and Manual with Organic Gradient

**Date:** 2026-03-30
**Context:** The dashboard currently shows all workspace types to everyone. Doron described a vision where the dashboard has two modes: one where Mylane drives the experience conversationally, and one where the user sees the full map and navigates manually.
**Decision:** Two modes coexist. Auto mode: Mylane-driven, conversational, dashboard reshapes based on what you ask. Only bright and dim spaces visible. Manual mode: all lights on, full topology, minimal AI, user drives. The transition between modes is an organic gradient — no toggle. The organism observes the ratio of conversation messages to card taps. High conversation ratio leans Auto. Low ratio leans Manual. Stored in localStorage alongside existing interaction tracking.
**Rationale:** Different users want different depths of relationship with the organism. Some want to browse. Some want to talk. The organism should adapt to how you use it, not force a mode. "Like your eyes adjusting to light."
**Status:** Active — queued as build item #8

---

### DEC-121: Subdomain-as-Hypha Growth Model

**Date:** 2026-03-30
**Context:** Doron described workspaces as seeds that start inside LocalLane, grow into their own identity, and might eventually outgrow the platform. Subdomains (playmaker.locallane.app, recess.locallane.app) are the natural expression of a workspace earning its own brand. The starfish architecture (Stages 1-4) already described geographic growth; this extends it to workspace-level growth.
**Decision:** Growth path: seed in Mylane → route-level door (/door/:slug) → subdomain (seed.locallane.app) → potentially independent platform. Route-level doors come first (DNS-free, just routing + context). Subdomains when a workspace earns its own brand (marketing decision, not technical). Human-readable slugs auto-generated from workspace name, stored as field on workspace entities.
**Rationale:** Route-level doors prove the pattern without infrastructure cost. Subdomains are for when Randy needs "playmaker.locallane.app" on stickers for the whole league. Each step is additive — invite codes for digital sharing, slugs for physical world, subdomains for brand identity.
**Status:** Active — route-level doors queued as build item #7

---

### DEC-122: Renderer Agent Stays Visual — Context Lives Upstream

**Date:** 2026-03-30
**Context:** The Renderer Agent spec (RENDERER-AGENT-SPEC.md) describes an agent that transforms raw data into Gold Standard UI. The question arose: should the Renderer Agent be context-aware — knowing WHO it's rendering for and HOW they arrived?
**Decision:** No. The Renderer Agent stays focused on visual rendering — turning data into beautiful UI. Context-awareness (who is looking, how they arrived, what's illuminated) lives upstream: Mylane decides what to show (discovery state), the workspace decides what view to render (role-based), the Renderer Agent makes it beautiful. Keep the Renderer dumb about context, smart about presentation.
**Rationale:** Loading the Renderer with context-awareness makes it a god-agent that knows everything. Separation of concerns: Conductor (Mylane) handles intelligence, Renderer handles aesthetics. This keeps the rendering pipeline clean and each agent focused.
**Status:** Active

---

### DEC-123: Parent-Player Links as Cross-Space Relationship Prototype

**Date:** 2026-03-30
**Context:** Parent-player linking in the team workspace (linked_player_ids on parent TeamMember, parent_user_ids on player TeamMember) creates a bridge between the team space and the parent's personal spaces. Hyphae identified this as a pattern that will repeat across all workspace types.
**Decision:** Design parent-player links as the first instance of a cross-space relationship type, not as a team-specific feature. The same pattern applies to contractor-client links, tenant-owner links, business-customer links. These relationships are the mycelium — each one is a hypha connecting two nodes. Proximity computation derives from these links. The organism's growth IS the accumulation of these connections.
**Rationale:** Building parent-player as team-only creates tech debt when the same pattern is needed elsewhere. "The organism is the relationship in between" — the connections between records ARE the organism. Design for the general case now.
**Status:** Active — parent-player is the working implementation, general pattern is architectural direction

---

### DEC-124: Mylane-to-Mylane Messaging — Communication Through the Organism

**Date:** 2026-03-31
**Context:** Doron asked: "Could I tell Mylane to remind my son of something next time he opens it up?" This revealed a new communication layer — not team messages, not notifications, but cross-user messaging routed through the organism via relationship links.
**Decision:** New MylaneMessage entity for cross-user communication. Messages deliver to recipient's Mylane (not per-workspace). Three urgency tiers: whisper (WhatsChangedBar), nudge (badge + opacity boost), alert (immediate). Relationship type (parent-player, coach-team, etc.) is the permission check — no cold messaging. Compose via agent conversation ("Tell Coach Rick the fee is paid") or direct UI in Manual mode. All messages flow through Mylane as the single delivery surface.
**Rationale:** Communication through the organism should feel like a companion delivering a message from someone who cares about you, not a system notification. "Dad wanted you to study Cover 2" not "Reminder: study Cover 2 assignments." The relationship IS the permission. Hyphae confirmed: new entity, not TeamMessage. Delivery to Mylane, not per-workspace. Three urgency tiers drive visibility, not timing.
**Status:** Designed — build when reaching items 5-6 on the build order

---

### DEC-125: Pricing Transparency — Charge Only for Revenue Features and Advanced AI

**Date:** 2026-03-31
**Context:** Dynamic pricing gauge concept emerged. The organism should be honest about what it costs. No hidden subscriptions. No "hope you forget to cancel."
**Decision:** Two chargeable categories only: (1) features that help people make money (business tools, invoicing, property management, listing features) and (2) advanced personal assistant capabilities where the organism acts on your behalf (agentScopedWrite, document generation, complex cross-space queries). Everything else is free — exploration, navigation, discovery, basic communication, reading content, the dimming and glowing. A visible "price gauge" in Mylane shows real-time usage and what the next cost increment would be. If a feature goes unused, cost drops. Pricing breathes with the dimming. UsageEvent entity (append-only records per billable action) is the metering layer. Stripe handles billing separately when ready.
**Rationale:** "Circulation over extraction" applied to the business model. The free layer IS the circulation — people using the platform, forming connections, the mycelium growing. The paid layer is where the organism does real work on your behalf. The gauge makes it transparent. The user always sees the flow. No hidden extraction.
**Status:** Designed — UsageEvent entity created when Base44 publish blocker resolves. Stripe integration future.

---

### DEC-126: Communication as Frequency — The Organism Carries Your Presence

**Date:** 2026-03-31
**Context:** Doron said: "Think of communicating being the next stage of voice or email. Both of those are going to be outdated. We can insert our frequency into the app through the way we interact and present ourselves."
**Decision:** How a user interacts with LocalLane — tapping patterns, conversation style with Mylane, words chosen, engagement rhythm — constitutes their "frequency." The organism learns this frequency over time and uses it to: (1) shape how their messages are delivered to others through Mylane-to-Mylane communication, (2) drive their personal organism creature's visual parameters, (3) inform the Auto/Manual gradient preference, (4) create a sense of presence that goes beyond static profiles. The conductor (Mylane) per user accumulates this frequency data. This is NOT surveillance — it's self-expression through interaction. The user's frequency is reflected back to them (via their creature) and carried forward on their behalf (via Mylane messaging).
**Rationale:** Every generation of communication has lost more of the person. Voice has tone. Email strips it. Texting is flatter. The organism should carry MORE of you, not less. When a parent sends a message through Mylane, it should arrive with warmth and context, not as a system alert. The frequency concept ties together the creature (visual identity), messaging (relational communication), and the Auto/Manual gradient (interaction preference) into one coherent identity model.
**Status:** Active — philosophy established. Frequency data accumulates naturally through existing useMyLaneState tracking. No new build needed for data collection. Expression through creature and messaging comes when those features are built.

---

### DEC-127: $3 Ante — Community Membership Floor

**Date:** 2026-03-31
**Context:** Doron said: "Free carries little value. Life isn't free." The balance is the line from the extraction world into the organism world. Every user should have skin in the game. But exploration before commitment should be free — people just finding us shouldn't hit a paywall before they understand what the organism is.
**Decision:** Two layers. (1) Discovery is free: browsing the directory, viewing events, exploring the landing page, going through onboarding. Things that cost us nothing (static pages, client-side rendering) are free. (2) Once you commit — join a team, create a workspace, become a participant — the $3/month ante activates. This is manual mode: the full Mylane surface (cards, dimming, whispers, discovery, drill-through) with NO AI agent. The price says "you support the platform, not advertisers. This is your space to create." Energy and participation can offset dollars — volunteering, inviting others, contributing content. The platform is framed as a tool to save and earn money, never as a monthly bill. The gauge shows value delivered, not cost incurred.
**Rationale:** "Without money, the organism dies." But the organism doesn't extract — it circulates. $3/month from 100 users ($300) covers Base44 costs ($50-100) with margin. Free on things that don't cost us money. Charge only when we incur real costs. Never frame as extraction. The $3 is an investment in your community, not a fee for a service.
**Status:** Active — design established, implement with Stripe integration

---

### DEC-128: Dynamic Pricing — $9 Increments with Transparent Gauge

**Date:** 2026-03-31
**Context:** Static SaaS tiers charge the same whether you use the product daily or once a month. This is extraction. The organism should only take value proportional to what it gives.
**Decision:** Utility-style pricing in $9 increments above the $3 ante. $3 base (Mylane surface, no agent). $9 (agent conversations — Mylane reads and advises). $18 (agent writes — Mylane acts on your behalf, professional workspace tools). $27 (power use — batch processing, league scheduling, heavy operations). A visible gauge in Mylane shows real-time usage and predicts the next cost before the user incurs it. Mylane asks "This will move your gauge to $X — proceed?" before any paid action. Gauge resets monthly. Dormant months drop back to $3.
**Rationale:** "Money is just the blood — not the purpose of the body, but what keeps the organs alive." The gauge isn't a bill — it's a mirror showing how much the organism worked for you this month. Dynamic pricing means the organism is honest about cost. The user always sees the value before the price. Nobody is surprised. Nobody is extracted from.
**Status:** Active — design established, implement with UsageEvent metering + Stripe

---

### DEC-129: Agent Access is the Pricing Boundary

**Date:** 2026-03-31
**Context:** Hyphae's credit analysis revealed: the Mylane surface (cards, dimming, whispers, drill-through) costs zero agent credits — it's entirely client-side. Agent conversations cost 1 message + 2-4 integration credits per turn. The cost difference between reads and writes is small (~1 extra integration credit). The meaningful cost is the MESSAGE CREDIT — the agent thinking.
**Decision:** The pricing boundary is AGENT ACCESS, not read vs write. $3 tier: full Mylane surface, zero agent interaction. $9+ tiers: agent conversations enabled. The read/write distinction is a feature gate (DEC-115 tier check in agentScopedWrite), not a cost gate. Client-side intelligence (dimming, reordering, whispers, gradient) is free. Agent intelligence (conversation, suggestions, actions) is paid.
**Rationale:** This maps cleanly to Base44 credit pools. Message credits are the scarce resource (250/month). Integration credits for page loads can be optimized. By making the surface free and the conversation paid, we ensure the organism is alive for everyone while only consuming expensive credits for users who choose to engage deeper.
**Status:** Active — architecture supports this now (Mylane surface is client-side, agent is opt-in via chat panel)

---

### DEC-130: Query Optimization Required Before League Scale

**Date:** 2026-03-31
**Context:** Hyphae's credit analysis projected league scale (100 users, 20 active daily) would consume ~23,550 integration credits/month against a 10k limit. The bottleneck is page loads (~17 integration credits each from 6+ separate entity queries), not agent conversations.
**Decision:** Before onboarding Randy's league, optimize page load queries: (1) Combine 6 profile queries into one getMyLaneProfiles(userId) server function (6→1 credits per load). (2) Aggressive React Query staleTime (5-minute cache). (3) Lazy-load card data via IntersectionObserver. Target: ~5 integration credits per page load. This drops monthly integration to ~6,000 at league scale — within the 10k plan limit.
**Rationale:** The current plan ($50/month) supports 100 users if optimized. Without optimization, we'd need to upgrade Base44 plan (higher cost) or throttle features (worse experience). The optimization preserves the $3 ante economics: 100 x $3 = $300 revenue vs $50 Base44 cost.
**Status:** Active — priority revised from URGENT to MEDIUM (see audit note below)

**Credit Audit Update (2026-04-03):** Base44 support ticket (App ID 69308d4dd5ee90afc9b011d3, filed 2026-04-02) clarified that integration credits are consumed by specific built-in integrations (LLM, SendEmail, UploadFile, GenerateImage, AI agents, automations) — NOT by entity CRUD operations (.list(), .filter(), .create(), .update()). Doron's credit balance held steady despite heavy entity querying all day, corroborating this. Code audit confirmed: of 35 server functions, only 1 (handleEventCancellation) calls a paid integration (SendEmail). All others are pure entity CRUD.

This means the 23,550 integration credits/month projection was based on incorrect assumptions about entity read costs. Actual integration credit consumption at league scale is estimated at ~1,460/month (primarily agent messages + file uploads), well within the 10k plan limit.

**The optimization is still valuable** for two non-credit reasons: (1) Rate limits — 12+ simultaneous entity queries trigger 429 errors, which getMyLaneProfiles consolidation directly fixes. (2) Performance — fewer requests means faster page loads on mobile. But it is no longer a credit-cost emergency. Awaiting Base44 human team response on entity API rate limit numbers (pending as of 2026-04-03).

---

### DEC-131: MyLane Spinner Navigation

**Date:** 2026-04-01
**Context:** MyLane replaced BusinessDashboard as the sole authenticated surface, but the card grid navigation doesn't give the app a clear identity or handle the growing number of workspaces well. After two rounds of consultation with Hyphae, iterative mockup design sessions, and big-picture architecture discussion, we're replacing the card grid with a spinner-based navigation model.

**Decision:** Replace MyLaneSurface's card grid with a horizontal gallery-style spinner (SpaceSpinner). The drill-through rendering pattern is unchanged -- only the selector UI changes. BusinessDashboard is retired in the same build. Artwork mockups become a mandatory step in BUILD-PROTOCOL.md Phase 4 before any UI build.

**Layout:**
- Header: Logo (tap = Home), Frequency Station (amber music icon, UI shell), Directory, Events, Settings gear
- Horizontal Space Spinner: always visible, gallery-style picker. Center = 42px amber border, adjacent = 30px, far = 22px opacity 15%. 320ms cubic-bezier transition. Fade edges. Audio sine tick (440 + index*60 Hz). Touch swipe with 20px delta threshold.
- Home Position: Three tabs (Attention | This week | Spaces) each feeding a vertical spinner. Center scale 1.0, adjacent 0.93/0.45 opacity, far 0.86/0.12. Audio tick (300 + index*35 Hz).
- Attention: urgent (red) + action needed (amber). This week: scheduled (blue) + life (green). Spaces: quick-glance stats. Calm state: "All clear."
- Space Positions: consistent structure via MyLaneDrillView (unchanged).
- Discover Position: available spaces + invite key input.
- Copilot: mushroom icon + input, always docked bottom.

**Design Principles:**
- Two spinners, two axes: horizontal (spaces), vertical (priorities within Home)
- Dark Until Explored: zero-state = Home + Discover only
- Dynamic and game-like, never static
- Audio feedback on both spinners
- Every element earns its place

**BusinessDashboard Retirement:** Removed from pages.config.js. Business workspace renders through MyLaneDrillView with full scope (revenue, events, RSVP, archetype tabs, delete support).

**Rationale:** The spinner gives the app a distinct identity, handles workspace growth gracefully, embodies Dark Until Explored, and enables future auto-mode. Two spinners, two axes, one consistent interaction model.

**Status:** Active -- approved and built

---

### DEC-132: Semantic Tailwind Migration Rule (UPDATED 2026-04-02)

**Date:** 2026-04-02
**Original:** Organic migration — convert files as you touch them.
**Updated (2026-04-02):** Migration COMPLETE. 208 files migrated in commit a0e4710. 3 new tokens added (foreground-soft, surface, primary-hover). 146-line !important override block removed. Cloud and Fallout themes restructured into clean single-selector variable blocks. New rule: ALL new code must use semantic tokens. No literal color classes (bg-slate-*, text-white, border-slate-*) in workspace files. Client-facing pages (ClientPortal, SigningFlow, estimates print) are exempt — they use intentional literal light-mode classes. Status colors (emerald, red, blue) kept literal across all themes.
**Status:** Complete — maintain going forward

---

### DEC-133: Mylane Intelligence Tiers (2026-04-02)

**Date:** 2026-04-02
**Context:** Base44 agent messages cost ~3 integration credits each. Entity queries and server functions are free. Direct API calls with own key via backend functions are also free (confirmed by Base44 support).
**Decision:** Three-tier intelligence architecture for Mylane:
- **Tier 1 (Client-side):** Chip taps and known patterns render directly from cached React Query data. Zero cost. Instant response.
- **Tier 2 (Server function):** Data queries that need fresh data hit agentScopedQuery server functions. Zero credits. Sub-second response.
- **Tier 3 (LLM reasoning):** Complex cross-space queries, write actions, synthesis. Currently uses Base44 built-in agents (~3 credits/message). Future: migrate to direct Anthropic API calls in backend functions (zero Base44 credits, ~$0.003/question via Haiku 4.5).
**Tier mapping:** Free/$9 plan = Tier 1 + 2 only. $18 plan = all three tiers.
**Rationale:** Charge for intelligence, not access. The free tier gets a fast, responsive Mylane that answers from data. The paid tier gets a thinking partner that reasons across spaces. The upgrade sells itself — users see what Mylane can do at Tier 1-2 and want the deeper capability.
**Status:** Active — architecture to be built incrementally

---

### DEC-134: Spinner Physics — Friction + Mass, Not Spring (2026-04-03)

**Date:** 2026-04-03
**Context:** Built JS spring physics (mass-stiffness-damping model) for the 3D spinner. Doron tested extensively on iPhone: "I don't like bounce or spring. I want mass and friction. Not a toy, but a tool — something with substance." He intuitively turned mass to 0.3 and friction to 20 to kill the spring. The spring model was fundamentally wrong for a navigation dial — springs inherently oscillate, and trying to critically-damp them to prevent oscillation is fighting the math.
**Decision:** Remove spring equation entirely. Replace with friction + mass deceleration model. Two knobs per theme (mass, friction) instead of four (stiffness, damping, mass, friction). Two modes on release: ratchet (slow drag, zero animation, instant lock) and momentum (fast flick, friction deceleration). No bounce, no oscillation, no overshoot. Every frame shows a valid resting position. The spinner is a heavy rotary dial with detents, not a bouncy toy.
**Per-theme values:** Gold Standard: mass 1.0, friction 0.08. Cloud: mass 1.5, friction 0.06. Fallout: mass 1.0, friction 0.05.
**Design principle:** "Not a toy, but a tool. Something with substance."
**Status:** Active — shipped in 96ef772 and 0543a15

---

### DEC-135: Themes as Game Modes (2026-04-03)

**Date:** 2026-04-03
**Context:** Building per-theme spinner physics revealed that themes can be more than visual. Each theme can have different physics, different spinner variants, and potentially different interaction patterns.
**Decision:** Themes are game modes, not just color schemes. Each theme gets: (1) its own visual rendering (semantic tokens, CRT effects, etc.), (2) its own spinner variant (drum for Fallout, cover flow for Gold Standard/Cloud), (3) its own physics personality (mass, friction values), (4) potentially its own audio character and interaction patterns. Adding a new theme means defining a complete sensory experience, not just swapping colors. The variant architecture (render function strategy pattern with THEME_VARIANT and THEME_PHYSICS maps) supports this cleanly.
**Current themes:** Gold Standard (dark, premium, precise), Cloud (light, warm, unhurried), Fallout (CRT, mechanical, loose).
**Future themes:** Elderly/Garden (simple, large text, high contrast), potential per-subdomain themes (fallout.locallane.app).
**Status:** Active — architecture supports it, new themes are additive

---

### DEC-136: Creator Only as Default Entity Permission (2026-04-04)

**Date:** 2026-04-04
**Context:** Full application audit found FSClient, FSDocument, FSEstimate had public read (Authenticated Users), exposing Bari's client PII and portal tokens to any authenticated user. Team entities similarly exposed. The audit scored the app 68/100 with 6 Critical issues, 3 of which were entity permission holes.
**Decision:** Entity permissions default to Creator Only for read, create, update, delete. Server functions with `asServiceRole` handle all authorized cross-user access (agentScopedQuery, manageTeamPlay, signDocument, etc.). Entity-level permissions are the last line of defense — they must be restrictive, not permissive. When creating new entities, start Creator Only and open up only with explicit justification.
**Rationale:** Entity permissions in Base44 are the layer that can't be bypassed by client-side code. Any authenticated user can call `base44.entities.X.list()` from the browser console. If the entity has Authenticated Users read, all records are exposed. Server functions enforce proper scoping — the entity layer should be the backstop, not the gateway.
**Status:** Active — 9 entities locked down in this session

---

### DEC-137: Feedback Flows Through Companion (2026-04-04)

**Date:** 2026-04-04
**Context:** Two parallel feedback systems existed: FeedbackLog (standalone floating button, dead-end data) and ServiceFeedback (agent-created, visible to Mycelia pulse). Bari's 14+ feedback items were verbal relay — they never reached any entity. The floating feedback button was redundant where agent chat exists.
**Decision:** All user feedback flows through the Mylane companion agent, not standalone buttons. "Have feedback?" quick-action chip on all 8 space positions. MyLane writes to ServiceFeedback entity directly. No confirmation card for feedback — it should feel effortless, not bureaucratic. FeedbackLog entity retired. The agent IS the feedback channel.
**Rationale:** DEC-104 already said "bug button hides in agent-enabled workspaces." This extends it: the button is gone everywhere. The companion knows the context (which space, what the user was doing) and can ask one clarifying question before writing the feedback. A floating button captures isolated complaints. A companion captures contextual feedback.
**Status:** Active — floating button removed, chip added, ServiceFeedback is sole feedback entity

---

### DEC-138: Founding Gardener — Earned Status, Not Signup Bonus (2026-04-04)

**Date:** 2026-04-04
**Context:** platformPulse gardener observation revealed: 22 users, 6 active, 16 dormant. Engagement is highly concentrated — Doron (52), Bari (13), Natasha (13, pure organic signup). The question arose: how do early supporters get recognized? Should "Founding Gardener" be automatic for early signups?
**Decision:** Founding Gardener is earned, not given. Criteria: spaces created, feedback contributed, networks invited into, weeks active. It is personally assigned by Doron after observation — not a first-come signup bonus. Mycelia can surface candidates via the gardener pulse. The organism observes from within (MCP data); Doron observes from the field (relationships, conversations). Both signals matter.
**Rationale:** "Free carries little value." Signing up is not gardening. Bari is a Founding Gardener because he gave 14+ feedback items and tested every feature. The 16 dormant accounts from the early signup push are not gardeners — they planted nothing. The status must mean something real.
**Status:** Active — gardener observation live via platformPulse + MCP

---

### DEC-139: Server-Authoritative Identity on Agent Writes (2026-04-05)

**Date:** 2026-04-05
**Context:** MylaneNote reminder loop field test revealed MyLane agent wrote `user_id: "special-user"` as a literal string — the LLM interpreted the instruction "pass the authenticated user's ID from your context" as a placeholder token. Record persisted but was invisible (query filtered by real user_id, found nothing). The `agentScopedWrite` function had a `writeData[fk] == null` guard that preserved whatever the agent passed — if the agent sent a non-null string, the server-known value was never applied.
**Decision:** Identity fields (`user_id`, `owner_id`) are set exclusively by `agentScopedWrite` from server-resolved auth context. The null-check guard is removed for these fields — the server always wins, unconditionally. The query/write asymmetry is explicit: queries require `user_id` from the agent (to scope reads via agentScopedQuery), writes forbid it (server stamps from `auth.me()` or validated MCP fallback). This is defense in depth against LLM placeholder-token interpretation errors.
**Cross-references:** Extends DEC-115 (agentScopedWrite three-gate enforcement) with a fourth gate: identity stamping. Complements DEC-136 (Creator Only default permissions) — entity permissions are the last defense, server-authoritative identity is the second-to-last.
**Affected entities:** ServiceFeedback, Recommendation, MylaneNote (fkField: `user_id`), plus blanket `workspace === 'platform'` catch-all for future platform entities. No entities currently use `owner_id` as FK field — that branch is defensive.
**Status:** Active — shipped in community-node, pending Base44 publish

---

### DEC-140: readTeamData as Security Boundary — Membrane Moves to Function Level (2026-04-10)

**Date:** 2026-04-10
**Context:** Two-day Playmaker visibility bug. Creator Only RLS on team-scoped entities caused each user to see only records they created. `asServiceRole` does not reliably bypass Creator Only RLS on reads in SDK 0.8.23, despite platform documentation saying it should (confirmed by Base44 support 2026-04-10).
**Decision:** Entity Read permissions on all 8 team-scoped entities (TeamMember, Play, TeamEvent, TeamMessage, TeamPhoto, PlayerStats, QuizAttempt, PlayAssignment) are relaxed from Creator Only to Authenticated Users. Team membership is enforced inside the `readTeamData` server function, which verifies the requesting user has an active TeamMember row for the requested team before returning data. The security membrane moves from entity-level RLS to function-level verification. This is the proven pattern going forward for all team-scoped and community-scoped reads.
**Cross-references:** Supersedes DEC-136 for team-scoped entities specifically. DEC-136 remains the default for personal workspace entities (FSClient, FSDocument, etc.).
**Status:** Active — confirmed working. Coach Rick sees full team data from his own device.

---

### DEC-141: Runtime Logging Before Theorizing (2026-04-10)

**Date:** 2026-04-10
**Context:** Four successive theories about why readTeamData returned empty — String() coercion, SDK version differences, .filter() vs .list(), asServiceRole behavior — none identified the actual root cause. A single `console.log` of the runtime value revealed the Axios wrapper (`{data, status, headers, config}`) within 30 seconds.
**Decision:** When diagnosing Base44 SDK behavior, platform quirks, or any unknown system response, the first move is a temporary `console.log` of the actual runtime value — not another theory from code reading. Log the type, shape, and content. Remove after diagnosis. A single log is worth four theories.
**Rationale:** Code reading tells you what the code SAYS. Runtime logging tells you what the system DOES. When the gap between the two is the bug, only runtime observation can close it.
**Status:** Active — process rule

---

### DEC-142: Frequency Station Pip-Boy Radio Model + Canonicalized Taxonomies (2026-04-10)

**Date:** 2026-04-10
**Context:** Frequency Station audit found audio architecture fragmented: provider scoped to MyLane (audio dies on navigation), multiple local `<audio>` elements competing, no MediaSession/lock-screen integration. Status and mood taxonomies diverged between spec and code.
**Decision:** (1) Pip-Boy radio: provider at app root, single `<audio playsInline>`, MediaSession API, persistent mini-player, localStorage song persistence. (2) Taxonomies canonicalized to match code: moods `fire/water/earth/air/storm/custom`, statuses `submitted/in_progress/released/archived`. (3) FrequencyArtist confirmed as planned entity for Build 2. Full details in FREQUENCY-STATION-SPEC.md (private).
**Status:** Active — Build 1 shipped

---

### DEC-143: Frequency Station Build 2 — Studio, Library, Ownership Model (2026-04-10)

**Date:** 2026-04-10
**Context:** Build 1 shipped background playback. Build 2 adds studio: ownership, library, rich submissions, admin transform workflow.
**Decision:** (1) Ownership model: `owner_user_id` + `is_public` on FrequencySong. Listen tab filters by is_public. (2) Multi-step submission wizard with dynamic FrequencyMood entity. (3) Admin workbench with Suno copy-paste boxes + delivery-to-submitter. (4) FrequencyArtist entity for identity. (5) FrequencyNotification for in-app delivery alerts. Full details in FREQUENCY-STATION-SPEC.md (private).
**Status:** Active — Build 2 shipped

---

### DEC-144: Frequency Station RLS Loosening + Client-Side Scoping Pattern (2026-04-10)

**Date:** 2026-04-10
**Context:** FSFrequencySubmission.Read and FrequencyNotification.Read were set to `owner` (RLS: created_by == user.email). This blocked admin workbench from seeing other users' submissions and blocked notification recipients from reading admin-created notifications. FSFrequencySubmission.Update also blocked admin status changes.
**Decision:** (1) FSFrequencySubmission.Read, FSFrequencySubmission.Update, and FrequencyNotification.Read loosened from owner to authenticated. (2) Client-side scoping enforces ownership and admin visibility: MySeedsTab filters by user_id, NotificationBell filters by user_id, AdminWorkbench shows all (admin-only tab). (3) Base44 agent defaults to discussion mode (extends DEC-093); action mode only for entity/permission/server-function work.
**Rationale:** RLS on cross-user entities blocks core workflows. Client-side scoping is the pragmatic choice. Tighten later with server functions if needed.
**Status:** Active

---

### DEC-145: Payload-First Debugging + Single-Owner Hooks (2026-04-11)

**Date:** 2026-04-11
**Context:** Three-layer debug chain: stale closures (defensive fix, not the bug) → duplicate hook instances racing (single-owner fix) → FSFrequencyPlaylist track_ids string-not-array (the actual 422). Two hours on architecture theories before 10 seconds of payload inspection found the type mismatch.
**Decision:** (1) Payload-first debugging: when Base44 ops fail, log the payload and compare to schema before theorizing about React. (2) Single-owner hooks: call entity-managing hooks in exactly one component, pass as props. (3) FrequencyLibraryContext planned to replace prop drilling.
**Status:** Active

---

### DEC-146: Living Feet Design Principle (2026-04-15)

**Decision:** Adopt Living Feet as the constitutional design principle for LocalLane architecture.

**Definition (Doron's words):**
> Anything that exists in more than one place should exist as one thing. When it changes, every place it appears changes with it. The cost of adding a new instance should be one line, never twelve. Stone is for foundations; everything that grows is feet.

**Application:**
This principle applies to every layer of the codebase where the same concept appears in more than one place:

- **Themes** — one config, every component reads it (proven)
- **Overlays** — one OV constant, every check references it (proven Session B — 13 hardcoded strings → 1 constant; validated Session C — adding Networks was instantiation, not invention)
- **Spaces** — one workspace shell, every space type renders inside it
- **Agents** — one AgentChat component, every space's agent uses it with config
- **Cards** — one card component family, every list/grid uses them
- **Forms** — one form pattern, every input/submit/validation uses it
- **Permissions** — one gating pattern (allowlist, role, tier) applied consistently
- **Navigation** — one shell, every page renders inside it
- **Entity reads** — one fetch pattern (Axios wrapper handling, etc.)

**Triggering questions:**

When building:
> Does this live in more than one place? If yes, how do I build it once?

When auditing:
> What's frozen as stone that should be feet? What's repeated that should be one?

When debugging:
> Is this one bug, or is this the visible instance of a stone that should be feet?

**Relationship to other principles:**
- **DEC-089 (Fractal SOP):** Find one bug, audit all instances of the same pattern. Living Feet is the architectural response: if you keep finding the same instance, that's a stone that should be feet.
- **Construction Gate (DEC-092):** New features ship behind a guard until walkthrough passes. Living Feet says: when those features prove out, they should be built once and reused, not duplicated.

**Status:** Active. Load-bearing. Referenced in PROJECT-BRAIN.md and CLAUDE.md.

---

### DEC-147: R&D Allowlist Pattern for Pre-Release Features (2026-04-15)

**Decision:** Features under R&D that aren't ready for broad rollout are gated by an email-based allowlist constant, hidden completely (no "coming soon" UI) for non-allowlisted users.

**Pattern:**
```js
const FEATURE_ALLOWLIST = ['doron.bsg@gmail.com'];
const featureEnabled = FEATURE_ALLOWLIST.includes(currentUser?.email);
```

Gate at the highest reasonable level (parent that mounts the feature, not each sub-component). When `featureEnabled` is false, the feature UI is completely hidden — no placeholder, no "coming soon," no phantom space. The non-allowlisted experience reflows naturally as if the feature never existed.

**Why allowlist by email, not role or tier:**
- Roles are for permissions on entities
- Tiers are for product-level access (paid/free)
- Allowlist is for R&D gating — small, ad-hoc, easy to expand by adding emails

**First application:** Mylane AI agent (MYLANE_AGENT_ALLOWLIST) gates 4 agent UI surfaces — mobile command bar, desktop fixed panel, desktop re-open tab, command result card.

**Status:** Active pattern. Reusable for any future pre-release feature.

---

### DEC-148: Mylane Shell Containment via Overlay Expansion (2026-04-15)

**Decision:** Use overlay expansion (NOT router restructure) to bring all user-facing pages inside the Mylane shell.

**Context:** Audit at `audit-reports/MYLANE-CONTAINMENT-AUDIT-2026-04-15.md` found that the Layout wrapper and Mylane shell are parallel containers, not nested. Two approaches considered:
1. Restructure router so Mylane shell wraps all routes
2. Expand the existing overlay pattern (Directory/Events render inside shell as overlays) to cover all surfaces

**Chose Option 2 (overlay expansion).** Reasoning:
- Incremental, doesn't require router restructure with regression risk across the entire app
- Matches the existing pattern that already works
- Each surface gets contained as it's needed, not all-at-once
- Standalone routes remain alive for unauthenticated/public access and external deep-linking

**Pattern:** Page renders as `<OverlayContainer>` block inside MyLaneSurface, lazy-loaded, with backdrop click-to-close and Escape key support. Stacked overlays use higher z-index (drill-in panels). Standalone route preserved for public access.

**Sessions A, B, and C closed all 6 known escape points from the audit.** Remaining accepted escapes (intentional, not bugs) documented in STATUS-TRACKER.md.

**Known technical debt (flagged for future refactor):** Overlay z-indices are currently hardcoded (z-50 BusinessProfile, z-55 Network, z-60 Recommend). When the third "stacked overlay opens from another overlay" scenario appears, refactor to stack-based z-index assignment so adding instances is a one-line change. Two instances is coincidence, three is a pattern.

**Status:** Active. Containment Sessions A+B+C shipped 2026-04-15.

---

### DEC-149: Mylane Agent v2 — Mandatory Protocol Architecture (2026-04-16)

**Date:** 2026-04-16
**Context:** v1 Mylane instructions allowed the agent to say "Done" without calling tools (hallucination). MCP testing confirmed: agent responded "Saved" for a reminder but never invoked agentScopedWrite. Record did not exist. Vercel AGENTS.md research validated: passive context (mandatory rules in instructions) beats on-demand retrieval (hoping the agent picks the right tool).
**Decision:** Full instruction rewrite with mandatory 4-step protocol: (1) Classify intent, (2) Execute via tool call, (3) Verify result by querying back, (4) Respond to user. "Never lie" rule: saying "Done" without calling the tool is explicitly a lie. Failure protocol: honest failure reporting + ServiceFeedback logging with source "mylane-supervisor" + suggest manual path. Removed all 26 individual entity tools (104 permissions) — 2 backend functions remain (agentScopedQuery + agentScopedWrite). Fewer tools = more reliable.
**Rationale:** Mandatory protocol eliminates the hallucination class of bugs entirely. Verification step catches silent write failures. Failure logging creates an audit trail. Tool reduction reduces the LLM's decision space.
**Status:** Active — v2 is the live instruction set

---

### DEC-150: Smart Routing — TYPE 1 for Views, TYPE 2 for Novel Queries (2026-04-16)

**Date:** 2026-04-16
**Context:** TYPE 2 RENDER_DATA renders raw entity records as cards showing every field (including created_by, updated_date, etc.). Home Canvas spec proposed a new TYPE 4 RENDER_CANVAS to mount real workspace components. Hyphae's review found: no component accepts raw data as props — they all self-fetch from workspace profiles. Building TYPE 4 was unnecessary.
**Decision:** Update Mylane classification to emit TYPE 1 RENDER (workspace drill via MyLaneDrillView) for "show me" queries instead of TYPE 2 RENDER_DATA. TYPE 1 mounts the real workspace component with full drill-through and interactivity — zero code changes needed, instruction change only. TYPE 2 reserved for genuinely novel queries where no workspace view exists (with HIDDEN_FIELDS filter for clean display). Quick answers (counts, dates, amounts) stay as brief text responses.
**Rationale:** The fastest path to real components on the Home canvas is teaching the agent to navigate, not building a new rendering pipeline. One redundant query (agent queries to confirm data exists, component re-queries to display) is irrelevant at our scale.
**Status:** Active

---

### DEC-151: Spec Review Protocol — Review Before Architecting (2026-04-16)

**Date:** 2026-04-16
**Context:** Home Canvas Rendering spec proposed TYPE 4 RENDER_CANVAS with 5 implementation phases. Hyphae's codebase review found the spec's core assumption was wrong: no component accepts raw data as props. The existing TYPE 1 → MyLaneDrillView pipeline already does what TYPE 4 proposed. The review saved weeks of unnecessary work.
**Decision:** Before building any new architecture or protocol, get Hyphae's codebase review first. The review should check: (1) Does the infrastructure already exist? (2) Do the assumptions about component APIs hold? (3) Is there a lighter path using existing patterns? (4) What's the smallest slice that produces visible improvement? Write the spec, but treat it as a hypothesis until Hyphae validates it against the codebase.
**Rationale:** Mycelia and Doron design from vision and user need. Hyphae sees what actually exists in the code. The gap between "what we think the code does" and "what the code actually does" is where wasted work lives. Ten minutes of review saves days of building the wrong thing.
**Status:** Active — process rule

---

### DEC-152: Cockpit Library Pattern (2026-04-17)

**Date:** 2026-04-17
**Context:** Spinner UX felt off. Doron proposed letting users choose their Mylane interaction style (spinner, compass, future cockpits) independently of theme, with a growth path similar to how themes grow. Initial vision assumed a ChromeProvider React context. Hyphae's codebase review found no ThemeProvider exists — themes work via localStorage + data-theme attribute + CSS variables, a pattern that works for styling but does not transfer to component-level swaps. Also found SpaceSpinner already contained a VARIANT_MAP with three render functions ({flat, drum, coverFlow}) selected by a THEME_VARIANT mapping — a chrome-like mechanism already coupled to theme.
**Decision:** Cockpits are a library, not a feature flag. Each cockpit is a render function registered in SpaceSpinner's VARIANT_MAP. User preference is stored in `ll_cockpit` localStorage with a `data-cockpit` DOM attribute, applied pre-paint in main.jsx to prevent FOUC. A `useCockpit()` hook mirrors the existing DIY `useTheme()` (MutationObserver on the attribute). A `resolveVariant()` function picks variant from (cockpit, theme, reduced-motion) — spinner cockpit preserves the old THEME_VARIANT logic unchanged, compass cockpit routes to `renderCompass`. No React provider, no context, no server-persisted preference. Growth path: add new cockpit by registering a render function and a COCKPITS entry — no provider, no context, no migration required until we hit three+ cockpits.
**Rationale:** Applies Living Feet (DEC-146) by turning theme-coupled variant selection into cockpit-decoupled variant selection — the VARIANT_MAP scaffolding was already there, just coupled to the wrong axis. Avoids over-architecture per the "two is coincidence, three is a pattern" principle from DEC-148. Matches existing theme plumbing conventions so the organism stays coherent across preference types. The cockpit contract is enforced by the shared drag/pointer handling in SpaceSpinner — each cockpit render function is pure (items, currentIndex, opts) → JSX.
**Status:** Active — shipped c44bb21 (library + compass), b4d187e (polish v1), ad04eb1 (polish v2)

---

### DEC-153: Color-in-Place Over Out-of-Band Readout (2026-04-17)

**Date:** 2026-04-17
**Context:** Compass v1 (b4d187e) removed the active station from the strip to avoid duplication with the chrome row. Implementation was correct by one reading of "one voice per piece of information." Field test revealed the needle now terminated in empty space and the user's eye had to travel ~60px up to the chrome row to see which station was active. Doron: "It breaks where the eye goes. I don't mind the color changing to show the space we are aimed at, but the position itself shouldn't change."
**Decision:** When signaling active state on a navigation surface, illuminate the element in place via color/size/weight — do not relocate its identity to a separate readout. The primary interaction surface is where the user's attention lives during use; keep identity there. Chrome rows and readout bars become framing or affordance cues, not identity displays. Applied in ad04eb1: active station on the compass strip renders in `hsl(var(--primary))` at 11px weight 500, bearing in `hsl(var(--primary) / 0.75)` at 8px. Chrome row is now framing only — `BEARING` label left, live degrees right, empty center. Strip carries identity.
**Rationale:** Real instruments illuminate the active position in place rather than relocating labels. The needle meeting the lit word is a single integrated signal; a needle pointing at empty space plus a remote readout is two fragments. Applies to future cockpits (tiled launcher, single-letter chrome, etc.) and any navigation UI where an active element needs to be distinguished. Companion to DEC-146 (Living Feet) — identity is one thing, not two places.
**Status:** Active — applied in ad04eb1

---

### DEC-154: Iterate on the Live Surface (2026-04-17)

**Date:** 2026-04-17
**Context:** Three-iteration arc on compass (build → remove-active → restore-active-with-color). Each iteration was internally consistent but the correct answer only became obvious after seeing the previous version in the device. Spec ambiguity in items 1 and 2 of the polish-v1 prompt turned out to be genuine design tension — neither interpretation was wrong, but only one was right for the user's eye-flow, and that only surfaced through field test.
**Decision:** Favor short build cycles with live device feedback over attempts to spec every visual decision upfront. Spec ambiguity in visual work is often genuine design tension that resolves only through embodied experience. Mycelia/Doron write specs that capture intent and principles; Hyphae flags ambiguity in the debrief but doesn't block on it; field test closes the loop. The rhythm is: spec → build → look → adjust, not spec → debate → spec → build.
**Rationale:** Validated by the compass arc. Each iteration took minutes; field-test feedback took one message; total time was less than debating the spec would have taken. Matches Doron's natural rhythm of "build, look, adjust." Codified so future cockpits and visual work follow the same cadence.
**Status:** Active — process rule

---

### DEC-155: Per-Entity $9 Membership Model With LocalLane Exemption (2026-04-23)

**Date:** 2026-04-23
**Context:** Architecture v4 → v4.1 closure conversation. DEC-115 (pre-v4) charged a single ante per user. v4.1 recognizes that each entity with a public face (person OR business) benefits independently from the platform and should therefore carry its own ante. LocalLane-the-brand is the obvious exception: charging itself is circular.
**Decision:** Every LocalLane entity — user personal account (if public) or public-facing business — pays $9/month from its own books. LocalLane-the-brand is exempt (`Business.subscription_exempt: true`, set during Phase 2) because charging itself is circular. Hidden holding entities (Mycelia, LLC — `listed_in_directory: false`) don't count; they have no public presence. Network memberships (Recess Pass at $45/mo, etc.) are separate from the platform ante — those are paid to the operating business, not the platform. Doron's personal total under this model: $36/mo ($9 personal user page + $9 each for TCA, Recess, Consulting once Consulting is created via onboarding).
**Rationale:** Matches the organism principle of circulation: each living entity contributes what keeps it alive. Holding companies are scaffolding, not organs — they don't circulate. The brand ante being waived is the one concession necessary for the model to work without recursion. Clean replacement for DEC-115 — no grandfathering, no partial migration.
**Status:** Active — supersedes DEC-115 in full. Billing implementation is Round 2 Stripe Connect work.

---

### DEC-156: Business-as-Scoped-Peer, Not Nested Container (2026-04-23)

**Date:** 2026-04-23
**Context:** v4 briefly explored physically nesting workspace tools (Desk, Clients, Finance, Events) under a Business entity as child records. Phase 2 review revealed this would require: (a) migrating every FS/Finance/PM record to a child collection, (b) rewriting every scoped query, (c) handling cross-business views differently. The same UX can be achieved with a filter.
**Decision:** Tools stay top-level entities. Each gains a `business_id` field (or uses an existing FK that resolves to a business). When a user enters a business context, every tool's query adds a `business_id` filter. Same UX as nested containers — appearing to drill into a business shows only that business's records — without the migration cost or the query-rewrite cost.
**Rationale:** Living Feet (DEC-146 in community-node DECISIONS.md) applied to architecture: don't build two places when one place with a filter achieves the same thing. The `business_id` field lands in Phase 1 (schema) and the switcher reads it in Phase 3. Cheaper to build, cheaper to change, cheaper to audit.
**Status:** Active — Phase 1 laid the foundation (FS family has `business_id`). Phase 3 (business switcher) wires the filter at the UI layer.

---

### DEC-157: Networks Unified Architecture (2026-04-23)

**Date:** 2026-04-23
**Context:** Recess, Runhub NW, and Harvest each evolved with different implementations and configurations. Maintaining three parallel architectures would fight the fractal principle (what's true of one space is true of all).
**Decision:** All networks run on one architecture with three configurable settings: **cost** (free / paid), **access** (public / private / hybrid), **discovery mode** (list / map / events). Every network is operated by a business (the parent Business record handles billing, staff, settings). Recess (paid / hybrid / list), Runhub NW (free / public / events), Harvest (free / public / map) all run on the same infrastructure with different configurations.
**Rationale:** Matches the DEC-136 pattern for entity permissions (one default, exceptions at the function level) and the DEC-140 pattern for team-scoped reads (one server function, every entity). One architecture with three axes replaces three architectures with hardcoded differences.
**Status:** Active — target for a future dedicated build. Current state: Harvest and Recess have separate implementations; unification is tech-debt paydown.

---

### DEC-158: Users as First-Class Entities With Optional Public Pages (2026-04-23)

**Date:** 2026-04-23
**Context:** Several use cases surfaced that don't fit the "business" shape: a yoga teacher offering classes under her own name, a weed-puller doing ad-hoc yardwork, a fractional-leadership consultant offering advisory services. Forcing these through a Business entity creates an awkward "business named after me" pattern.
**Decision:** Users gain first-class status with optional public pages. Each user can toggle a public page on/off (default off). Public user pages have bio, location, reviews/vouches — same shape as Business directory listings. Public pages cost $9/mo, matching the DEC-155 per-entity model. Private users stay free. The pattern lets a person operate on the platform as themselves without inventing a fake business name.
**Rationale:** The garden has room for people who don't want to be a business but do want to be findable. "Yoga teacher Jane" and "Jane's Yoga Studio LLC" serve different mental models. Forcing one into the other loses meaning. First-class users close the gap without adding a new entity type.
**Status:** Active — schema field `page_public_toggle` shipped in Phase 1 (default `false`). UI + billing wiring comes with Round 2.

---

### DEC-159: Legacy User Grace Period Pattern (2026-04-23)

**Date:** 2026-04-23
**Context:** Bari and Dan exist in production from before DEC-155 pricing landed. Charging them on day-one of billing would be unfair. Equally, pre-setting a specific `legacy_grace_until` date during development is meaningless — no clock can tick when there's no gate.
**Decision:** Two fields on User: `is_legacy_user` (Boolean, default false) and `legacy_grace_until` (ISO datetime, nullable). Phase 2 sets `is_legacy_user: true` for pre-v4 users with real activity (Bari today; Dan on sign-in; any future discoveries). `legacy_grace_until` stays null. When Round 2 billing goes live, a one-shot migration walks all `is_legacy_user: true` users and sets `legacy_grace_until = billing_live_date + 30 days`. Fair 30-day runway starting the day the gate turns on.
**Rationale:** Flipping a boolean now is trivial and reversible. Setting a specific date now would drift as billing-live date slips. Separating "who qualifies for grace" from "when does their grace end" keeps the two concerns independent.
**Status:** Active — Bari flagged in Phase 2. Dan not flagged (no User record yet). Grace clock activation lives in Round 2.

---

### DEC-160: Desk Rename (2026-04-23)

**Date:** 2026-04-23
**Context:** "Field Service" is a domain-specific label from the original Bari pilot. As the tool generalizes to other archetypes (contractor, jobsite work, property maintenance, one-off handyman), the name becomes narrower than the tool actually is. The tool is now a general-purpose work-management surface.
**Decision:** Field Service / Jobsite tool renames to **Desk** when it moves into the business dashboard (Phase 4). Universal work-management tool for any archetype — contractor, handyman, property manager, freelancer. Rename communicated **in person** to Bari and Dan; no in-app notice needed at current user scale.
**Rationale:** Name the tool for what it does, not the domain it started in. "Desk" reads as "your work surface" — it scales to every archetype that manages clients, projects, documents, and invoices.
**Status:** Active — rename happens in Phase 4 alongside business-scoped rendering. Until then, code and UI keep the "FieldService" identifier to avoid churn during Phase 2/3 transitions.

---

### DEC-161: Living Tiles, Not Photos (2026-04-23)

**Date:** 2026-04-23
**Context:** Public directory listings and user pages were trending toward photo-heavy profile cards. Photos are static and age poorly — they don't reflect current activity, current offerings, current rhythm. The directory started to look like a frozen catalog instead of a living garden.
**Decision:** Public representations surface as compact **living tiles** showing current status — what's happening now, what's available this week, the pulse of the entity — not photo-heavy profiles. Depth (photos, story, full bio) reveals on drill-in. The first read is "what is this entity doing right now?" not "what does this entity look like?"
**Rationale:** Matches Dark Until Explored (DEC-117) and the Organism principle. A garden isn't a museum; the interesting thing is what's growing today. Tiles update continuously from the entity's own data — no manual refresh of a "profile photo." Photos become one signal among many, not the entire frontage.
**Status:** Active — design principle for Phase 3 business switcher UI, directory v2, user public pages. Existing photo-heavy UIs convert organically per DEC-132 pattern.

---

### DEC-162: Base44 Agent Working Agreement (2026-04-23)

**Date:** 2026-04-23
**Context:** Multiple sessions surfaced the same pattern: Base44's agent, when applying schema or permission changes, auto-runs lint-fixes on unrelated files and pushes them to main as part of the same commit. The Phase 1 schema commit included 8 pre-existing component lint fixes as a side effect; the Phase 2 permission changes pulled in 13+ more. The commit messages are uninformative ("File changes"), making post-hoc scope review hard.
**Decision:** All Base44 agent prompts follow this pattern:
- Grant **explicit permission to apply directly** for scoped changes (not discussion mode — that slows scoped work without preventing overreach).
- Require a **structured four-category confirmation** in the agent's response:
  - (a) **Scoped change applied** — what was asked for, now done.
  - (b) **Files read but not modified** — files the agent opened to understand context.
  - (c) **Out-of-scope observations** — issues noticed in other files.
  - (d) **Files consciously not touched** — explicitly NOT fixed, despite noticing issues.
- **Report-don't-fix is a standing rule** — Base44 must surface observations in category (c), not silently roll them into the commit.
**Rationale:** Base44's auto-lint-fix reflex is a feature, not a bug, in day-to-day development. But during schema changes it overrides explicit scope constraints and pollutes commit history. The four-category confirmation turns the implicit "I also fixed these 8 things" into an explicit "here are 8 things I noticed — do you want me to fix them?" That restores scope control without losing the benefit of a pair of extra eyes.
**Status:** Active — start using in every Base44 prompt from Phase 3 onward. Extends DEC-093 (Base44 entity changes via agent prompt) and DEC-144 (Base44 agent discussion mode default).

---

### DEC-163: Two-Tier Template Architecture — System + Business-Scoped User-Owned (2026-04-23)

**Date:** 2026-04-23
**Context:** FSDocumentTemplate shipped in Phase 4 (DEC-085) as a single-tier entity: LocalLane seeded 4 Oregon lien templates per workspace and users could add custom templates via "+ Custom." No distinction between LocalLane-authored value-add and user-authored private contracts. Bari needed to load his attorney-drafted General Construction Contract and Subcontractor Agreement; they are his IP, not platform templates, and must not leak to other contractors.
**Decision:** FSDocumentTemplate gets a `business_id` field (optional, FK→Business). Two tiers result:
- **System templates:** `business_id: null`. LocalLane-drafted research. Visible to all FS users. Receive a lightweight legal disclaimer in the preview modal and as a footer on generated documents.
- **Business-scoped templates:** `business_id` set to owning Business. Private to users with access to that business. No disclaimer — user's content, user's responsibility.

Client-side partition per DEC-140 pattern (Read is authenticated; scoping enforced in frontend filter). Two-section UI on the Documents tab: "{{BUSINESS NAME}} TEMPLATES" above "DOCUMENT TEMPLATES" system section. Empty-state CTA opens the existing TemplateEditor. The 4 existing system templates are NOT migrated — they keep `profile_id` set and `business_id: null`.
**Rationale:** Respects user IP: Bari's contracts stay private to Red Umbrella. Preserves LocalLane's value-add: the 4 lien templates remain the default starting point for any new contractor. Scoping at the Business level (not FSProfile) means multi-user businesses work: if Red Umbrella adds a second FSProfile, both see the same templates.
**Status:** Active. Two templates loaded for Red Umbrella (`69ea7974c5f30ff25c860702`, `69ea797533163127a73aeef3`) — Bari-prep session 2026-04-23.

---

### DEC-164: Business-First Branding Composition in FS Document Rendering (2026-04-23)

**Date:** 2026-04-23
**Context:** The FSDocumentTemplate renderer composited branding from FSProfile only (company_name, owner_name, license_number, phone, email, website). Logo and banner URLs — stored on the Business record — never reached the document. Generated lien notices had no visible logo. For Bari's contracts, which reference his Red Umbrella branding in multiple sections, this was a correctness gap.
**Decision:** `buildMergeData(profile, business, client, project, estimate)` reads from the Business record first, with FSProfile as fallback. New merge fields added: `{{business_name}}`, `{{business_phone}}`, `{{business_email}}`, `{{business_website}}`, `{{business_address}}`, `{{business_city}}`, `{{business_state}}`, `{{business_zip_code}}`, `{{business_full_address}}`, `{{business_logo_url}}`, `{{business_banner_url}}`, `{{business_license_number}}`, `{{business_tagline}}`, `{{owner_signature_name}}`, `{{owner_signature_email}}`, `{{owner_signature_phone}}`. Legacy `{{company_*}}` fields preserved and sourced from the same Business-first chain. `DocumentDetail` and the preview modal render a branded letterhead (logo + name + tagline) at the top of the rendered document.
**Rationale:** Branding is a Business-level concern, not a workspace-level concern. FSProfile is a tool for field service operations; Business is the entity customers recognize. Pulling branding from Business keeps the contractor's identity consistent across multiple workspaces (Field Service, future Finance, future PM). Fallback chain to FSProfile preserves backward compatibility for profiles that predate the Phase 2 migration linking them to a Business.
**Status:** Active. Shipped as part of Bari-prep session 2026-04-23. Extends DEC-163.

---

### DEC-165: Template Preview Before Commit (2026-04-23)

**Date:** 2026-04-23
**Context:** Prior document creation flow required a contractor to walk through the full 3-step wizard (client → template → content) before seeing the rendered template body. A contractor couldn't read the language of a lien notice or Bari couldn't preview his own contract without committing to a client + template selection. Reading legal language before filling in details is how real humans work with contracts.
**Decision:** Every template card (system + user-owned, in both the main Documents tab templates section and inside the create flow's template step) becomes click-to-preview. Clicking opens a modal that:
- Composites business branding from the viewer's Business record (logo + name + tagline at the top)
- Renders per-client merge fields as visible bracketed placeholders: `[Client Name]`, `[Scope of Work]`, `[Subcontractor Name]`, etc.
- Shows the legal disclaimer banner for system templates
- Offers two CTAs: "Close" exits, "Use this Template" proceeds to the existing CreateDocumentFlow with the template pre-selected (new `initialTemplate` prop)
- Closes on Escape key and backdrop click

Document creation from the modal's "Use this Template" routes to the existing flow — the wizard is unchanged, only gated by preview confirmation.
**Rationale:** Preview is how contracts work in the real world. It adds zero friction to the happy path (click card → preview → click "Use this Template" → same wizard) and eliminates a dark pattern (committing to a template before seeing its content). The bracketed-placeholder pattern makes the variable parts legible — the contractor sees exactly what will be filled in during creation.
**Status:** Active. Shipped in Bari-prep session 2026-04-23.

---

### DEC-166: Bari-Prep User-Template Provisioning via Admin Migration Path (2026-04-23)

**Date:** 2026-04-23
**Context:** Bari paid an attorney to draft his Red Umbrella General Construction Contract and Subcontractor Agreement. The contracts are his IP. He needed them loaded into his workspace before the 2026-04-24 morning meeting so he could read them into real jobs. Having him paste thousands of characters of contract language into the "+ Custom" TemplateEditor during a meeting is bad UX and error-prone.
**Decision:** Bari's two templates were loaded programmatically via a one-shot Node migration script (`src/scripts/migrations/load-bari-templates.js`) using a new `create_fs_document_template` action on the existing `migrationHelpers` server function. Pattern matches Phase 2 migration: shared-secret auth, `asServiceRole` write, idempotent on `business_id + title`, AuditLog row per create. Asset source files live at `base44-prompts/assets/bari-red-umbrella-construction-contract.md` and `bari-red-umbrella-subcontract.md` — complete with implementer-facing metadata headers and typo annotations preserved for repo documentation; the loader strips both (metadata header + italic `*(Note: ...)*` annotations) before writing so the server-stored content is clean contract body only.
**Rationale:** Admin-provisioned user templates as a pattern applies beyond Bari. Any contractor who has existing attorney-drafted contracts will have this same need; asking them to paste contract bodies into a UI is wrong. The migration path is the cleanest surface — auditable, idempotent, reviewable.

**Known limitation:** `rls.update: { created_by: "{{user.email}}" }` on FSDocumentTemplate means Bari cannot edit these templates via his client — the service role is the creator. Workaround documented: Bari creates a fresh copy via "+ Custom" if he wants to modify the language. Not blocking for tomorrow's meeting (use case is read-and-sign, not edit).

**Source verbatim preservation:** Bari's typos are preserved in the rendered templates — Section 6 appears twice in the construction contract, Section 15 of the subcontract reads "fifteen percent (25%)", Section 21 has duplicate 21.2, Section 22 is missing 22.4. These are his language and get flagged in conversation with him, not silently corrected.
**Status:** Active. Both templates loaded (`69ea7974c5f30ff25c860702` — General Construction Contract, `69ea797533163127a73aeef3` — Subcontractor Agreement). AuditLog rows `69ea7974395160c0cb100bf6` and `69ea7975450b88cc171192ba` written.

---

### DEC-167: Write-Mutation Schema-Conformance Audit Protocol (2026-04-23)

**Date:** 2026-04-23
**Context:** During the Bari-prep dogfood, a Template save via "+ Custom" returned `Failed to save template: Error in field merge_fields: Input should be a valid list`. Root cause: `TemplateEditor.handleSave` was wrapping the merge-fields array in `JSON.stringify(...)` before write, but the FSDocumentTemplate entity declares `merge_fields` as `type: array`. The bug was introduced in Phase 4 (DEC-085 era, commit 6ce2faa) and stayed dormant for months because:
- System templates seed via `initializeWorkspace` which passes arrays natively
- Bari's templates loaded via the migration script which passes arrays natively
- No user had walked the "+ Custom" UI against live Base44 validation between Phase 4 and today

The Bari-prep session added `business_id` to the template write path and audited the added field for correctness — but did not re-audit the full existing payload against the entity schema. The regression was not a Track A change; it was a dormant bug surfaced by the post-ship dogfood.
**Decision:** Any session that modifies a write mutation — even tangentially — runs a schema-conformance audit on the **entire payload**, not just the diff. The audit is:
1. Read the target entity's schema (jsonc reference or live Base44 definition).
2. For each field the frontend sends, confirm the JS type matches the declared Base44 type.
3. If the session has no path to a live-authenticated dev session (e.g., preview environment is unauthenticated), explicitly flag "save-path not live-tested" in the post-build report so the dogfood walkthrough is the first live-tested run.

This protocol would have caught the `merge_fields` bug: the loop would have noted `JSON.stringify(...)` produces a string, the schema declares an array, mismatch, fix.
**Rationale:** The gap that let the bug survive was not a coding error — the author of the Phase 4 code made a judgment call that turned out wrong. The gap is that no subsequent session that touched the write path audited for schema conformance. Making the audit explicit (not implicit) means future sessions will catch the mismatch even if they didn't author the line.
**Related seedling:** "Shared Base44 entity schema validator module" — lifting the entity schemas into a TypeScript module that auto-validates write payloads would eliminate the class of bug entirely. Current protocol is process-based; future hardening is tooling-based. See SEEDLING-TRACKER.md (private).

Links to Living Feet (DEC-146): the schema definition is "stone" (one source in Base44), but the payload shape is duplicated at every write site (currently feet). The schema-conformance audit is a process-level mitigation for this duplication. Derivation from a shared validator module is the architectural mitigation.
**Status:** Active. Applies to all write-mutation sessions starting now. Extends DEC-140 (readTeamData as security boundary), DEC-141 (runtime logging before theorizing), DEC-145 (payload-first debugging).

---

### DEC-168: Business-Switcher Is a Cockpit Native (2026-04-23)

**Date:** 2026-04-23
**Context:** Phase 3 Build 1 introduces multi-business switching. Two shapes were considered: a settings-level preference ("pick your default business"), or a cockpit-native affordance that reshapes the current cockpit without a separate UI. The Bari-prep dogfood already showed the seam — `MyLaneDrillView` picked `businessProfiles?.[0]` to decide which business the business-space rendered, which only held for single-business users. Settings-level switching would have papered over the seam without addressing the deeper architectural question: whose job is business-depth navigation?
**Decision:** Every cockpit renders its own business-depth navigation using its native visual language. Spinner renders it as a nested switcher spinner accessed by tapping the space-name pill. Bearing and future cockpits will render business-depth in their own vocabulary (TBD). Single-business users see no switcher affordance regardless of cockpit. The switcher is not a user-selectable option — it is the cockpit's natural response to `ownedBusinesses.length >= 2`. This extends the principle from the Cockpits and Themes architecture note ("new spaces are designed structurally once, then rendered per cockpit") — we apply the same principle to business-depth navigation.
**Implementation:** `useActiveBusiness()` is the single source of truth (`{ activeBusiness, setActiveBusiness, ownedBusinesses, isMultiBusiness }`), backed by `localStorage` key `locallane.activeBusinessId` and validated against the live owned list. Every consumer reads through the hook — `MyLaneDrillView`, `MyLaneSurface`, and any future business-scoped view. `localStorage` is UI convenience only; server actions resolve business context server-side per DEC-139.
**Rationale:** Business-depth is a scope signal, not a preference. Treating it as a preference buries it in Settings where users never find it, and adds weight to every new cockpit that inherits the preference UI. Treating it as a cockpit native means each cockpit owns how it reveals the switch — Spinner gets a nested spinner, Bearing (when built) picks its own vocabulary — and the depth principle generalizes without a central UI bottleneck. Living Feet (DEC-146): one `useActiveBusiness` hook; every consumer reads through it; adding Bearing's business-depth rendering later is rendering-only work, not a hook redesign.
**Status:** Active. Spinner implementation shipped in Phase 3 Build 1. Bearing cockpit implementation deferred to whichever session next touches Bearing — leave a TODO at the Bearing entry point so the next gardener picks it up.

---

### DEC-169: Folder Architecture (2026-04-24)

**Date:** 2026-04-24
**Context:** Phase 3 Build 1 shipped a flat-spinner model (one row of space tiles at the surface). As businesses accumulate their own spaces and the user surface fills with universal + contextual folders (Directory, Events, Personal, Businesses, Admin, Playmaker, Networks), a single flat spinner does not scale. The question is whether to build yet another bespoke navigation shape or recognize that cockpits are already folder renderers in disguise.
**Decision:** Cockpits render folders at each depth. Root folders are universal (Directory, Events, Personal, Businesses) plus contextual (Playmaker, Networks, Admin — appearing based on user state). Inside each root folder, the tree continues — Businesses contains your businesses, each business contains its spaces, etc. Workspace renders only at the leaf. Above the leaf, the cockpit shows sub-folders with a preview pulse below. Living feet: the folder tree is queried against user state, not hardcoded.
**Rationale:** A single data shape (a tree) carries all navigation. The cockpit's job becomes "render the current folder" — the same job at every depth. Adding a new space type, a new contextual folder, or a new cockpit style is a rendering concern, not a navigation redesign. This also makes the switcher (DEC-168) structurally consistent: it is the cockpit dissolving laterally across a folder's siblings rather than descending into one.
**Status:** Active. Related: DEC-155 (scoped-peer), DEC-117 (dark-until-explored), DEC-146 (living feet), DEC-168 (cockpit-native switcher). Effective: Phase 4 implementation.

---

### DEC-170: Home Collapses Into Desk Inside a Business (2026-04-24)

**Date:** 2026-04-24
**Context:** Early MyLane had a "Home" tile at the surface that served both as the user's landing surface and as an implicit stand-in for a business's landing surface when one was selected. As the folder architecture (DEC-169) separates Personal scope from Business scope, the double meaning breaks — Home belongs to the user, not the business.
**Decision:** There is no separate "Home" space inside a business. Desk is the home of business work. The current flat cockpit's Home tile is obsolete as a business-scope space; a user-scope Home tile lives inside Personal.
**Rationale:** A space should mean one thing in each scope. "Home" made sense when scope was implicit; once Personal and Business scopes are explicit (DEC-169), Home is only a Personal concept. Desk is where the operator goes to see client activity, projects, and logs — the operational center — which is what "home inside a business" was gesturing at.
**Status:** Active. Effective: Phase 4 implementation.

---

### DEC-171: Direct Doors Are Path-Based for Round 1 (2026-04-24)

**Date:** 2026-04-24
**Context:** Every business (and eventually user, network, event, region) needs an addressable URL that works as both a public-facing surface and an authenticated entry for operators. Subdomains (`red-umbrella.locallane.app`) are the ideal shape — DEC-121's "subdomain-as-hypha" growth model points there. But Base44's current infrastructure does not support wildcard subdomains. A Round 1 implementation has to work on what exists, not on what is promised.
**Decision:** Base44 does not support wildcard subdomains. Direct-door URLs use path prefixes: `/b/{slug}` for businesses, with analogous patterns for users, networks, events, and regions as those scopes ship. Custom domains per-business are supported for Round 2+ (white-glove config in R2, self-service in R4+). URL is the primary source of scope for `useActiveBusiness` and related; localStorage is fallback persistence.
**Rationale:** Paths ship today without infrastructure blocking. The `/b/{slug}` form is canonical and survives the eventual subdomain migration — both resolve to the same business entity. Making URL the primary scope source (with localStorage as fallback) means a direct door like `/b/red-umbrella/desk` works for anyone, even a user who was mid-flow in another business; the URL overrides the stored preference because URLs are explicit intent.
**Status:** Active. Effective: Phase 3.5 implementation. Related: DEC-155, DEC-168.

---

### DEC-172: Region as First-Class Entity with Lifecycle States (2026-04-24)

**Date:** 2026-04-24
**Context:** Round 1 today has one community — Lane County, Oregon. As LocalLane grows, each new community must be able to join at its own pace without a platform rebuild. Treating region as a filter on address strings makes growth fragile (addresses change, spellings vary, borders blur). Treating region as a first-class entity from the start means the data model already carries the seam for every downstream concern: region-scoped directories, regional leads, eventual federation.
**Decision:** Region is an entity with `name`, `slug`, `state`, `founded_date`, `region_lead_user_id`, `is_active`, `lifecycle_state` (seed / sprouting / established). Every user, business, event has `region_id`. Users in unfounded regions become seeds of those regions — "carried in the wind" growth. Phase 6 implements the entity + backfill (single region: Lane County); Phase 8+ adds cross-region UI and regional leads; Phase 10+ enables federation.
**Rationale:** The lifecycle states (seed / sprouting / established) make it safe to let a region exist before it has activity — the platform doesn't turn away a visitor from an unfounded community, it plants their interest as a seed. The data shape also supports the ten-year arc: every record already tagged with `region_id` can be peeled off to a regional instance without rewrite. Region leads are an instance of the authority model parked in Section 8, scoped to region — not a separate concept.
**Status:** Active. Effective: Phase 6 implementation. Related: DEC-115 (legacy grace), DEC-146 (living feet), the authority model parked at Section 8 of `LOCALLANE-CORE-ARCHITECTURE-v4-1.md`.

---

### DEC-173: Resurface Before Rebuild (2026-04-24)

**Date:** 2026-04-24
**Context:** LocalLane has accumulated useful surfaces during iteration that got buried as the architecture evolved — a persistent feedback affordance that used to hover bottom-right, an admin panel that used to live at `/Admin`, helpful empty-state copy that used to guide new users, keyboard shortcuts that used to work. "We used to have this" is a signal that the work already exists somewhere in the codebase or git history; rebuilding from scratch discards that work.
**Decision:** When a previously-built surface is needed in the current architecture, the first action is to find the existing component in the codebase and wire it into the current structure. Rebuilding from scratch is the last resort, taken only if the original is genuinely lost (not findable in code or git history).
**Rationale:** Preserves accumulated design intent — the original surface was built with specific UX decisions, copy choices, edge cases handled. Respects the work already done. Catches buried capabilities before they become forgotten entirely. Operationally: Hyphae's first step on any "we used to have X" prompt is `grep` + `git log --follow`; rebuild is last resort. Applies across all future phases, not scoped to any specific one — a standing rule.
**Status:** Active. Applies across all future phases, not scoped to any specific phase. Related: DEC-146 (Living Feet — don't duplicate what already exists as one thing).

---

### DEC-174: `service_area` is `array<slug>` on Business (2026-04-24)

**Date:** 2026-04-24
**Context:** Until Build E, `service_area` on Business was a freeform string ("Eugene/Springfield area," "Lane County," "Eugene area"). Different owners produced structurally identical service ranges in unsearchable spellings. The Directory had no clean way to filter or search on coverage. DEC-155 (per-entity $9 model) and the directory becoming the platform front-door make searchable structure on coverage non-optional.
**Decision:** `service_area` is now `array<slug>` on the Business entity. Slugs come from a curated Lane County town list (`src/config/laneCountyTowns.js` — 21 incorporated cities + notable unincorporated communities, each carrying `{slug, display_name, region_slug: 'lane-county'}` for forward compatibility with the Phase 6 Region/Town entities per DEC-172). The structured editor (`TownMultiSelect.jsx`) is universal across archetypes — no longer gated to `service_provider`. Legacy string values are preserved verbatim on existing records and rendered read-only on the public profile with an owner-only "(legacy)" annotation; the Settings editor shows the legacy string above the multi-select with "Pick the towns below to update." The first time an owner saves a structured selection, the array overwrites the legacy string. No backfill script — owner-initiated migration only.
**Rationale:** Forward-compatible with the Phase 6 Region/Town promotion (DEC-172) — when towns become first-class entities, the `array<slug>` shape becomes `array<id>` with no Business-side schema change. Curated source list eliminates the spelling-drift class of bug. Universal across archetypes per Doron's call: contractors, caterers, mobile groomers, house cleaners, farmers, art studios all have valid coverage declarations. Editorial, not geographic — a business *declares* where it operates; address doesn't constrain it. Legacy preservation respects existing records without a fragile auto-migration.
**Status:** Active. Implementation: Build E commit `7c21c3e` (community-node). `service_area` was already in `PROFILE_ALLOWLIST`; no server-side changes required. Related: DEC-155 (structure beats freeform for searchable directory data), DEC-161 (living tiles), DEC-172 (region as first-class entity), DEC-146 (living feet — one curated source for the town list).

---

### DEC-175: Migration Plan — Pattern C+ at Phase 6 (2026-04-24)

**Date:** 2026-04-24
**Context:** Migration research at `community-node/docs/migration-research.md` (commit `78fc8c7`) evaluated five patterns for moving LocalLane off Base44 onto Supabase + Vercel. Base44 has known constraints — auto-push to main with uninformative messages (DEC-162), agent auto-lint-fixes outside scope, publish blocker still open (escalation `95a004a0`), and `asServiceRole` does not bypass Creator Only RLS reliably (DEC-095 amendment, DEC-140). The platform is functional for Phase 3-5 work but the friction compounds. Phase 6 already opens the database for Region foundation backfill (DEC-172); migrating then bundles two fragility events into one.
**Decision:** **Pattern C+ — build to prepare on Base44, migrate at Phase 6 combined with Region backfill.** Specifically:
- **Trigger:** Phase 6 backfill window. One fragility cost, not two.
- **Target stack:** Supabase + Vercel.
- **Sandbox during construction:** `lanecountyrecess.com`. `locallane.app` continues running on Base44 until the migration switches over.
- **AI plan:** retire all 8 Base44 agents at migration. Build a single warm-presence companion fresh, designed from Bari's "AI tour guide" framing — softer, fewer agents, more presence — rather than porting the eight existing agents (each carrying hardcoded entity-name vocabulary that wouldn't survive a schema port).
- **Seam hardening through Phases 4-5:** no new direct CRUD anywhere. Build F bundles the Base44 SDK wrap into `src/api/`, with the multi-category build as first consumer validating the wrapper shape. At migration time, `src/api/` is the single replacement layer.
- **No backfill script for legacy data shapes** beyond what each phase already carries. Existing `service_area` strings, existing Phase 2 carryover fields, etc. all migrate as-is.
**Rationale:** Two migrations cost twice. Phase 6 already disturbs the database. The companion redesign is owed independently (Bari's framing makes the case more convincing than the existing eight-agent split), and combining it with the migration removes a future "now we port agents too" delay. The sandbox on `lanecountyrecess.com` lets us verify behavior on real domain shape (DEC-171 path-based doors, eventual custom domains in Round 2+) without risking the production tenant. SDK wrap into `src/api/` is migration insurance that pays off in Phase 4-5 anyway by enforcing one entity-access pattern.
**Status:** **Superseded by DEC-223 (2026-05-23).** Originally active; the migration plan it described (build to prepare on Base44, migrate at Phase 6 combined with Region backfill) is replaced by the fresh-rebuild path. The seam-hardening work done in Build F (`src/api/` SDK wrap) still taught us what a clean API surface looks like — that lesson carries forward to Plant 1 — but the SDK wrap itself is no longer a foundation the rebuild builds on. Reference: `community-node/docs/migration-research.md` (commit `78fc8c7`; flagged for cleanup — was supposed to be deleted post-decision per its own ephemeral note). Related: DEC-095 amendment, DEC-115 (publish blocker), DEC-140 (asServiceRole RLS), DEC-162 (Base44 working agreement), DEC-167 (schema-conformance audit), DEC-172 (Region as trigger), DEC-146 (Living Feet — `src/api/` is the one place entity access lives after Build F), DEC-223 (pivot to rebuild).

---

### DEC-176: Business.categories Field Added in Error, Left in Place (2026-04-25)

**Date:** 2026-04-25
**Context:** During Build F Phase 1 verify (2026-04-25), Mycelia fired a Base44 agent prompt to add a `categories: array<string>` field to the Business entity before Hyphae's verify report could complete. The verify pass then surfaced that the codebase already had `subcategories: array<string>` working under DEC-055, making the new `categories` field redundant.
**Decision:** Leave the empty `categories` field in place rather than fire a second Base44 prompt to remove it. Field is permissive (`array<string>`, default `[]`, no enum) and costs nothing sitting empty.
**Rationale:** Removing it would burn another Base44 agent round-trip and another auto-push cycle for zero functional gain. An empty optional field is cheaper than the change risk of re-touching the schema. Multi-category writes flow through `subcategories[]` per DEC-055; nothing reads or writes `categories`.
**Status:** Active. Candidate for Phase 5 schema consolidation. Related: DEC-055 (subcategories), DEC-180 (Phase 5 cleanup).

---

### DEC-177: Schema-Conformance Audits Include Write-Path Conformance (2026-04-25)

**Date:** 2026-04-25
**Context:** DEC-167 established schema-conformance audits before assuming Base44 entity behavior. Build F Phase 3 verify (2026-04-25) surfaced that this discipline must include write-path conformance — not just field-shape conformance. Hyphae's Phase 1 wrap delegated to `base44.entities.Business.update()` while the codebase routes 29 owner-write call sites through the `updateBusiness` server function (which gates writes via `PROFILE_ALLOWLIST` per DEC-025). Wrap had to be amended in Phase 3 to add `updateProfile()` wrapping the server function call.
**Decision:** Going forward, schema-conformance audits answer three questions: (1) what is the field shape, (2) what is the write path (entity SDK vs. server function), (3) what allowlists/permissions gate the write path.
**Rationale:** Field-shape conformance alone misses the security and gating layer. A wrap that bypasses the server function bypasses `PROFILE_ALLOWLIST` and any future write-time validation. Codifying the three-question audit before any wrap or migration prevents that whole class of regression.
**Status:** Active. Extends DEC-167. Related: DEC-025 (PROFILE_ALLOWLIST), DEC-146 (Living Feet — one write path per entity).

---

### DEC-178: Code-Level Schema Changes Paired with Base44 Dashboard Updates (2026-04-25)

**Date:** 2026-04-25
**Context:** Build E (commit `7c21c3e`, 2026-04-24) shipped `service_area` as `array<slug>` in code, and DEC-174 documented this as the canonical shape, but the Base44 dashboard entity schema was never updated to match. Field stayed as `string` while code wrote arrays. Result: every owner save returned `422 "Error in field service_area: Input should be a valid string"`. First surfaced by Bari smoke-test 2026-04-25. Fixed via Base44 agent prompt to change field type to `array<string>`.
**Decision:** Any DEC that documents a Business field shape change MUST include a paired Base44 agent prompt that updates the actual schema, fired and published before code that depends on the new shape ships to a real user.
**Rationale:** The `.jsonc` file in code is not source of truth — the Base44 dashboard is. A code-side shape change without the dashboard counterpart is a guaranteed save-time 422 the first time a real user hits the path. Pairing the two artifacts at decision time means the schema and code ship together, not in two separate sessions where the second one is forgotten.
**Status:** Active. Related: DEC-167 (schema-conformance audit), DEC-174 (`service_area` shape), DEC-093 (Base44 entity changes via agent prompts).

---

### DEC-179: Phase 3.5 Direct Doors Deferred to Post-Migration (2026-04-25)

**Date:** 2026-04-25
**Context:** Bari Swartz's $500/mo retainer covers Doron's time helping him with Field Service workflow (contracts, estimates, current Excel flow plus the new LocalLane flow), NOT replacement of his public website. Bari already operates redumbrellaservices.com and is not under farmers market URL pressure. Phase 3.5 (path-based routing for `/b/{slug}`, public profile rendering, react-helmet meta tags) is therefore deferable to post-migration without breaking Bari's expectations.
**Decision:** Defer Phase 3.5 (Direct Doors per DEC-171) to post-migration. Bari remains listed in the LocalLane directory (already shipped via Build F). Field Service node maturation is the priority for Bari-specific value.
**Rationale:** Direct Doors are most valuable when there's a public-facing URL pressure point — and Bari doesn't have one. Building a public profile renderer + path routing on Base44 only to rebuild it on Supabase+Vercel post-migration is two builds for one outcome. Better to ship it once, on the post-migration stack, when the next paying user with a real URL need surfaces.
**Status:** Active. Phase 3.5 moves out of the pre-migration phase queue. Related: DEC-171 (path-based direct doors), DEC-175 (Pattern C+ migration plan).

---

### DEC-180: Phase 5 — Pre-Migration Cleanup (2026-04-25)

**Date:** 2026-04-25
**Context:** With Phase 3 closed and the migration window resolved at Phase 6 (DEC-175), the pre-migration backlog has accumulated dead code, vestigial patterns, and dormant entities that would each translate into wasted Supabase migration work. Migrating a dormant entity requires Supabase schema, RLS policies, indexes, and a migration script — pure waste if no live code reads or writes it.
**Decision:** Insert a new **Phase 5: Pre-Migration Cleanup** into the roadmap, between Phase 4.5 (Seedlings) and Phase 6 (Migration to Supabase + Vercel). Phase 5 covers:
- (a) **Dead code removal** — `legacyCategoryMapping` in `categoryData.jsx:229-240` (pre-DEC-055 IDs); `BusinessEditDrawer` derived-write pattern at `BusinessEditDrawer.jsx:75-98` (vestigial after Build F.3's Directory patch); the unused `Business.categories` field per DEC-176.
- (b) **Unused entity audit** — every entity to be migrated to Supabase requires Supabase schema, RLS policies, indexes, migration script.
- (c) **Architectural consolidation** — legacy `category` field finally retired; archetype + main_category + sub_category_id shape consolidated into `subcategories[]` (Hyphae's "Option 3 future" from Build F verify).
- (d) **Walking-the-app cleanup findings** from Doron's separate notes-taking session.
**Rationale:** Cheaper to delete pre-migration than port-then-delete. The migration window is already a fragility event (DEC-175); arriving at it with a clean codebase halves the surface area being migrated and removes the "do we still use this?" uncertainty from every entity migration question.
**Status:** Active. Effective: Phase 5 implementation. Related: DEC-055 (subcategories), DEC-175 (migration plan), DEC-176 (categories field), DEC-146 (Living Feet).

---

### DEC-181: Multi-Machine Development Setup (2026-04-25)

**Date:** 2026-04-25
**Context:** Doron added a Mac mini as a second development machine on 2026-04-25, alongside the existing MacBook Pro 2017. Path drift between machines is a special class of pain — silent until it bites mid-session. To prevent this, both machines run identical setups: GitHub Desktop, Claude Desktop, Claude Code (Hyphae) v2.1.119, Node.js v24.15.0 with `~/.npm-global` prefix, SSH keys authenticated to github.com/withdoron. All four repos cloned at `~/Documents/GitHub/` on both machines: community-node, Spec-Repo, private, ephraim-games. All remotes use SSH.
**Decision:** Treat Mac mini as primary (more powerful, eventual Clawbot host) and MacBook Pro as secondary (mobility, field visits to Bari, etc.). Working discipline: pull as the first action of any session, push after every commit (Hyphae default cadence — already standard, now load-bearing for multi-machine). All Hyphae-touched docs reference paths as `~/Documents/GitHub/...` so prompts work identically on either surface.
**Rationale:** Two surfaces beats one for both resilience (laptop dies, mini still has the work) and reach (field visits with the laptop, deep work on the mini). The cost is discipline around pull/push cadence — but that cadence already exists, so the marginal cost is zero. Path alignment was completed today (Spec-Repo commit `29351e4`) before this DEC; first Hyphae session run from the mini doubled as the round-trip smoke test.
**Status:** Active. Related: future Clawbot work (Mac mini host), DEC-146 (Living Feet — one path convention across surfaces).

---

### DEC-182: Single-Source Documentation, Scheduled Drift Sync (2026-04-26)

**Date:** 2026-04-26
**Context:** Phase 4 warmup (community-node commit `fe9fad9`, 2026-04-26 morning) revealed that community-node was carrying its own copies of `context/PROJECT-BRAIN.md`, `context/ACTIVE-CONTEXT.md`, and `context/SESSION-LOG.md` that had drifted ~10 days behind Spec-Repo canonical (community-node copies dated 2026-04-15 / 04-04 / ~04-05; Spec-Repo at 2026-04-25 Phase 3 closeout). The same audit also surfaced broken `@`-imports in `community-node/CLAUDE.md` pointing at files that exist only in Spec-Repo (`ARCHITECTURE.md`, `STYLE-GUIDE.md`, `.cursorrules`). Two paths forward: mirror those reference docs into community-node so every @-import resolves locally, or accept cross-repo reads as the convention and keep community-node lean.
**Decision:** Spec-Repo is the canonical home for all project documentation. Tool-specific repos (community-node today, future tool repos) do not mirror reference docs — they reach across via explicit `~/Documents/GitHub/Spec-Repo/...` paths. The single, narrow exception is the `context/` directory (`PROJECT-BRAIN.md`, `ACTIVE-CONTEXT.md`, `SESSION-LOG.md`), which is mirrored into `community-node/context/` as a lean read-only copy. The mirror is refreshed by scheduled drift-sync passes (typically one Hyphae prompt per Phase or per Monthly Sharpening) — the mirror never edits ahead of canonical. `community-node/CLAUDE.md` and `community-node/AGENTS.md` are NOT mirrors; they are community-node-native, tool-specific files with no Spec-Repo equivalent. All other reference docs (`ARCHITECTURE.md`, `STYLE-GUIDE.md`, `BUILD-PROTOCOL.md`, full `DECISIONS.md`, `STATUS-TRACKER.md`, etc.) live in Spec-Repo only and are read on demand via cross-repo paths.
**Rationale:** Mirrors create drift surfaces — every duplicated file is a future audit finding, and the cleanup tax compounds. Single-source-with-sync trades a small amount of cross-repo path friction for a much smaller cognitive surface. The `context/` directory earns its mirror because Hyphae sessions starting cold inside `community-node/` need at-hand orientation (PROJECT-BRAIN, ACTIVE-CONTEXT, SESSION-LOG) without the latency of a cross-repo reach every session. The other reference docs are read on-demand, not session-startup, so cross-repo reads are fine. Drift-sync cadence (once per Phase) is the maintenance cost; we accept it knowingly. This DEC ratifies what the Phase 4 warmup did empirically and locks in the rule.
**Status:** Active. Demonstrated in companion community-node commit (re-syncs `context/PROJECT-BRAIN.md` from this Spec-Repo edit + removes two stale orphaned docs).

---

### DEC-183: Walk the Path Before Sinking Thought (2026-04-26)

**Date:** 2026-04-26
**Context:** Today's planning conversation produced a 115-line Section 8 amendment to `PHASE-4-MIGRATION-PLAN.md` detailing decisions about features that won't ship for weeks. Most of the decisions ended up being deferrals — don't build preview pulse, don't build shortcuts, don't build URL nesting, don't redesign Desk yet. Doron flagged a working principle that emerged: don't build vision without walking a short distance of the path; if we build without dogfooding, we sink thought. The reminders example (using a primitive reminders system, finding specific frictions, knowing exactly what to spec when the time comes) demonstrates the principle in practice.
**Decision:** Phase 4 (and future phases) ships in path-walking cadence. Each sub-phase ships, gets used, generates real-world friction signal, and only then informs the next sub-phase's spec. Sub-phases are not pre-sequenced for back-to-back execution. Smaller steps, used between, are better than large planned blocks shipped sequentially. This applies broadly: any feature whose specification depends on what real users (including Doron himself) actually need from it should ship a primitive version, get used, and earn its real spec from that use.
**Rationale:** Vision-without-path produces rework. The cost of guessing a feature's shape is paid twice: once to build the wrong version, once to rebuild the right one. The cost of shipping a primitive version and learning from it is paid once. Time-pressure (custody trial, Bari's needs, Saturday Market window) does not change this — it strengthens it. Path-walking is faster across the full arc, even if any single step looks slower.
**Status:** Active. Applied immediately to Phase 4 cadence. Tomorrow's first move (Phase 4.1) is the smallest possible move that earns the right to think about Phase 4.2.

---

### DEC-184: Greenfield Alibi Project as First Supabase + Vercel Build (2026-04-26)

**Date:** 2026-04-26
**Context:** DEC-175 set the migration to Supabase + Vercel as Phase 6 work, with sandbox on `lanecountyrecess.com`. Tonight Doron raised the question of whether the first work on the new stack should be the LocalLane migration itself or the field instrument (alibi) project, which is currently seed-stage and has no infrastructure. Argument for migration first: it's the necessary work for LocalLane's scale ceiling. Argument for alibi first: greenfield is a different mental shape than migration, blast radius is small (two users), the project shape exercises the right parts of Supabase + Vercel (Postgres + RLS + Next.js + edge functions), Pedrom is the right collaborator for a greenfield experiment, and it operationalizes DEC-183 (walk a short path before sinking thought into the larger one).
**Decision:** The greenfield alibi project is the first build on Supabase + Vercel. It develops in slow hours alongside Phase 4 and Phase 5 LocalLane work, not as a blocking phase. By the time Phase 5 cleanup finishes and Phase 6 migration starts, the alibi build has produced platform-learning fluency that informs the LocalLane migration meaningfully. This serves three purposes from one body of work: the alibi project itself, platform learning for Phase 6, and a pressure-test of how Mycelia + Hyphae operate on a greenfield project on the new stack.
**Rationale:** Migrating an existing app onto an unfamiliar platform compounds two unknowns simultaneously — the platform itself plus the migration mechanics. Building greenfield on the new platform isolates the platform-learning unknown. The alibi project's posture is already "slow-compounding, develop in slow hours" per its seed doc; aligning it with platform-learning value is fitting rather than additive. This also gives Pedrom a real product to participate in while the relationship is still slow-compounding rather than waiting on a future formal ask.
**Status:** Active. Aligned with `FIELD-INSTRUMENT-SEED.md`'s posture and DEC-175's Phase 6 timing.

---

### DEC-185: Phase 4.2-tiles Design Pivot — Tiles as Primary Cockpit (2026-04-28)

**Date:** 2026-04-28
**Context:** Phase 4.2a shipped (2026-04-27 afternoon) introduced folder-vs-leaf rendering on the spinner cockpit. Smoke testing surfaced three real frictions: (1) the pill-switcher's contextual meaning shifted confusingly with depth — clicking the "finances" pill entered business switcher mode anywhere it appeared; (2) folder-centered positions rendered to silence below the cockpit (Section 8.1) — philosophically clean but felt empty in real use; (3) the "what's inside this folder" question doesn't have a natural spinner answer — the spinner gives one centered thing, a folder is many things. The pre-build investigation (2026-04-27 evening) confirmed the existing primitives (Tile shape inside BusinessCard, shadcn breadcrumb) could compose into a tile cockpit cleanly without rebuilding what already existed.
**Decision:** Tiles become the primary cockpit pattern. The spinner is preserved as a selectable alternate cockpit gated behind `COCKPIT_PICKER_ALLOWLIST` (DEC-147 R&D allowlist pattern, codified separately as DEC-188). Phase 4.2-tiles absorbs the original 4.2b (Businesses-as-folder), 4.3 (Home → Desk collapse), 4.4 (Preview pulse), and 4.5 (Spaces add/remove UI) into a unified six-step sub-build sequence. Each ships separately per DEC-183 path-walking. Section 8.13 of `PHASE-4-MIGRATION-PLAN.md` captures the eleven load-bearing design decisions (tile primitive shape, Settings universal, category-driven accents preserved, cockpit picker pattern, hybrid-mode breadcrumb, space-type catalog principle, cold-open synthetic root, breadcrumb supersedes center-tap descent, etc.).
**Rationale:** The spinner's "one centered thing" model fights the "folder of many things" navigation question. Tiles answer it natively — a grid is a folder is a grid. The spinner cockpit retains its identity-distinctive role for users who prefer it (DEC-152 cockpit library pattern); tiles don't replace, they become the primary surface most users see. Six smaller sub-builds shipped via path-walking generate friction signal that informs the next, vs. one large pre-sequenced refactor. The tile cockpit specifically enables uniform navigation (DEC-191) — every root tile descends into the render layer with breadcrumb above — which the spinner can't structurally do.
**Status:** Active. Tiles-1 through tiles-4 shipped 2026-04-28 (community-node `a3ac463`, `caae822`, `77571b7`, `84a9889`; Spec-Repo `a96ae43`, `4598419`, `081882b`, `65ff952`, `8b94ec1`). Cleanup pass (`2c01950` community-node, `1551f30` Spec-Repo) removed Field Service from Personal as the city/buildings architectural metaphor required. Tiles-5 next (Settings + Profile workspace surfaces + pricing-structure design).

---

### DEC-186: Settings as a Universal Space (2026-04-28)

**Date:** 2026-04-28
**Context:** Phase 4.1 added `Business.enabled_spaces: array<string>` for opt-in space activation. The pre-build investigation surfaced the question of whether Settings (and Profile) should be listed in `enabled_spaces` or guaranteed as universal. Per Section 8.10's backfill, Bari's `enabled_spaces` is `["profile", "desk", "settings"]` and most others are `["profile"]`. A business with no Settings space would be unreachable — no way to edit its name, toggle directory listing, or delete itself.
**Decision:** Profile and Settings are universal — they render unconditionally for every business regardless of `enabled_spaces`. They are listed in the SPACE_TYPES catalog with `universal: true` and never added to `enabled_spaces` in any backfill; their presence is guaranteed by composition in `resolveBusinessSpaces()`. `enabled_spaces` means "additional opt-in spaces" only.
**Rationale:** Settings + Profile are part of what *being a business in LocalLane* means, not a feature flag. The 4.5 Add/Remove Space UI manages only the opt-in subset, simpler to think about. Backfill logic stays minimal — adding a new Business doesn't need to remember to set Profile + Settings in `enabled_spaces`. Defensive: a stale Base44 record without Settings still gets a Settings tile.
**Status:** Active. Implemented in `src/config/spaceTypes.js` (Phase 4.2-tiles-4) with `universal: true` flag on the `profile` and `settings` entries. The `resolveBusinessSpaces()` helper unions universal entries with `enabled_spaces` and dedupes.

---

### DEC-187: Category-Driven Tile Accents Preserved — No Per-Business Brand Color in v1 (2026-04-28)

**Date:** 2026-04-28
**Context:** Phase 4.2-tiles needed accent-color decisions for tiles. The existing Directory tile (BusinessCard) uses a category-derived accent via `resolveCategoryAccent(business)` (DEC-060) — colors keyed on `main_category` slug. The pre-build investigation considered introducing a per-business `brand_color` field for personalized accents.
**Decision:** v1 preserves the category-driven accent pattern. No `brand_color` field added to Business. Owned-business tiles in tile cockpit reuse `resolveCategoryAccent` for visual continuity with Directory. Folder tiles (Directory, Events, Personal, Businesses, Discover) get hardcoded accents in `TilesCockpit.jsx`'s FOLDER_ACCENTS map, drawn from the same `border-l-{color}-700` palette. Per-business space tiles get their accents from the SPACE_TYPES catalog (DEC-190).
**Rationale:** Adding `brand_color` is a Base44 schema change (DEC-178 paired update) plus settings UI plus a backfill plus owner-personalization design — meaningful scope outside tiles-4. The category palette already serves "category at a glance," which is a real design property. Path-walking surfaces whether per-business personalization is worth the work; if so, additive later (one new optional field on Business + a Settings color picker, no migration of accent code paths).
**Status:** Active. Revisit if path-walking surfaces a real owner-personalization need.

---

### DEC-188: Cockpit Picker Dev-Allowlist via COCKPIT_PICKER_ALLOWLIST (2026-04-28)

**Date:** 2026-04-28
**Context:** Tiles cockpit became the v1 default for everyone (DEC-185). Spinner and compass cockpits are preserved per DEC-152 but were no longer the default. The pre-build investigation considered three patterns for handling the cockpit-picker UI: (1) full picker visible to all users with three options; (2) picker hidden entirely; (3) picker gated to a dev allowlist mirroring the existing `MYLANE_AGENT_ALLOWLIST`.
**Decision:** Pattern 3. New constant `COCKPIT_PICKER_ALLOWLIST = ['doron.bsg@gmail.com']` in `MyLaneSurface.jsx`, paralleling the existing `MYLANE_AGENT_ALLOWLIST`. Gates the AccountOverlay's cockpit toggle row — non-allowlisted users see no toggle (DEC-147 — no placeholder, no "coming soon"). Force-migration `useEffect` in MyLaneSurface mount overwrites localStorage from spinner/compass to tiles for non-allowlisted users; allowlisted users keep their preference. The toggle cycle is `tiles → spinner → compass → tiles` for allowlisted users.
**Rationale:** Tiles cockpit needs to prove out before the spinner/compass options become user-visible. Hiding the toggle keeps the v1 surface clean while preserving developer access to alternate cockpits for testing. Pattern matches DEC-147 R&D allowlist convention. When tiles is proven, drop the gate; the option becomes user-visible without code changes beyond removing the conditional. DEC-148 footnote: if a third allowlist constant lands, extract to a shared `DEV_USER_ALLOWLIST`.
**Status:** Active. Implemented Phase 4.2-tiles-3 (`77571b7` community-node).

---

### DEC-189: Hybrid-Mode Breadcrumb Component (2026-04-28)

**Date:** 2026-04-28
**Context:** The tile cockpit needs a path indicator showing folder descent. The spinner cockpit could also benefit from a path indicator for nested-folder support. Two design questions: (a) build cockpit-specific breadcrumb components, or one shared component with mode-driven sizing? (b) build from scratch or compose the existing shadcn breadcrumb primitive set in `src/components/ui/breadcrumb.jsx`?
**Decision:** One cockpit-agnostic `BreadcrumbPath` component with two presentation modes via `mode` prop: `"primary"` for tile cockpit (large segments, prominent position where the spinner area was) and `"adjacent"` for spinner cockpit and future cockpits (smaller, supporting affordance). Both modes share the same warm-on-hover pill family — same data, same logic, different visual weight per cockpit. The component composes the existing shadcn breadcrumb primitives (DEC-173 resurface) for a11y wrapping (`<nav aria-label>`, `<ol>`, `<li>`, `aria-current="page"`); overrides shadcn's default classes for LocalLane's pill language. The file is named `BreadcrumbPath.jsx` (not `Breadcrumb.jsx`) to avoid case-insensitive APFS collision with the existing lowercase `breadcrumb.jsx`.
**Rationale:** Future cockpits inherit the breadcrumb for free by mounting it in either mode. The compose-not-extend pattern preserves the shadcn primitives' a11y semantics while wrapping them in the LocalLane visual language. Mirrors the `ConfirmDialog`/`alert-dialog` precedent — opinionated wrapper alongside primitive set.
**Status:** Active. Shipped Phase 4.2-tiles-2 as `src/components/ui/BreadcrumbPath.jsx` (`caae822` community-node). Currently consumed only by TilesCockpit in `mode="primary"`. The spinner cockpit could mount it `mode="adjacent"` if Doron toggles to spinner and wants nested-folder breadcrumbing.

---

### DEC-190: Space-Type Catalog Principle (2026-04-28)

**Date:** 2026-04-28
**Context:** Phase 4.2-tiles-4 became the first consumer of `Business.enabled_spaces`. The renderer needed a way to map space-type strings (as stored in the array — `'profile'`, `'settings'`, `'desk'`, etc.) to tile metadata (label, sublabel, accent class, eventual workspace renderer reference). The pre-build investigation identified that this is the same living-feet pattern as `folderTree.js`, `folderPredicates.js`, `VARIANT_MAP`, `WORKSPACE_TYPES` — config-driven dispatch over inline conditionals.
**Decision:** Any consumer of `enabled_spaces` (or analogous space-type fields on other entities) reads space metadata from a single config catalog (`src/config/spaceTypes.js`), never from inline conditionals in the renderer. Each catalog entry maps a space-type id to its tile metadata + universal flag (DEC-186) + (eventually) workspace renderer reference. Adding a new space type means one config entry. The companion helper `resolveBusinessSpaces(business)` unions universal entries with the business's `enabled_spaces` and dedupes.
**Rationale:** Same living-feet pattern as the four other config-driven dispatches in the codebase (folderTree, folderPredicates, VARIANT_MAP, WORKSPACE_TYPES). Inline `if (spaceId === 'profile')` chains don't scale and don't compose; config does both. The catalog is also where the universal-vs-opt-in distinction lives (DEC-186), so Settings/Profile semantics are one source of truth. Future Engagements-as-folder, per-business event spaces, etc. plug in via additional catalog entries without renderer changes.
**Status:** Active. First catalog has eight entries (`profile`, `settings`, `desk`, `finance`, `team`, `kitchen`, `property`, `events`); `profile` and `settings` flagged universal. Workspace renderer references deferred until tiles-5+ wires per-business workspace surfaces (each space type needs careful per-business profile-scoping; not a one-line dispatch).

---

### DEC-191: Uniform Navigation Pattern — DEC-148/DEC-168 Retired for Tile Users (2026-04-28)

**Date:** 2026-04-28
**Context:** Tile cockpit's tiles-3 ship preserved the DEC-148 overlay shortcut for Directory/Events and the DEC-168 lateral switcher for Businesses as transitional special-cases. Tiles-4's smoke testing confirmed the design philosophy: every tile descent should work the same way. No special cases. The render layer is location-aware; whatever's at the current location renders there.
**Decision:** For tile cockpit users, the DEC-148 overlay pattern and DEC-168 lateral switcher pattern are retired. Tile-tap on Directory/Events descends and renders the page content inline (using the same `.overlay-page-content` wrapper class so existing page-header suppression carries forward — DEC-173 resurface, no page rebuild). Tile-tap on Businesses descends to a tile grid of owned businesses (each rendered as a generic `<Tile>` with category accent via `resolveCategoryAccent`); tap a business to commit operating-as context (mirrors DEC-168 commit logic exactly via `setActiveBusiness`) AND descend into that business's spaces tile grid. Spinner cockpit users (allowlisted) keep both patterns — `handleCenterTap` still triggers `OV.DIR`/`OV.EVT` overlays and `enterSwitcher`. The DEC-148 overlay machinery and DEC-168 switcher state remain in MyLaneSurface unchanged; only the tile cockpit's tile-tap handlers stop triggering them.
**Rationale:** Uniform navigation = predictable navigation. The render layer carries the breadcrumb + content; every tile descends the same way. Tiles can do uniform descent because the grid handles "many things at this level" naturally; the spinner cannot do uniform descent because its model is "one centered thing." Preserving both patterns for spinner users keeps DEC-152 cockpit-library decoupling intact — each cockpit retains its own descent vocabulary. The split is honest: each cockpit's affordances match its visual model.
**Status:** Active. Implemented Phase 4.2-tiles-4 (`84a9889` community-node). Spinner cockpit's preservation verified by inspection: `handleCenterTap` in `MyLaneSurface.jsx` still routes Directory/Events through overlays and Businesses through `enterSwitcher`. Allowlisted users who toggle to spinner reproduce all prior behavior.

---

### DEC-192: Engagements Design Fully Closed (2026-04-28)

**Date:** 2026-04-28
**Context:** Engagements concept seeded 2026-04-26 evening, structurally locked 2026-04-27 morning with three open detail questions deferred (permissions blob granularity, project-level authorship, acceptance and notification flow). Pre-build investigation (2026-04-28 morning) addressed all three plus surfaced two architectural patterns worth flagging for future. Engagement entity built in Base44 the same day.
**Decision:** Three detail questions resolved (full text in `private/users/bari/ENGAGEMENTS-DESIGN-NOTES.md` Section "Resolved Open Questions"):
1. **Permissions blob granularity:** Smart defaults per `recipient_role`. Setting role to `"client"` auto-populates a default permissions blob with the standard client view; setting role to `"subcontractor"` populates a different default. The override surface exists in the schema but no UI exposes it in v1. The role string carries semantic meaning.
2. **Project-level authorship:** The `permissions.initiator_to_recipient` blob encodes both view permissions AND action permissions in one structured object. View permissions = what the recipient *sees*; action permissions = what they *can do* (sign estimate, approve change order, log time). Change orders specifically trigger e-sign for both initiator and recipient — same two-party state machine as engagement acceptance.
3. **Acceptance and notification flow:** Email + in-app notification (no SMS in v1). Pending engagement appears in recipient's Engagements folder with a muted-state visual + accept/decline buttons; sits indefinitely (no auto-decline). Initiator can withdraw (`status: withdrawn`); recipient can decline (`status: declined`, historical record preserved); re-invitation creates a new record.

Two architectural patterns flagged for future (out of scope for v1):
- **Two-party acceptance as a recurring primitive** — engagement acceptance, change order approval, project completion sign-off all share the same shape. Don't extract until a third or fourth instance lands; name the pattern so the extraction case becomes obvious. Likely shape: `TwoPartyAction` primitive (initiator + recipient + state + initiator_signoff + recipient_signoff + history).
- **Bid-request / job-listing workflow** — the inverse direction (homeowner posts a need, contractors apply, homeowner picks one). Lives upstream of Engagement; v1 schema's `created_by` may differ from `initiator_id` in some cases (the listing-poster created the situation, but the chosen contractor is the engagement's initiator). v1 schema shouldn't preclude this entry path.
**Rationale:** Closes the design state of Engagements so the entity build can proceed without waiting on additional planning. v1 ships smart defaults that serve the common case; override surface accommodates the edge case when someone asks for it. The two flagged architectural patterns are named not built — DEC-183 path-walking applies (don't pre-build the abstraction; ship the concrete cases first, extract when the pattern repeats three times).
**Status:** Active — design fully locked. Engagement entity created in Base44 (2026-04-28; one Read permission deviation: Base44 doesn't support multi-field OR conditions on read at the schema layer, so set to authenticated with row-level scoping moved to query logic — existing precedent: Recommendation, Debt entities). Pattern saved: post-Supabase migration, RLS policy `(auth.uid() = initiator_id) OR (auth.uid() = recipient_id)` replaces this workaround. First live instance (Doron-Bari retainer) pending entity availability + UI build. Engagements remains a parallel workstream not yet integrated into Phase 4 sequencing. Engagement scoped-query server function owed during tiles-5+ area; will retire during Supabase migration in favor of RLS.

---

### DEC-193: FSChangeOrder `total` vs `amount` — Display vs Canonical Recompute Field (2026-04-30)

**Date:** 2026-04-30
**Context:** Phase 1 Item 2c (CO math + signing flow + total_budget recompute) needed a single canonical number for the parent project's `total_budget` recompute formula `original_budget + sum(signed COs)`. The CO entity carries two number fields that look superficially similar: `total` (sum of CO line items, the working number used for display in the CO list) and `amount` (the canonical net contract adjustment). For early COs without calculated lines or modifiers the two values are equal; once Management Fee, O&P, Tax, or Other modifiers land on a CO, they diverge — `total` is the line-items-only sum, `amount` is the full grand total the client is billed.
**Decision:** `signChangeOrder` (and `voidChangeOrder` after DEC-197) reads `amount` for the recompute, never `total`. `amount` is the canonical net contract adjustment; `total` is the working/display line-items sum. Code that contributes a CO to FSProject.total_budget must use `amount` (with a `parseFloat(c.total) || 0` fallback for legacy records that pre-date the `amount` field). Code that displays "the CO totals" in the UI may use either depending on what's communicated; the CO list inline breakdown uses `amount` because that's what the client sees billed.
**Rationale:** Conflating the two would cause silent under-billing once a CO with O&P/Tax modifiers gets signed — the parent project's contract total would grow by the line-items subtotal, missing the modifier amounts. Splitting them named the distinction so future code can't accidentally reach for the wrong field. The fallback to `total` for legacy records preserves backward compatibility without a migration.
**Status:** Active. Implemented in `signChangeOrder/entry.ts` and `voidChangeOrder/entry.ts` (Phase 1, 2026-04-30). Client-side recompute helpers in `FieldServiceProjects.jsx` mirror the same field choice.

---

### DEC-194: `features_json` as the Canonical FieldServiceProfile Feature Flag Store (2026-04-30)

**Date:** 2026-04-30
**Context:** Phase 1 wiring fix (commit `3c218d4`) traced a class of "feature toggle silently doesn't work" bugs to a single root cause: the FieldServiceProfile entity carries both top-level boolean fields (`overhead_profit_enabled`, `insurance_work_enabled`, `xactimate_enabled`, etc.) AND a `features_json` blob, and different code paths read different sources. The mount point (`MyLaneDrillView.jsx:177`) was reading `profile.features` (a key that doesn't exist on the entity at all), so every `=== true` gate against a default-off flag silently failed. Default-on flags appeared to work because `!== false` against `undefined` is true — both broken, only the default-off ones surfaced.
**Decision:** `features_json` is the single source of truth for FieldServiceProfile feature flags. All reads go through `getFeatures(profile)` (`src/utils/fsFeatures.js`), which merges `features_json` with `FEATURE_DEFAULTS` and migrates the legacy `insurance_work_enabled` flag into the modern `overhead_profit_enabled` + `xactimate_enabled` pair. Top-level legacy boolean fields on the entity (`overhead_profit_enabled`, `insurance_work_enabled`, `xactimate_enabled`, `management_fees_enabled`, etc.) are deprecated — present in the schema for backward compatibility but never read or written. An optional Base44 cleanup prompt is staged at `community-node/base44-prompts/PHASE-1-DEPRECATE-LEGACY-FEATURE-FLAGS.md` for a future schema sweep.
**Rationale:** Two parallel storage shapes for the same concept guarantees drift. Funneling reads through one helper means new flags (Sales Tax in Phase 1, future ones in later phases) only need to be added to `FEATURE_DEFAULTS` once; every consumer picks them up. The asymmetric failure pattern (default-off broken, default-on appearing-to-work) is the kind of bug that hides until you happen to flip the right toggle — funneling reads through a defaulted helper makes that whole class of bug structurally impossible.
**Status:** Active. `getFeatures()` is the read path; `FieldServiceProfile.update({ features_json: {...} })` is the write path. Eight flags in FEATURE_DEFAULTS as of 2026-04-30 (permits, subs, management_fees, overhead_profit, xactimate, tax, payments, timeline).

---

### DEC-195: Management Fee Distinct from O&P — Two First-Class Features, Subtotal Basis, Never Stack (2026-04-30)

**Date:** 2026-04-30
**Context:** Phase 1 Item 6 (commit `db138bf`) untangled a long-standing conflation. The existing O&P (Overhead & Profit) toggle is correctly named for insurance-scope work — Xactimate-style estimates where O&P is a recognized markup category. But contractors like Bari (general contractors who sub everything out and charge a percentage to manage the project) had been using O&P as a workaround for a missing Management Fee feature. The two billing intents are distinct: O&P is the insurance-recognized markup on a damage estimate; Management Fee is the GC's transparent percentage on top of actuals.
**Decision:** Management Fee and O&P are two first-class, independent features. Each has its own toggle in Settings (both default off, see DEC-197), its own percentage field on FSEstimate and FSChangeOrder (`management_fee_pct`, `overhead_profit_pct`), its own computed amount field (`management_fee_amount`, `overhead_profit_amount`), and its own line in every render surface (Estimate Preview, CO list, Client Portal CO blocks). Both calculate against subtotal-only (the line-items sum) — neither stacks on the other or on Tax. The display order across all surfaces is fixed: **Subtotal → Management Fee → O&P → Other → Tax → Total**. Management Fee precedes O&P because for GCs (the more common case in Eugene's local market) it's the primary line; O&P is the insurance-work overlay.
**Rationale:** Conflating the two forced contractors to pick the wrong toggle name to do their actual billing math, and forced the spec to either over-load O&P with a generic-percentage meaning or pretend GC management billing didn't exist. Splitting them honors how each business actually runs (Bari's 25% management fee is a transparency feature — see `private/spaces/field-service/FINANCIAL-WORKFLOW-INTENT.md` §2; insurance-scope O&P is an industry-standard markup with different semantics). Both subtotal-only basis means the math is predictable and never ambiguous about whether a fee is computed on top of another fee.
**Status:** Active. Implemented across `calcTotals()`, FSEstimate builder, FSChangeOrder builder, EstimatePreview render, CO list inline breakdown, ClientPortal CO render. Display order verified consistent across all five surfaces.

---

### DEC-196: Cache Invalidation Must Target the Subscriber's Actual queryKey (2026-04-30)

**Date:** 2026-04-30
**Context:** Phase 1 polish bundle dogfood (commit `317950e`) surfaced a silent-no-op bug: Settings (and FieldServicePeople) invalidated `['fs-profiles']` after every save, but the FieldServiceProfile records actually live in the React Query cache under `['mylane-profiles-v2', userId]` (loaded by the `getMyLaneProfiles` server function per DEC-130). React Query's `invalidateQueries` is a no-op when no live query subscribes to the key being invalidated — so the profile prop reaching Settings on remount was always pre-save, and toggles appeared to revert. Bug had been latent since the original Settings was written; only became visible under rapid-iteration testing because the actual cache had a 5-minute `staleTime` (DEC-130) that masked the issue when users left enough time between save and re-visit.
**Decision:** Cache invalidation must target the queryKey the live subscriber actually uses. When more than one site invalidates the same logical cache (10 sites for FieldServiceProfile in Phase 1), wrap the invalidation in a single named helper that owns the canonical key (`invalidateFSProfiles(queryClient, userId)` in `src/utils/fsFeatures.js`). When the underlying subscriber's queryKey changes, only the helper updates — every consumer follows. This is Living Feet (DEC-146) applied to cache invalidation: one source of truth for the cache key, every save site references it.
**Rationale:** Cache keys drift quietly. The original `['fs-profiles']` key matched a previous query shape that was refactored away (DEC-130 collapsed multiple profile queries into one server function call under a new key) without sweeping the invalidation sites — the keys silently diverged and the invalidations turned into no-ops. Naming the helper makes future drift impossible to commit accidentally; a renamed cache key forces an audit of the helper's one definition. The 5-min staleTime making the bug semi-self-healing is also a lesson: invalidation bugs hide behind reasonable cache freshness defaults until users iterate fast enough to outpace the natural refresh.
**Status:** Active. `invalidateFSProfiles` helper introduced in commit `317950e`; 10 invalidation sites updated across `FieldServiceSettings.jsx` (9 mutations + 2 onClick handlers) and `FieldServicePeople.jsx`. The narrower `['fs-profile']` (singular) cache used by FieldServiceHome's `guide_dismissed` toggle and one Settings invitee handler is intentionally separate and not part of this helper — flagged for a separate audit pass.

---

### DEC-197: Fee/Insurance Toggles Default Off — Opt-In Only, No Industry-Preset Auto-Defaults (2026-04-30)

**Date:** 2026-04-30
**Context:** Phase 1 added five fee/insurance-related feature toggles — Management Fee (DEC-195), O&P, Insurance Work (Xactimate), Sales Tax. Each could plausibly be defaulted on for businesses matching certain industry profiles (e.g., insurance restoration → Xactimate on, GCs in Eugene → Management Fee on). The pre-build conversation considered building smart industry-preset defaults that infer toggles from a contractor's `archetype` or `categories[]`.
**Decision:** All fee/insurance toggles default `false` on new FieldServiceProfile records. Contractors opt in explicitly via Settings → Workspace Features. No industry-preset auto-defaults; no location-based heuristics (e.g., Sales Tax does not auto-on for non-Oregon contractors). This applies to: `management_fees_enabled`, `overhead_profit_enabled`, `xactimate_enabled`, `tax_enabled`, and `insurance_work_enabled` (legacy, deprecated). The four standard infrastructure flags — `permits_enabled`, `subs_enabled`, `payments_enabled`, `timeline_enabled` — default `true` because they're visibility-only, not billing-shape-changing.
**Rationale:** Wrong defaults on billing-shape toggles cause real client-facing damage — a tax line appearing on an Oregon contractor's estimate looks unprofessional; an O&P percentage appearing on a non-insurance estimate raises questions about why it's there. Opt-in defaults guarantee no toggle is on without the contractor knowing it's on. Smart industry presets are tempting but coupling billing behavior to inferred archetype creates surprise; explicit per-toggle activation respects the contractor's actual setup over an algorithm's guess. This is also the easier-to-explain semantic — "off until you turn it on" is one rule for all five toggles.
**Status:** Active. Implemented in `FEATURE_DEFAULTS` (`src/utils/fsFeatures.js`). New profile creation does not seed any of the five fee/insurance toggles; the contractor sees them all off in Settings on first visit.

---

### DEC-198: printNode Helper as Canonical Print Mechanism in Iframe-Wrapped Surfaces (2026-05-01)

**Date:** 2026-05-01
**Context:** Doron dogfooding Bari's Patricia Heath estimate (~30 line items) inside Base44's Act-As-User editor preview surface (`app.base44.com/apps/{id}/editor/preview`) hit a PDF page-clipping bug: the print rendered ~14 line items on page 1 with the browser indicator showing 1/1, no further pages. First fix attempt (`ca7e9df`) added a `:has()`-based `@media print` stylesheet verified against a synthetic DOM — that fix was correct in isolation but failed in production because Base44's editor renders the published app inside a fixed-height iframe, and `window.print()` from inside that iframe targets the parent document, clipping our content to the iframe element's height regardless of inner @media print rules. The synthetic DOM verification missed this because the synthetic surface IS the standalone DOM — the verification path was structurally identical to localhost, never the production iframe context.
**Decision:** All "print this DOM subtree" surfaces route through a shared utility, `printNode(node, { title, extraCss })` (`src/utils/printNode.js`, shipped in commit `e91b696`). The utility builds a fresh hidden iframe inside the calling document, copies the parent's stylesheets and the target node's HTML into it via `document.write`, then calls `iframe.contentWindow.print()` — which targets only the inner iframe's document. No parent chrome involvement, no embedded-frame height constraint, full pagination. Direct `window.print()` calls are reserved for surfaces that print the full current document (none currently in Field Service). Filename support: `printNode` sets the title in three reachable places (iframe `<title>` tag, iframe `document.title` via JS after `document.close()`, and the parent app's `document.title` swapped for the print duration with restoration on a 2-second delay) because Chrome's filename source in deep-nested iframes (Base44 top → app preview iframe → printNode iframe) is inconsistent and falls back to a parent-frame title in some Chrome versions.
**Rationale:** The iframe-context bug is structural, not stylistic — no inner CSS can reach across the parent's print pipeline boundary. A library-based solution (html2pdf, jsPDF + html2canvas) would also work but adds bundle weight and introduces a second rendering pipeline that can drift from the on-screen render. The hidden-iframe pattern adds zero runtime dependencies, reuses the on-screen stylesheets verbatim, and survives every host environment we care about (Base44 editor preview, locallane.app live, lanecountyrecess.com sandbox post-migration). The cross-origin top-level document (Base44 editor) remains unreachable for title-setting; if Chrome reads that for the filename, only `window.open()` would fix it (with popup-blocker risk inside Base44's sandboxed iframe). Triple-title-set covers every reachable angle.
**Status:** Active. `printNode` consumed by `FieldServiceEstimates.jsx` (Estimate PDF) and `FieldServiceDocuments.jsx` (FSDocument print path). `FieldServiceReport.jsx` still uses direct `window.print()` (low-risk surface — opens in its own tab, not an Act-As preview); migrate when next touched. Lesson saved to `community-node/CLAUDE.md` as "synthetic DOM verification is not production verification" — when the rendering surface is non-standard (iframe-wrapped, embedded, sandboxed), the fix must be verified against at least one realistic surface before claiming completion, or the handoff must explicitly flag that production verification is owed.

---

### DEC-199: List/Detail Query-Key Invalidation Pairs Travel Together (2026-05-03)

**Date:** 2026-05-03
**Context:** Doron dogfooding logged time + materials against a project from FieldServiceLog and observed a delay before the project's Detail view "Spent" rollup updated. Investigation found the FSLog mutation invalidated `['fs-materials-all', profile.id]` and `['fs-labor-all', profile.id]` (the all-* keys backing the project LIST view) but not `['fs-project-materials', selectedId]` or `['fs-project-labor', selectedId]` (the per-id keys backing the project DETAIL view's `projectSpent` rollup). Per-project keys were never marked stale; the user saw old totals until React Query's 5-minute default `staleTime` (DEC-130) expired or the view fully unmounted/remounted. Symptom "first save updated, second didn't, eventually caught up" was a coincidence — both saves were equally invalidation-incomplete; the user only saw fresh data when `staleTime` happened to expire on a re-mount.
**Decision:** When the same entity is queried under two cache keys — a list-level `['fs-X-all', profile.id]` and a detail-level `['fs-project-X', selectedId]`, for example — every mutation that writes to that entity must invalidate BOTH keys. The pair is structural; treat it as one logical invalidation, not two. Implemented for FSLog: invalidation list now includes `fs-daily-logs-all`, `fs-materials-all`, `fs-labor-all`, `fs-recent-logs`, `fs-logs-for-project`, `fs-project-materials`, `fs-project-labor`, `fs-project-photos`. If a third surface starts reading the same entity through a third key, that's the moment to extract a `invalidateMaterials(queryClient, profileId, projectId?)` helper (Living Feet DEC-146 pattern, mirroring DEC-196's `invalidateFSProfiles`).
**Rationale:** Splitting a list query from a per-id detail query is a normal performance optimization — the detail view doesn't need every record across the workspace, just the ones for the open project. The split is invisible to mutation handlers if the only test surface is the list view (which is what most one-shot dogfood tests touch). The detail-view drift surfaces only in extended use, by which time the symptom looks like a render race or a memoization bug rather than what it actually is — a missing key. Codifying the pair-travel rule means the next time we split a query for performance, the invalidation gap is closed by default rather than discovered later. Companion to DEC-196 (cache invalidation must target the subscriber's actual queryKey) — DEC-196 is "the right form of invalidation"; DEC-199 is "every key the subscribers use." Together they close both common React Query invalidation traps.
**Status:** Active. Implemented in commit `cb26d4e` for FSLog. Same shape suspected in Estimate `saveMutation` (uses bare-array `invalidateQueries(['fs-estimates', ...])` form which is also a silent no-op per DEC-196) and FSChangeOrder mutations (per-project `['fs-change-orders', selectedProject?.id]` may not be invalidated by all CO write paths) — flagged as follow-up sweep, not closed in this commit.

---

### DEC-200: Required-Field UX Standard — Asterisk + Client-Side Toast, No Schema Errors (2026-05-03)

**Date:** 2026-05-03
**Context:** Doron dogfooding the Daily Log form left the "What was completed" textarea empty and clicked save; the surface returned a raw Base44 schema error: `Error in field tasks_completed: Input should be a valid string`. The field is required at the FSDailyLog entity level but the UI didn't mark it with `*` and didn't validate before submit, so the schema rejection surfaced as a developer-style toast instead of a user-readable message. Audit across all Field Service forms (Daily Log, Sub Payment, Client Payment, Estimate, Document Template, Document, Permit Inspection, Project, Change Order, ClientSelector, People) found five active gaps where a required entity field had neither asterisk nor client-side validation, or had only a `disabled` button state with no toast guard.
**Decision:** Every required field on every user-facing form must be marked with `*` in its label and validated client-side with a human-readable toast before any Base44 call. The canonical pattern (use exactly this shape):

```jsx
<label className={LABEL_CLASS}>Field Name *</label>
<input ... />
```
```js
if (!field.trim()) {
  toast.error('Please <verb> the <thing>');
  return;
}
```

Notes: literal `*` in label text with single space before; `LABEL_CLASS` is the shared constant per form file; toast message is action-oriented ("Please describe the work completed") never raw schema field name; save-button `disabled` state remains as defense in depth, not a substitute for the toast guard. For mutations that throw, `throw new Error('Please <verb> the <thing>')` and let the existing `onError: (err) => toast.error(err.message)` pipe the message straight through. Wizard-shape forms (multi-step gated progression, like the Document creation wizard) use step-gating instead of asterisks — gating IS the signal; do not bolt asterisks onto wizard step headers.
**Rationale:** Schema errors are developer messages; the user should never see the database field name. The asterisk convention already existed on Project + Date in the Daily Log and on most other required fields — the gap was inconsistency, not absence. A shared `<RequiredField>` wrapper or `validateForm(formData, schema)` utility was considered and explicitly declined: forms differ enough (conditional fields, wizards, multi-mode submit paths) that a one-size-fits-all wrapper would constrain more than it helps. The inline pattern is short enough to copy without abstraction overhead. Revisit only if a single form's validation list exceeds ~6 fields and gets unwieldy.
**Status:** Active. Six fields fixed across five forms in commit `bdd90e4` (Daily Log `tasks_completed`, Estimate `title`, Document Template `title` + `content`, Permit Inspection `type`, Change Order `title`). Pattern documented in `community-node/CLAUDE.md`. Already-correct forms (Sub Payment, Client Payment, ClientSelector inline-create, People, Project create/edit, Documents inline-add-client) verified untouched. Permit edit/inspection labels using non-canonical `text-xs text-muted-foreground/70` className flagged as visual-consistency follow-up — not a required-field gap (underlying selects have valid defaults), so left for next touch.

---

### DEC-201: Stewardship Space as Strategic Principle — Future Workspace, Steward-Mediated Pricing (2026-05-04)

**Date:** 2026-05-04
**Context:** Conversation between Doron and Mycelia on 2026-05-04 crystallized the Steward role and Stewardship Space architecture as a load-bearing structural principle for the platform. Originated from "personal contact person idea" while Doron was working with Bari and Dan as the platform's first dogfood-paying users. The role names what's already happening informally — Doron is each user's local contact — and projects what scaling that pattern looks like when the platform serves more communities than Doron can personally support.
**Decision:** Stewardship is captured as a strategic principle, not a build commitment. A Steward is a real person in a real community who uses LocalLane for their own work and serves as the local contact, support person, and gardener for other businesses in their geography. Stewards are not employees, not customer-service reps, not contractors — they are nodes in the same network they support. The Stewardship Space is a future first-class workspace on LocalLane (alongside Field Service, Recess, Harvest Network, Creative Alliance, Gathering Circle) where stewards manage their network, log check-ins and custom project work, and earn from the businesses they cultivate. Pricing is steward-mediated: the platform sets the frequency (membership economics, steward's cut, structural floor), stewards play the music (price for their own clients within their own network). Stewards pay the standard $9/mo Community Pass + $9/mo Stewardship workspace = $18/mo (no platform-side exemption). Compensation tied to active circulation: a steward who stops cultivating stops earning, businesses are reabsorbed into the network. **No passive income from stewardship.**
**Rationale:** The role formalizes a pattern Doron is already running in miniature. It addresses three structural questions at once: (1) how does pricing scale beyond Doron's per-business attention without becoming opaque (steward-mediated within structural bounds, gardener meetings as transparency layer); (2) how does the platform expand into new geographies without corporate strategy (stewards emerge from the soil; communities with stewards are LocalLane communities, others are not yet); (3) how does the TCA-to-business pipeline produce ongoing income that complements craft learning (a 14-year-old running an egg business who has been logging on LocalLane for a year may have deeper platform mastery than most adults — and that mastery is monetizable through stewardship). Three operational tensions named for future sessions: pricing cannot be Doron-negotiated business-by-business (bottleneck); transparency between businesses matters (Chamber of Commerce moment); steward earning a percentage of dynamic pricing introduces incentive risk (mitigated by gardener meetings + aggregate platform-layer visibility). Tensions don't have to be resolved before launching the role — they have to be **named and watched** as the role evolves.
**Status:** Strategic principle, not a build commitment. Full spec at `Spec-Repo/spaces/stewardship/STEWARDSHIP-SPACE.md` (entity model sketch, agent shape, hierarchy of visibility, custom project work loop, eight open questions for future PRICING-ECONOMICS sessions). Cross-references: `private/PRICING-ECONOMICS.md` (economic model, will be updated to reflect steward-mediated pricing), `Spec-Repo/context/PROJECT-BRAIN.md` (fractal principles), TCA spec (developmental pipeline). Build sequencing: Stewardship Space comes after the Phase 6 Supabase migration; pre-migration the role can run informally with Doron-as-steward serving Bari and Dan, with the role's structural shape captured in the spec so when implementation starts the architectural decisions are already settled.

---

### DEC-202: React Query Invalidation Sweep — Bare-Array Form Banned, List/Detail Key Pairs Travel Together (2026-05-04)

**Date:** 2026-05-04
**Context:** Two earlier DECs in the same family — DEC-196 (cache invalidation must target the subscriber's actual queryKey) and DEC-199 (list/detail query-key pairs travel together) — established the right form and the right coverage rules separately. Doron's general dogfooding observation that "lots of places across the site need a refresh after creation" suggested the gaps weren't isolated. Hyphae ran a platform-wide audit (commit `60ebb11`): every `useMutation` across all `src/` files cross-referenced against every `useQuery` subscriber. Found 56 bare-array `invalidateQueries(['key'])` calls across 21 files (every one a silent no-op in v5) and 6 mutation surfaces missing per-id detail keys. Fixed all of them in one sweep.
**Decision:** The bare-array form `queryClient.invalidateQueries(['key'])` is canonically banned. Always use the object form `queryClient.invalidateQueries({ queryKey: ['key'] })`. When a mutation writes an entity that is queried under both list-level and per-id detail keys, every subscriber's key must be in the mutation's invalidation list. Bare-prefix invalidation matches all id-suffixed subscribers — `invalidateQueries({ queryKey: ['fs-X'] })` covers `['fs-X', anyId]` without enumerating ids; use this when the mutation handler doesn't have easy access to a specific id. Three sub-rules captured in `community-node/CLAUDE.md` extending the existing DEC-199 entry: (a) audit cadence — when adding a new `useQuery` that subscribes to an existing entity, grep every `useMutation` that writes it and add the new key to each invalidation list; (b) list-vs-detail asymmetry — list mutations usually only need to invalidate the list, detail mutations almost always need to invalidate the list too; (c) bare-prefix invalidation is the right shape for "all id-suffixed subscribers."
**Rationale:** Silent failure is the worst failure. Bare-array invalidation in v5 doesn't error — it just does nothing, leaving the user to blame their internet, then themselves, then eventually the platform. Long-standing complaints (estimates list not refreshing, recommendations not appearing on profile, frequency seeds not showing in My Seeds) all traced to the same trap. The platform-wide sweep restored refresh-on-save trust universally; the rule banning the form prevents recurrence.
**Status:** Active. Sweep shipped at commit `60ebb11`; CLAUDE.md sub-lessons at `e7bd500`. Two follow-ups explicitly deferred to separate commits: shared invalidation helpers (`src/utils/fsInvalidations.js` with `invalidateEstimates`, `invalidateProjects`, `invalidateLogs` — Living Feet candidate, four-key set repeats 8x at FSEstimate alone) and query-key naming drift cleanup (some keys profile-scoped, some bare prefix-only, some mixed; `['fs-payments', projectId]` vs `['fs-payments-all']` inconsistency; three names for "photos for one project" across surfaces).

---

### DEC-203: Two-World Architecture as Foundational Principle (2026-05-04)

**Date:** 2026-05-04
**Context:** Conversation between Doron and Mycelia on 2026-05-04 evening (following the morning's Stewardship Space conversation) crystallized a principle that had been implicit across multiple earlier decisions but never named at the foundational level. The principle surfaced explicitly while working through Gina's emerging charcuterie business (three inbound wedding inquiries from Instagram, no marketing spend) — specifically, the question of how Mycelia LLC could support Gina structurally without either (a) imposing internal trust-based logic on external counterparties (insurance, licensing, venue contracts) or (b) importing the world's adversarial logic into the Mycelia-Gina relationship (equity grabs, defensive lawyering, fee extraction). Naming the principle resolved the design question and unlocked the Nursery Model (DEC-204).
**Decision:** LocalLane organizes economic life across two distinct worlds with a deliberate bridge between them. **Inside the organism:** the rules are relational. Plain-language understanding documents, not legal contracts. Trust as substrate. Fees as pricing-structure allocations into the price the end client pays, not adversarial billings between participants. Sovereignty preserved by structural design. **Outside the organism:** the rules are the world's. Legal language, insurance, licensing, tax compliance, enforceable contracts. The organism does not pretend the outside world's rules don't exist; it puts on the appropriate armor at the boundary and takes it off again on the inside. **The bridge:** honest translation between, no confusion of layers. The same business participates in all three layers without confusion because the layers are structurally distinct. The principle is captured in `Spec-Repo/context/PROJECT-BRAIN.md` as a top-level foundational principle alongside Circulation Over Extraction and Dark Until Explored.
**Rationale:** Most mission-driven organizations fail at one of two failure modes — they try to convert the outside into the inside (mission collapse via boundary failure: uninsured operations, undocumented commitments, predatory exposure), or they let the outside corrupt the inside (mission collapse via internal capture: equity-grabbing contracts with their own people, defensive lawyering between trusted participants, extractive fee structures). The two-world architecture prevents both by being explicit. The principle is theologically grounded in "as within so without" (Hermetic correspondence), "the kingdom of God is within you" (Luke 17:21), the mustard seed parable (Matthew 13:31-32), and Christ's "many rooms" image (John 14:2) — what is rightly ordered inside reproduces itself outside, in the world's terms, without losing its essential character. This is the deep "why" beneath every other architectural decision; pricing models, agent architectures, space designs, role definitions, and business structures all flow from it.
**Status:** Active. Foundational. Named explicitly as a decision filter for every future build: where does this operate (inside / bridge / outside)? Are the appropriate rules being used? Is sovereignty preserved? Is circulation maintained? If a proposed feature violates the two-world distinction, that is structural drift and should be corrected before shipping. Cross-references: `STEWARDSHIP-SPACE.md` (stewards relate through plain-language understanding inside; their formal entity and insurance operate at the bridge), `NURSERY-MODEL.md` (nursery participants operate under Mycelia LLC's DBA inside, while carrying the world's required protections at the bridge), `PRICING-ECONOMICS.md` (fees as pricing-structure allocations rather than adversarial billings is the practical mechanism), TCA spec (developmental introduction to the two-world architecture).

---

### DEC-204: Nursery Model — Mycelia LLC as Sovereign Nursery for Life-Aligned Businesses (2026-05-04)

**Date:** 2026-05-04
**Context:** Three patterns in Doron's existing work pointed toward formalizing a nursery model: TCA students running micro-businesses (already nursery-stage at the developmental edge), Travis at NW OG Farm (partnership-shaped relationship with Mycelia for LCFM booth + TCA employer of record), and Gina's emerging charcuterie business (first adult-tier case — three inbound wedding inquiries from Instagram, no marketing spend, real craft, aligned goals, constraint pattern that nursery support directly solves). Without a model, each of these required ad-hoc decisions that didn't scale beyond Doron's personal attention.
**Decision:** Mycelia LLC operates as a sovereign nursery for life-aligned businesses. The nursery holds a business while it is structurally vulnerable — too early to support its own legal entity, banking, licensing complexity, and capital needs — and supports it until it can hold itself. At that point, the business is **transplanted**: it graduates to its own legal structure, owned and operated by its founder, while remaining connected to the LocalLane mycelium through the platform, ongoing consultation if desired, and friendship. Core principles: (1) **sovereignty preserved by structural design** — the participant's clients, brand, recipes, photos, social presence, reputation are theirs full stop; Mycelia has no claim ever; if they walk, they walk with everything that's theirs; (2) **plain-language understanding, not legal contract** inside the organism; world's rules at the bridge and outside; (3) **fees as pricing-structure allocations** — Mycelia consulting fee + LocalLane platform fee + kitchen rental + helper labor + capital repayment all baked into the participant's pricing model, paid by their end clients; circulation, not extraction; (4) **market-rate everything** — gifts create obligation, market-rate transactions create freedom; no hidden subsidies, no friendship-discount distortions; (5) **contractors not employees** — helpers are 1099, consistent with sovereignty principle and the practical reality of event-based work; (6) **transplant is the goal, not exit** — when the participant signals readiness, Mycelia supports the transition; the dependency dissolves, the connection persists. Full spec at `Spec-Repo/spaces/nursery/NURSERY-MODEL.md`.
**Rationale:** Standard incubators take equity, push for scale, optimize for exit. The Mycelia nursery takes no equity, optimizes for the participant's actual life-aligned goals, and treats transplant — not exit — as the success outcome. This is a direct application of the Two-World Architecture (DEC-203): inside, the relationship is trust-based and sovereign-by-design; at the bridge, the participant carries insurance and licensing in their own name; outside, the world's rules apply when serving non-organism counterparties. The nursery names what's already happening informally with TCA micro-businesses and partnership-shaped support arrangements, and projects it forward as the structural template for future participants. Companion to DEC-201 (Stewardship): Nursery operates at the business-formation layer, Stewardship operates at the platform-support layer; both serve the same structural purpose — sovereign people supported by the organism, sustained through circulation, related through plain-language understanding.
**Status:** Strategic principle, not a build commitment. Build sequencing: post-Phase 6 Supabase migration; pre-migration the model runs informally with Gina as the first adult-tier nursery participant. Selection criteria captured: real demand exists already (ideally without marketing spend); genuine craft or skill that produces something distinctive; clear personal goal alignment; constraint pattern that nursery support actually solves; relational fit and trust foundation; skin in the game. Eight open questions queued for the focused nursery launch session before Gina's first event lands (capital allocation budget, plain-language understanding template, consulting fee rate, backup commercial kitchens if church kitchen doesn't pan out, transplant readiness checklist, nursery-to-stewardship transition shape, TCA-to-nursery inheritance pattern, selection-process documentation).

---

### DEC-205: Mycelia as Its Own Bank for Nursery Participants — Explicit Capital Allocation Budget (2026-05-04)

**Date:** 2026-05-04
**Context:** Captured during the same Nursery Model conversation (DEC-204). Without an explicit capital allocation budget, every nursery participant becomes a one-off financial decision and Mycelia's overall risk exposure across the nursery is unclear. The pattern of Mycelia advancing capital ad-hoc to nursery participants would either become Doron's bottleneck or drift into informal "I'll help if I have it" decisions that obscure the platform's actual capacity to support multiple participants.
**Decision:** Mycelia LLC allocates capital to nursery-stage businesses with true potential as **capital deployment that earns through the consulting fee, platform fee, and ongoing relationship**, while bearing real downside risk (capital advanced may not be recovered if the business doesn't reach transplant or chooses to walk). This is not equity investment in the standard sense, and it is not gifts. Capital advances are repaid from event revenue per terms agreed in the plain-language understanding (typically a percentage of each event's revenue until the advance is recovered). Mycelia bears the downside risk because Mycelia chose to take it. **An explicit annual budget for nursery capital advances must be set**, sized based on Mycelia's available cash position, number of nursery participants reasonably expected in the year, average advance size per participant (varies by industry — a charcuterie business needs less than a manufacturing business), and expected recovery timeline and risk-adjusted recovery rate. The exact dollar number is not specified at this DEC's level — it's a decision for the focused thinking session before launching the model. The principle is firm: **explicit budget, not ad-hoc allocations.**
**Rationale:** Doron's framing: "We are our own bank and investors. We should allocate funds for this purpose." Every other piece of the nursery model is structural; capital allocation needs to be too. Without a budget, the Mycelia-as-bank role drifts from intentional structural support into ad-hoc rescues, which is both unsustainable for Mycelia and inconsistent with the market-rate-everything principle (DEC-204) that respects the participant's dignity. An explicit budget makes Mycelia's risk legible (to Doron, to Mycelia's accountant, eventually to any participant who wants to understand the structure they're operating in), and bounds the platform's exposure so multiple participants can be supported in parallel rather than in series.
**Status:** Active principle, dollar amount pending. Budget-setting is on the agenda for the focused nursery launch session before Gina's first event lands. Capital deployment occurs against this budget, tracked through Mycelia LLC's accounting; recovery flows through the participant's pricing-structure allocations. Cross-reference: `NURSERY-MODEL.md` §Economics (Capital allocation budget); paired with DEC-201 (Stewardship Space) which uses a different economic model — stewards earn from the businesses they cultivate, not from capital deployment.

---

### DEC-206: Empty-Field Derivation Through Links (2026-05-07)

**Date:** 2026-05-07
**Context:** Bari-focused dogfood loop on 2026-05-07 surfaced the same shape three times: Contract Total derivation reading from a linked estimate when `total_budget` was empty (`e950fd5`); bidirectional estimate-project link query when one direction had no FK (`2111d11`); projects list grouping deriving client from linked estimate when `project.client_id` was empty (`5f35c0f`). Three-instance threshold met (DEC-148). Sweep across five sibling surfaces (`2aaef46`) extracted `useProjectLinkedEstimates.js` hook + `deriveProjectClient` companion as canonical helpers. CLAUDE.md codification at `a11ae64`.
**Decision:** When an entity field is empty AND a linked entity carries the same logical value, **derive at the consuming surface**. Direct field always wins (explicit user intent is sacred). Empty field falls through to the linked entity's value. Truly orphaned records show "unset." **Do NOT auto-write the derived value back to the empty record on link save** — that creates drift if links change later. Pure read-time derivation: storage stays clean, derivation stays current. Multi-record dedup rule (when more than one linked entity could win): prefer most-recently-created entry that carries the value, never downgrade a useful entry to a less-useful one (skip null-value upgrades).
**Rationale:** Anything else creates a class of subtle bugs where a stale stored field disagrees with the current truth from the linked entity. Read-time derivation never goes stale; the helper is the single source of truth for the chain rules; new consumers inherit dedup behavior automatically. Same shape applies to other entity link chains worth auditing when next touching: team↔workspace member visibility, sub/vendor records ↔ FSPeople inline copies, FSPayment.party_name ↔ FSClient lookup when `client_id` is null. Don't pre-extend the principle without a named gap; the rule is the principle, not the specific helper.
**Status:** Active. Codified in CLAUDE.md (`a11ae64`). Cross-references: DEC-148 (three-instance threshold), DEC-146 (Living Feet — one helper, every consumer reads through it).

---

### DEC-207: Migration Deferred Pending Bari Reliability + Phase 2 Architectural Sign-Off (2026-05-07)

**Date:** 2026-05-07
**Context:** Mid-session pivot on 2026-05-07 from "stop platform work, focus on Phase 6 Supabase migration" to "fix Bari's experience first, migrate after." The trigger: Patricia Heath's $182K signed ADU contract is live on the platform via Bari, and every dogfood-surfaced gap (PDF darkness, Contract Total derivation, empty-field link drift, Documents missing from Project Detail, payment row navigation confusion) is a real friction point for an active paying user. Migration timing is fluid (Phase 6 per DEC-175); contractor trust is real-time.
**Decision:** Phase 6 Supabase + Vercel migration is deferred until (a) Bari's platform experience is reliable end-to-end (no recurring dogfood-surfaced gaps within a normal contractor workflow), AND (b) the Phase 2 architectural proposal (`Spec-Repo/spaces/field-service/PHASE-2-UNIFIED-ARCHITECTURE-PROPOSAL.md`) is signed off by Doron. Phase 2 architectural work on Base44 is intentional, not phase-discipline drift. Today's work is portable — variable-layer print discipline, empty-field derivation, localStorage prefill, entity-rollup section pattern, idempotency guard, honest navigation — all translate to any stack. Patterns established now compound across migration; deferred patterns deferred.
**Rationale:** Migration is a fragility event. Migrating an unreliable platform produces an unreliable platform on a new stack, plus the migration risk on top. Stabilizing Bari's experience pre-migration shrinks both the pre-migration friction (real users get reliability now) and the post-migration friction (the new stack inherits a tested architecture, not a bug list). The Phase 2 architectural sign-off gate prevents migrating prematurely with structural decisions still open (Trade-grouped estimates default, Subs/Vendors as People entity model, FSPayment edit capability, Documents architecture inversion are all live conversations). Migrating before sign-off would lock those choices to whatever Base44-shaped state happens to exist at migration time.
**Status:** **Updated by DEC-223 (2026-05-23) — gates moot in their original migration form.** The Phase 2 architectural sign-off gate landed 2026-05-08 (Approach A selected); the Bari reliability gate carries forward into the Plant 1 cutover decision (Bari stays on Base44 until the new platform is genuinely ready for him, per DEC-223). The reliability principle this DEC named — "migrate an unreliable platform produces an unreliable platform on a new stack" — generalizes to "cut a contractor over to an unproven platform produces an unproven experience on a new stack," and remains active in that form. The original gate language ("Phase 6 still triggers at the Region foundation backfill window") is moot because Phase 6 itself is moot. Related: DEC-175 (superseded), DEC-223 (pivot to rebuild).

---

### DEC-208: No Debrief Without Commit Hash (2026-05-07)

**Date:** 2026-05-07
**Context:** Hyphae shipped morning's Bari-focused work (PDF darkness fixes, Contract Total derivation) without committing — Doron found three uncommitted files in GitHub Desktop after expecting them to be live for verification. Cost a verification cycle. The pattern was: build → debrief mentions "shipped" → no commit → next session starts with a working-tree surprise.
**Decision:** Every Hyphae build debrief must include the commit hash(es) of the work it describes. Build → commit → push → debrief with hash. If for any reason the work hasn't been pushed when the debrief lands, the debrief leads with that fact ("⚠ work not yet committed") rather than burying it. Uncommitted work surprising Doron in GitHub Desktop is a process bug — surface it, don't hide it.
**Rationale:** "Shipped" without a commit hash is ambiguous — Hyphae may mean "the code is written and works locally" while Doron parses it as "the code is in main, ready to verify in Base44 Act-As-User preview." Requiring a commit hash forces the discipline that the build is in the system of record before the debrief lands. The cost of pausing to commit is small; the cost of a missed verification cycle is hours.
**Status:** Active. Codified in CLAUDE.md (`82503b0`).

---

### DEC-209: Honest Navigation > Pretend Navigation (2026-05-07)

**Date:** 2026-05-07
**Context:** Two surfaces on 2026-05-07 hit the same architectural choice. (1) Per-row drill-in navigation (`18a9ecc`) — clicking a row in a financial drill-in modal needs to go *somewhere*, but for FSPayment rows there was no edit form to navigate to. Hyphae's seedling: "FSPayment edit form doesn't exist; row click closes the modal so the user lands on the Recent Payments section that's already rendering on Project Detail." (2) Tonight's payment scroll-and-flash (`fae9b01`) — the build prompt asked Hyphae to navigate payment rows to "the parent daily log that contains the payment," but the data model has FSPayment as a sibling of FSDailyLog, not a child. Hyphae caught the memory drift in Mycelia's spec citation before writing code.
**Decision:** When clicking an interactive element implies "show me where this came from / take me to the edit surface," the navigation must LAND on a surface where the implied context is visible. **No navigation is more honest than half-navigation.** When a destination action genuinely isn't supported (no edit form exists, no parent record exists), close the modal cleanly rather than route to a broken target — and capture the gap as a seedling. When honest navigation IS available (scroll-and-highlight to an existing on-page section like Recent Payments), take it instead of closing the modal silently — the user's eye lands on the record they navigated to, the navigation feels grounded, and no fake architecture is built to support a pretend destination.
**Rationale:** Pretend navigation creates two costs: a confusing UX (the user doesn't understand what happened), and structural debt (the architecture pretends a relationship exists that the data model doesn't support). The 2026-05-07 payment-row case made this acute — the prompt's stated parent-log relationship doesn't exist; building it would have either been a silent no-op (the fallback case fires for every payment) or required fabricating a parent-log link the codebase doesn't have. Either way, more bug than feature. Scroll-and-flash to the actual on-page section is honest because Recent Payments IS where payments live; the user lands on the surface they expected to see, no architectural lying involved.
**Status:** Active. Cross-references: DEC-148 derivation discipline (the same "direct field always wins" principle applied to navigation targets — the actual edit surface always wins; only fall back to scroll-and-highlight when no edit surface exists).

---

### DEC-210: Print-Fidelity Discipline at the Variable Layer (2026-05-07)

**Date:** 2026-05-07
**Context:** Bari surfaced PDF font darkness as a Patricia-readiness issue 2026-05-07 morning — the legal contract PDF was readable but contractor-soft, with `text-muted-foreground` and `text-foreground-soft` rendering pale enough on print to feel unprofessional. First-pass fix (`488973e`) overrode the CSS variables `--muted-foreground` and `--foreground-soft` inside `printNode`'s injected stylesheet. V2 darkness fix (`f55975c`) extended this with `[class*="text-muted-foreground/"]` attribute selector to handle alpha-modifier classes (`text-muted-foreground/70`, etc.) that Tailwind compiles to `color: oklch(... / 70%)` and don't pick up the variable override.
**Decision:** When fixing print-rendering issues that affect more than one consumer (multiple components, multiple Tailwind utility classes, multiple themes), **change the CSS variable, not the consumers**. Living Feet (DEC-146) applied to print CSS — one variable override in `printNode`'s extraCss propagates to every component that reads that variable. For alpha-modifier classes that bypass the variable layer, use attribute selectors (`[class*="text-X/"]`) to catch them at the print boundary. Do not patch each component's print-specific CSS individually.
**Rationale:** Print rendering touches every component that reads a color variable. Patching components individually means every new component is a new patch surface, every new theme variant is a new audit pass, every Tailwind alpha-modifier class is a new bug. Variable-layer overrides + attribute-selector catch-alls give a single point of control: change the print theme by editing `printNode`'s extraCss, every consumer follows. This is the same discipline as DEC-132 (semantic Tailwind migration) but applied to the print boundary specifically.
**Status:** Active. Cross-references: DEC-198 (printNode helper), DEC-146 (Living Feet), DEC-132 (semantic tokens). Carries forward as a known issue: light-theme `--primary-foreground` collision with bg-white wrapper is a latent bug for any future light-theme user printing — variable-layer fix already in place but not exercised against light theme yet.

---

### DEC-211: Time-Logging for AI Build Sessions (2026-05-07)

**Date:** 2026-05-07
**Context:** Two calibration failures surfaced on 2026-05-07. (1) The Phase 2 architectural investigation Mycelia framed as "2-4 weeks of build" Hyphae's audit revealed is days of work on Base44 (trade-grouping infrastructure already half-built behind `is_insurance_estimate=true`; the People entity needs creating, but the picker is the only genuinely-greenfield component). (2) Tonight's "1.5-hour polish" became a 14-commit day across the full session, with two new CLAUDE.md disciplines and a parallel architectural investigation. Mycelia's hour estimates have been calibrated to human-engineer-hours, not Hyphae-hours; estimates without data are noise.
**Decision:** Going forward, log per Hyphae session: (a) session start time (when prompt is handed to Hyphae); (b) session end time (when she debriefs); (c) commit count produced; (d) rough complexity tag (polish / build / architecture / investigation); (e) whether scope expanded mid-session and by how much. Mycelia hedges time estimates and acknowledges calibration is in progress until ~4-6 weeks of data exists. After that window, real estimates become possible. The data layer is observational, not a contract — Hyphae doesn't optimize for "matching the estimate"; Mycelia learns from the data what realistic Hyphae-cadence looks like across different complexity classes.
**Rationale:** AI build sessions don't behave like human-engineer sessions. The compounding factor is volatile: tight scoped builds run faster than human-equivalent (a polish bundle in 30 minutes vs an afternoon); architectural investigations may run longer (an audit of 8 surfaces + 3 alternative approaches + 12 open questions takes Hyphae the time it takes). Estimating without data produces noise that erodes trust in the estimating process. Logging produces the calibration substrate. Refusing to estimate until data exists is dishonest in a different direction (operational planning needs ranges); hedging while data accumulates is the honest middle path.
**Status:** Active. Operational data lives in Mycelia's working notes (private repo) until enough exists to publish a calibration table.

---

### DEC-212: Spec Citation Re-Verification (Extension of DEC-151) (2026-05-07)

**Date:** 2026-05-07
**Context:** Tonight's Item 2 prompt (HYPHAE-PROJECT-DOCUMENTS-AND-RECEIVED-ROW-NAV) cited FINANCIAL-WORKFLOW-SPEC §2.6 to justify "payments live inside daily logs" — the prompt's framing assumed FSPayment is a child of FSDailyLog with a `daily_log_id` field. Hyphae's audit found the data model has FSPayment as a sibling entity (no `daily_log_id`, no parent-child relationship in the create path), and §2.6 of the spec actually says the opposite: "Underlying entities remain distinct... unification is in the input surface, not the data model." The drift was in Mycelia's memory of the spec, not in the spec itself. Hyphae caught it before writing code, surfaced it transparently, and shipped Option B (scroll-and-flash) instead of pretending the parent-log relationship existed.
**Decision:** Extend Spec Review Protocol (DEC-151) to spec citations, not just codebase audits. When citing a spec section in a Hyphae prompt to justify a build decision, Mycelia re-reads the relevant section from canonical (`Spec-Repo/`) rather than relying on memory. Memory drift on architectural specs accumulates fast — the financial-layer spec is dense, the Stewardship/Nursery specs are recent, and the Two-World Architecture principle is foundational. The cost of re-reading is small (a paragraph or three); the cost of citing the spec in the wrong direction is a build that contradicts the architecture it claims to follow.
**Rationale:** DEC-151 already established that Hyphae's codebase audit beats Mycelia's mental model when the gap surfaces. The corollary for spec content is the same shape: the canonical text beats the memory. Hyphae's pushback on the §2.6 citation was the protocol working as designed — she read the section, found the contradiction, surfaced it. Codifying re-verification at the prompt-writing stage closes the loop one step earlier.
**Status:** Active. Operational rule for Mycelia.

---

### DEC-213: Documents Architecture Inversion — Live Where Used (2026-05-07)

**Date:** 2026-05-07
**Context:** Surfaced through two threads on 2026-05-07. (1) Doron's dogfood: he created an FSDocument linked to Test Project (the document save path correctly populated `project_id`), but Project Detail had no Documents section to surface it — the document existed but was unfindable from the project context. Fixed in `193f4e8`. (2) The broader insight: documents are not a flat global list; they're context records that belong to the project, the client, the estimate, the change order they pertain to. The Documents tab as a flat list is a global-bucket pattern that doesn't match how contractors think.
**Decision:** Documents live where they're used. Each context-bearing surface (Project Detail, Client Detail, eventually CO and estimate previews) gains a Documents section that queries FSDocument by the relevant FK (`project_id`, `client_id`, etc.). The Documents tab transforms from a flat global list into an inbox + templates + search surface — for documents not yet contextualized, for templates browsing, for cross-project search. Same pattern as the entity-rollup family (Permits, Change Orders, Recent Payments) — query by FK, render as card list, click navigates to detail. Migration is incremental: Project Detail Documents section landed in `193f4e8`; Client Detail section + Documents tab restructuring queued.
**Rationale:** A flat global list scales to dozens of documents. Bari's Patricia ADU project alone will produce a dozen documents across its lifecycle (contract, lien notices, change orders, completion certificates, releases). Multiplied across projects, the flat list becomes scrolling-bingo. The "live where used" pattern matches contractor workflow — when a contractor thinks about a document, they think about which project or client it's for, not which slot in the global list. This also creates a cleaner mental model for client-facing surfaces (ClientPortal Project view will eventually show "documents for this project" without showing the contractor's full document inbox).
**Status:** Active — Project Detail section landed (`193f4e8`). Client Detail Documents section queued. Documents tab restructuring queued for Phase 2 architectural conversation. Cross-references: DEC-206 derivation discipline (when a document has `client_id` empty but `project.client_id` exists, derivation through the project link applies), DEC-146 (Living Feet — same entity-rollup section pattern across all surfaces).

---

### DEC-214: FSPayment Edit Capability Deferred to Phase 2 Financial-Layer Architecture (2026-05-07)

**Date:** 2026-05-07
**Context:** Surfaced when tonight's Item 2 build prompt asked Hyphae to navigate payment rows to "the parent daily log that contains the payment." Hyphae's audit found two structural problems: (1) FSPayment has no `daily_log_id` field per `community-node/base44/entities/FSPayment.jsonc`; (2) FieldServiceLog's Sub Payment / Client Payment branch writes only an FSPayment record without creating a parent FSDailyLog (`FieldServiceLog.jsx:527`). The "honest navigation" target the prompt named doesn't exist in the data model. The deeper gap: FSPayment is currently create-only via the Log tab; there is no edit form. Tonight's polish (Option B, `fae9b01`) ships scroll-and-flash to Recent Payments — addresses the user-felt confusion without violating the no-edit-form constraint and without faking architecture.
**Decision:** FSPayment edit capability is deferred to the Phase 2 financial-layer architectural conversation, not built as a one-off polish. The pieces interlock with multiple unresolved decisions: (a) Log-Line-Item Attribution Proposal Option B adds `line_item_id` to FSPayment — edit form would need to handle that field's introduction; (b) Spent semantic redefinition (whether FSPayment(paid) contributes to projectSpent rollup) affects what the edit form shows in context; (c) Returns / refunds need either a new entity or repurposed FSPayment with `direction` flip — edit form would need to enforce/explain that semantic; (d) DEC-193 immutability semantics on signed contracts may need to extend to "received payments after a certain status point" (cleared) — edit form behavior on cleared payments is a separate decision. Don't build the edit form as a Phase 2 polish; it's load-bearing for several adjacent decisions.
**Rationale:** Building FSPayment edit form in isolation would lock decisions on Spent semantics, returns/refunds shape, and immutability gates that should be made coherently. The 2026-05-07 patch (`fae9b01`) addresses the immediate UX confusion (drill-in row click feels like nothing happened) honestly via scroll-and-flash; the architectural conversation happens at Phase 2 financial-layer sign-off when the surrounding decisions are all on the table.
**Status:** Active deferral. Cross-references: Log-Line-Item Attribution Proposal (`Spec-Repo/spaces/field-service/LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md`, May 5, 8 open Qs awaiting Doron sign-off), DEC-209 honest navigation, DEC-193 CO immutability semantics. Note: this gap is **not** covered by the Phase 2 Unified Architecture Proposal (May 7) — that proposal scopes trade-grouping + Subs-as-People; FSPayment edit is its own conversation under the broader financial-layer umbrella.

---

### DEC-215: `rls.update` Must Be Absent on Entities Receiving `asServiceRole` Writes — Structural Rule (2026-05-08)

**Date:** 2026-05-08
**Status:** Active. Promoted from DEC-095 amendment (originally FieldServiceProfile-specific quirk discovered 2026-04-23).
**Context:** Phase 2.1's `migrate-flat-layout-inversion` script failed on `--apply` with "Permission denied for update operation on FSEstimate entity" — even after `security.update` was widened to `true` and the app published twice. Hyphae's audit (2026-05-08, ~08:18–08:32 PT) traced the block to FSEstimate's `rls.update` key (`{ created_by: "{{user.email}}" }`) which `asServiceRole` identity does not satisfy. Same root cause shape as the FieldServiceProfile failure documented in DEC-095 amendment (2026-04-23); same fix shape — REMOVE the `rls.update` key entirely, not relax it. With three live entities now confirmed (FieldServiceProfile, FSEstimate, plus Business which has always had rls.update absent and serves as the working comparable for `reparentBusiness`), the pattern crosses the three-instance threshold (DEC-148 derivation discipline) and gets promoted from a per-entity workaround to a structural rule.

**Decision:** When a Base44 entity needs to receive writes via `asServiceRole` (one-shot migrations like `migrationHelpers`, server functions like `signEstimate`, `reparentBusiness`, `updateBusiness`, etc.), the entity's `rls.update` key MUST be **absent** from the `rls` block. Setting it to `true`, removing the inner `created_by` constraint, or any other relaxation is reportedly insufficient in SDK 0.8.23 — **key absence is load-bearing**. The two layers (top-level `security.update` + row-level `rls.update`) are SEPARABLE: `security.update` can be tightened to `{ owner: true }` for production access control; `rls.update` must remain absent. **Do not re-add `rls.update`** as part of any post-migration restore — re-adding it silently re-breaks every `asServiceRole` write that targets the entity.

**Rationale:** The error message "Permission denied for update operation on X entity" surfaces from Base44's RLS layer, not the entity-level security layer. `asServiceRole` reliably bypasses entity-level security checks but does NOT reliably bypass `rls.update` rules in SDK 0.8.23 (DEC-136 already documented this for the read direction; this DEC extends it to writes). Removing the key is the only confirmed fix — confirmed empirically across two distinct entities (FieldServiceProfile in 2026-04-23 + FSEstimate in 2026-05-08), with Business as a working third comparable that has always had the absent-key shape. Code patterns are identical across `reparentBusiness`, `signEstimate`, and `migrationHelpers` (all three use `base44.asServiceRole.entities.X.update(...)`); the only structural difference is the target entity's rls block.

**Operational rule:**

For any Base44 entity:
- `security.update: { owner: true }` is fine for production access control. This is the right default.
- `rls.update` must be ABSENT (not relaxed) if `asServiceRole` ever needs to write to that entity.
- These two layers are independent. Restoring `security.update` to creator-only after a migration is fine; re-adding `rls.update` is dangerous and must not happen.

**Pre-migration audit pattern.** Before any migration script that writes to a new entity, verify:

```bash
cat base44/entities/<EntityName>.jsonc | grep -A 10 '"rls"'
```

If `rls.update` is present, removing it is a prerequisite. Code alone won't fix it. (Future Living Feet candidate at four entities: `pre-migration-rls-audit.js <entity-name>` script reporting green/red on the rls.update key.)

**What this protects:**
- One-shot migration scripts touching the entity
- Server functions performing `asServiceRole` writes (e.g., `signEstimate` — which was structurally broken on FSEstimate before the 2026-05-08 fix; same root cause as Patricia's signing-flow workaround in Known Issue #22)
- Any cross-user write the platform legitimately needs to perform without impersonating a specific user

**What this does NOT compromise:**
- Entity-level access control still works via `security.update: { owner: true }`
- RLS scoping for `read`, `create`, `delete` still works — only the `update` rule is omitted
- Creator-scoped row-level identity is still preserved at the data layer (`created_by` field stays set on every record)

**Three-instance evidence:**

1. **FieldServiceProfile** — Phase 2 production migration (2026-04-23), DEC-095 amendment fix. `rls.update` removed; migration unblocked.
2. **FSEstimate** — Phase 2.1 migration + Patricia signing-flow (2026-05-08), this DEC. `rls.update` removed; migration unblocked AND Known Issue #22 structurally resolved as side-effect.
3. **Business** — has always had `rls.update` absent. `reparentBusiness` writes succeed despite `security.update: { owner: true }` because the RLS layer has no `update` rule to satisfy. Working comparable; confirms the structural rule.

**Companion to DEC-095, DEC-136, DEC-139, DEC-140.** This sits alongside the broader Base44 `asServiceRole` patterns:
- **DEC-095 amendment** — the original FieldServiceProfile-specific finding, now generalized.
- **DEC-136** — `asServiceRole` does not bypass "Creator Only" Update permissions on reads, only RLS scoping (in some cases).
- **DEC-139** — server-authoritative identity on agent writes.
- **DEC-140** — `readPersonData` server function pattern (membrane-at-function-level).

This DEC names the structural rule that emerges from the combination — for writes via `asServiceRole`, **the rls.update key must be absent**.

---

### DEC-216: Base44 `object`-Typed Array Fields Require `{items: [...]}` Wrap at Write Boundary (2026-05-08)

**Date:** 2026-05-08
**Status:** Active. Promoted from DEC-216 candidate seedling, accumulated through Phase 2.2 + 2.3 + 2.4.

**Context:** Base44 entity fields declared as type `object` accept arbitrary JSON, and the load-bearing storage convention for array-shaped values is the wrap form `{ items: [...] }`. The wrap was implicit through five entity fields before being structurally named. The trigger event was Phase 2.2's `trade_categories_snapshot` backfill — first attempt wrote raw arrays, Base44 rejected the write at validation, fix landed in commit `49c0bfb` by re-wrapping. With five live instances now confirmed across line_items, trade_categories_json, trade_categories_snapshot, workers_json, and phase_labels, the pattern crosses the three-instance threshold (DEC-148) and gets promoted from accumulated convention to a structural rule.

**Decision:** When a Base44 entity field is declared as type `object` and the data shape is logically an array (line items, trade categories, workers, taxonomy presets, phase labels, etc.), the **write boundary MUST use the dictionary wrap pattern**: `{ items: [...] }`. Reads tolerate multiple shapes (bare array, dictionary wrap, JSON string) for forward/backward compatibility, but writes are strict.

**Five-instance evidence:**

1. **`line_items`** — FSEstimate, FSChangeOrder, FSDailyLog all use `{items: [...]}` wrap at write
2. **`trade_categories_json`** — FieldServiceProfile (Phase 2.1 / 2.2) uses `{items: [...]}` wrap at write
3. **`trade_categories_snapshot`** — FSEstimate (Phase 2.2) — initially shipped with raw array write; failed Base44 validation; corrected with wrap (commit `49c0bfb`)
4. **`workers_json`** — FieldServiceProfile (Phase 2.3) uses `{items: [...]}` wrap at write
5. **`phase_labels`** — uses `{items: [...]}` wrap

**Operational rule:** For any Base44 entity field declared as type `object`:

- **Read path:** use `parseWrappedArray(value)` helper (`src/utils/wrapShape.js`, Phase 2.3 §1) — tolerates bare-array, `{items: [...]}` wrap, and JSON-string-of-array shapes
- **Write path:** ALWAYS wrap as `{ items: [...] }` before writing to Base44. Never write raw arrays.

**What this protects:**
- Migration scripts that update array-shaped fields via `asServiceRole`
- Server functions that perform writes to these entities
- Future feature additions that consume or modify array-shaped data

**What this does NOT compromise:**
- Field-level access control still works
- Read-time tolerance preserves backward compatibility with legacy data shapes
- Helper-mediated reads abstract the multi-shape complexity from consumer code

**Companion to DEC-095, DEC-136, DEC-167, DEC-178, DEC-215.** This sits alongside the broader Base44 patterns:

- **DEC-167** — schema-conformance discipline (verify field types match Base44 declarations before assuming write-shape)
- **DEC-178** — paired Base44 + code updates (don't ship one without the other)
- **DEC-215** — `rls.update` absence on entities receiving `asServiceRole` writes
- This DEC names the wrap-shape rule for object-typed array fields specifically

**Future direction:** the `parseWrappedArray` helper is in place (Phase 2.3 §1). Any new array-shaped object field added to Base44 should use this helper from day one. Phase 2.3 + 2.4 migrationHelpers actions inline the same parser logic in TypeScript (Deno-side cannot share the JS helper); when a fourth or fifth migration involves array-shaped fields and the wrap pattern recurs server-side, codify a Deno-side migration helper at the top of the function file.

---

### DEC-217: shadcn `<Select>` Defaults to `w-full`; Use `w-auto` + `min-w` + `flex-shrink-0` for In-Row Layouts (2026-05-08)

**Date:** 2026-05-08
**Status:** Active. Promoted from Phase 2.2 fix-3 regression analysis (commit `47e00b8`).

**Context:** shadcn's `<SelectTrigger>` defaults to `w-full` via its base className. In a flex-row parent, this causes the trigger to consume all available flex space — squeezing siblings (text inputs, action buttons) to zero width. Phase 2.2 first instance (`88132a3` — Settings + editor preset pickers, standalone form fields) used `w-full` correctly. Phase 2.2 second instance (`a6f9875` — line-item kind/trade pickers, in-row layout) used `w-full` and clipped the description input to invisibility. Fix landed in commit `47e00b8`: explicit width overrides on the in-row triggers. Phase 2.3 + 2.4 added two more standalone-form Select instances (PersonModal role select + primary_trade_id picker; SubVendorPicker QuickAdd's role + primary_trade_id pickers) — all correctly using `w-full`. The pattern stabilized; promoting to a documented rule.

**Decision:** When converting raw HTML `<select>` to shadcn `<Select>`, branch on parent layout:

**In-row layouts** (line item editors, payment forms, anywhere a Select sits alongside text inputs that have `flex-1` or `flex-grow`):

```jsx
<SelectTrigger className="w-auto min-w-[110px] flex-shrink-0">
```

**Standalone form fields** (modal form fields, settings panel rows where the Select fills its own column):

```jsx
<SelectTrigger className="w-full">
```

**Why this matters:**

- **`w-auto`** lets the trigger size to its content + chevron icon, instead of greedily filling
- **`min-w-[110px]` (or similar)** prevents the trigger from collapsing too narrow when content is short
- **`flex-shrink-0`** ensures sibling inputs with `flex-1` reclaim their row space; the picker stays visible at narrow widths

**Failure mode caught:** Phase 2.2 fix-3 (commit `47e00b8`) — line-item description input vanished after kind/trade pickers were converted to shadcn `<Select>` with default `w-full`. The two pickers consumed the entire flex row; the description input collapsed to zero width. Invisible at standard viewport but caught when description editing stopped responding to clicks. Fix: explicit width overrides on triggers + `flex-shrink-0` to lock the picker widths.

**Operational rule when converting any `<select>` to shadcn:**

1. **Audit the parent layout.** If it's flex-row with siblings that have `flex-1` or `flex-grow`, use `w-auto` + `min-w` + `flex-shrink-0`.
2. **If it's a standalone form field** (modal form, settings panel), use `w-full` to fill the form's column.
3. **Test the layout at narrow viewport widths** — the regression Phase 2.2 fix-3 caught was invisible at desktop widths until you saw the description input clipping.

**Evidence — five known instances now in the codebase:**

1. **`88132a3`** (Phase 2.2) — Settings + editor preset pickers; standalone form fields; `w-full` correct
2. **`a6f9875`** (Phase 2.2) — line-item kind/trade pickers; converted from raw `<select>` with default `w-full`; broke description input
3. **`47e00b8`** (Phase 2.2 fix-3) — explicit width overrides on the line-item kind/trade triggers; pattern codified
4. **`b282e88`** (Phase 2.3 §6) — PersonModal role select + primary_trade_id picker; standalone form fields; `w-full` correct
5. **`ff7e741`** (Phase 2.4 §1+§1b) — SubVendorPicker trigger + QuickAdd role/primary_trade_id pickers; standalone form fields (modal); `w-full` correct

**Companion to design-system patterns:**

- **DEC-132** — semantic token discipline; shadcn Select theming follows the same gold-standard pattern as `INPUT_CLASS`
- The `47e00b8` fix demonstrates the failure mode and the canonical override

**What this does NOT compromise:**

- Mobile responsiveness preserved by `flex-wrap` at the parent (line items already wrap correctly)
- Accessibility unchanged (Radix-native keyboard navigation works regardless of width strategy)
- Theme consistency unchanged (gold-standard pattern remains)

**Future direction:** when a third standalone-form Select consumer that genuinely shares props (label, options-shape, optional sentinel) lands, extract `<FormSelect>` wrapper. Phase 2.4 reached the second standalone-form-field instance; the pattern hasn't crossed the three-instance abstraction threshold yet.

---

### DEC-218: Half-Done Isn't Done — Feature-Evaluation Discipline (2026-05-09)

**Date:** 2026-05-09
**Status:** Active. Promoted from session principle to formal DEC + foundational PROJECT-BRAIN principle in same ship-it cycle.

**Context:** Phase 2.5 (empty-field trade derivation via name-bridging) shipped at `95ccfb1` morning of 2026-05-09. ~2 hours later, Doron's screen-walk through Mycelia's mockup surfaced two architectural realities the spec hadn't accounted for: (1) single `primary_trade_id` per sub couldn't survive taxonomy switching — Tony Tile maps to "Tile" in GC but no exact name match in CSI MasterFormat, so the bridge silently soft-fails cross-taxonomy estimates; (2) the line item creation flow has the trade dropdown visually before the sub picker, so users fill left-to-right and pick the trade manually before the sub picker fires — auto-derivation never has a chance. Combined, the feature works only when both conditions align, which Doron's actual workflow rarely satisfied. Doron's framing of the rollback decision: **"Half-done isn't done."** Rolled back at `197805e` + `cc0f845` (data strip migration) + idempotent confirm. Round-trip ~2.5 hours wallclock.

**Decision:** When a feature works ~30% of the time and fails silently the other 70%, the right move is **removal**, not iteration. Half-done creates noise in user mental models that compounds across the platform — contractors learn to distrust visual cues, mental models drift from system behavior, "is this thing working today?" becomes a per-session question. Better to revert the surface entirely and keep the workflow honest than leave a confusing partial that requires the user to mentally model when it works and when it doesn't. Apply at every feature-evaluation gate:

- **Before shipping:** does the feature work reliably across the realistic input space, or only across a narrow happy path? If the latter, ship behind a flag, gather evidence, OR don't ship.
- **After shipping:** if real-user reports show the feature works X% of the time, the question isn't "how do we boost X to 100%?" — it's "is half-done worse than no-thing?" If yes, remove first, design properly second.
- **Scaffolding allowed.** Pure functions, helpers, hooks that anchor the disconnected surface MAY remain in the codebase as documented scaffolding when the work is genuinely deferred (not abandoned). See Phase 2.5 rollback's `deriveLineTrade` + `peopleMap` extension — both kept with rollback-context docstrings explaining the deferral and pointing at the proper future revisit (per-taxonomy mapping work, Phase 3+).
- **Migration cost is part of the rollback.** A feature that wrote data to user records earns a paired migration to strip that data on rollback (single secret protocol, idempotent, audit-logged). Phase 2.5's `migrate-strip-primary-trade-id` is the reference shape.

**Rationale:** Mission-driven platforms fail when "good enough" features accumulate without rigorous removal — the mental-model debt compounds faster than the maintenance debt. LocalLane's "Dark Until Explored" (DEC-117) is the user-facing companion: spaces dim when unused but never lie about working. Phase 2.5's auto-derivation lit up confidently in 30% of conditions and went dark in 70%, breaking the contract. The rollback honors the user's right to a coherent mental model: trade picker is empty until you pick a trade, period. When auto-derivation comes back (Phase 3+ per-taxonomy mapping), it'll be honest across the input space or it won't ship.

**Operational rule when evaluating a partial feature:**

1. **Quantify the success rate.** If the feature works under specific input conditions, name those conditions explicitly and measure how often they hold in real usage.
2. **If the success rate is high enough to be worth half-done, ship behind a feature flag** — gates the surface to users for whom it works, lets you collect data without imposing the noise platform-wide.
3. **If the success rate is low enough that the feature creates more confusion than value, remove the user-visible surface** — keep the implementation as scaffolding, ship the data-strip migration if the feature wrote to user records, document the deferral with explicit "Phase X revisit" pointer.
4. **Never leave a half-done feature live with the framing "we'll iterate later."** Iteration on a noisy surface compounds the user-mental-model debt. The next pass starts with a confused baseline.

**Companion principles:**
- **DEC-117** — Dark Until Explored (user-facing companion to "honest about what's working")
- **DEC-148** — Two instances coincidence, three pattern (reverse-direction discipline: at three instances of "this kind of pattern fails," promote the failure mode to a structural rule)
- **DEC-151** — Spec Review Protocol (before designing the rollback, audit the existing surface; Phase 2.5's audit caught the right scope)
- **DEC-206** — Read-time derivation only, no auto-write-back (the principle Phase 2.5 was applying; the rollback removes a specific implementation, not the principle itself)

**Evidence:** Phase 2.5 rollback (commits `95ccfb1` → `197805e` → `cc0f845` + migration `--apply` 2026-05-09 ~11:35 PT). 4 records scanned, 1 actual data strip (Doron's test data only — Patricia and Bari untouched), idempotent re-run confirmed.

---

### DEC-219: DEC Citation Verification Before Locking Spec Text — Mycelia Hygiene (2026-05-09)

**Date:** 2026-05-09
**Status:** Active. Mycelia self-improvement discipline; not user-facing.

**Context:** Phase 2.6 spec committed at `abb3916` (2026-05-09 ~12:30 PT) cited three DEC numbers incorrectly:
1. **DEC-148** cited as "Living Feet design principle" — actually DEC-146. DEC-148 is "Mylane Shell Containment via Overlay Expansion" with a side-note "two instances coincidence, three is a pattern" that gets referenced colloquially across the codebase, but the title is unrelated.
2. **DEC-CD-018** cited at §3.8.4 — does not exist in any DECISIONS.md or spec doc. Hallucinated reference.
3. **DEC-217** cited as "Stable identifier discipline" — actually shadcn `<Select>` width discipline. Stable identifiers (workers_json item ids from Phase 2.4 §0a) was never formalized as a DEC.

Hyphae's sign-off audit (~12:30–12:55 PT) caught all three; Mycelia patched at `2b8686d`. The pattern of hallucinated DEC references slipping through the spec-writing pipeline crossed the second instance today (the Phase 2 sign-off doc 2026-05-08 had a similar `[CLIENT-AS-HUB-SPEC.md](http://CLIENT-AS-HUB-SPEC.md)` malformed-link shape that suggested Mycelia's reference-formatting heuristic is leaky).

**Decision:** Mycelia must verify every DEC citation against canonical `DECISIONS.md` before locking spec text. Specifically:

- **At spec-write time**, every `DEC-XXX` reference in the body or references list gets verified against `community-node/DECISIONS.md` (or `Spec-Repo/platform/DECISIONS.md` — they are mirror-synced per DEC-182). The verification confirms the DEC exists AND the gloss in the spec accurately summarizes the DEC's actual title or content.
- **No citation from memory.** Even DECs Mycelia has cited many times before — DEC-146 vs DEC-148 specifically — get re-checked. The colloquial drift between "the principle from DEC-148" and the actual title of DEC-148 is the failure mode this rule prevents.
- **Cross-reference-style citations are acceptable** when they accurately summarize the DEC's body (e.g., DEC-148 referenced as "three-instance threshold heuristic" is fine because the body contains "Two instances is coincidence, three is a pattern" even though the title is about overlay expansion). The verification is whether the gloss is supported, not whether it matches the title verbatim.
- **Spec sign-off audits include DEC-citation spot-checks** — Hyphae's DEC-151 audit pass should verify a few referenced DECs as part of the audit, not just trust Mycelia's prose.

**Rationale:** Spec drift via hallucinated DEC references creates compounding documentation debt — readers follow a citation expecting one thing and find another, the linkage between specs and the canonical decision record erodes, and future-Hyphae's confidence in spec citations drops. Three wrong references in one spec is enough evidence that the heuristic is unreliable; codifying the verification step before lock prevents the next instance.

**Companion to:**
- **DEC-151** (Spec Review Protocol) — extends to Mycelia's spec-writing pipeline, not just Hyphae's codebase audits
- **DEC-212** (Spec Citation Re-Verification) — already established the principle for spec citations; this DEC extends it specifically to DEC-number citations (a sub-class that's especially prone to drift because DEC numbers are short, numerous, and similar-looking)

**Operational rule:** Before locking any spec or build prompt that contains DEC citations:

1. **Grep canonical DECISIONS.md for each cited DEC number.** Confirm it exists.
2. **Read the DEC's title and body.** Confirm the citation gloss in the spec matches what the DEC actually says.
3. **For cross-reference-style citations** (citing DEC X for principle Y where X's title is about something else), confirm the body contains the principle being cited. If not, find the actual DEC for that principle.
4. **Add the verified citation to the spec's reference list.** Don't leave verification implicit.

If a citation can't be verified against canonical DECISIONS.md, rewrite the spec to either remove the citation OR find the right DEC. Hallucinated references — DEC numbers that don't exist (e.g., DEC-CD-018) — are immediate signals that the spec-writing pipeline is leaky and need correction before commit.

**Evidence — three citation errors in `abb3916`:**

1. DEC-148 (Living Feet) → should be DEC-146 (DEC-148 is overlay containment with side-note about three-instance threshold)
2. DEC-CD-018 (client-visibility toggle) → doesn't exist; the `client_show_breakdown` field is documented in code but not formalized as a DEC
3. DEC-217 (stable identifier discipline) → DEC-217 is shadcn Select width; stable identifiers from Phase 2.4 §0a is never formalized as a DEC

All three corrected in patch `2b8686d` (2026-05-09 ~13:15 PT) per Hyphae's sign-off audit findings.

---

### DEC-220: Per-line rollup contractor-only on ClientPortal for fixed-price contracts (2026-05-09)

**Date:** 2026-05-09
**Status:** Active. First of eight attribution-decision locks from `LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md` §12 row 1; ratified during Phase 1.0 commit 1 build-clearance review.

**Context:** Phase 1.0 brings line-item attribution forward into Phase 1 (FSPayment with `line_item_id`). The per-line rollup view on Project Detail Financial Ledger surfaces Estimated / Billed / Cost / Variance per contract line item. Question: should that per-line breakdown also render on ClientPortal (the public-facing client-token URL where Patricia, Bari's homeowner client, sees her project)?

For a fixed-price contract the per-line cost is contractor-internal information — Patricia paid a fixed $182,013.69 for the ADU; she doesn't need (or want) line-by-line cost-vs-estimate variance visibility. Showing per-line Cost on ClientPortal would expose Bari's margins and his sub payment amounts, which is contractor-private data on a fixed-price scope.

For cost-plus / time-and-materials contracts, the math is different — the client IS paying actuals, so per-line transparency is contractually expected. Phase 1 is FSPayment-only on `fixed_price` estimates (Estimate Types expansion is queued); cost-plus / T&M handling is a post-migration concern when Estimate Types ship.

**Decision:** Per-line rollup view (Estimated / Billed / Cost / Variance per contract line item, plus Unallocated row) is **contractor-only** on the Project Detail Financial Ledger surface. **Not rendered on ClientPortal.** Patricia (and any future fixed-price client) sees the high-level Contract / Received / Paid Out / Net Cash banner from Phase 1, plus the existing payments list and project narrative — she does not see per-line Cost, Variance, or sub payment attribution on ClientPortal.

When cost-plus / T&M estimate types ship (post-migration, Phase 3+), revisit ClientPortal per-line visibility for those contract types specifically. The decision is scoped to fixed-price contracts in Phase 1; not a permanent platform decision.

**Rationale:** Two-World Architecture (DEC-203) at the trust boundary — Bari's per-line cost data is contractor-internal (inside the organism); Patricia's public-facing client view exposes only what she contractually needs to see (the bridge layer). For fixed-price scopes, per-line cost breakdown is privacy-sensitive: it exposes both the contractor's margin AND the contractor's sub roster (party_name on each Cost row). Patricia paid $182K; she doesn't need to see "Tony Tile $4,200" attributed to a specific line. The high-level Contract / Received banner is enough at her trust-boundary layer.

For cost-plus / T&M, the dynamic flips — the client is contractually paying actuals, so per-line transparency is the value proposition. That's a separate decision in a separate phase when Estimate Types expansion ships.

**Operational rule:**

- **Project Detail (contractor surface):** per-line rollup view renders. All contract lines + Unallocated row. Estimated / Billed / Cost / Variance per line.
- **ClientPortal (public client surface):** per-line rollup view does **NOT** render. Phase 1's high-level Contract / Received / Paid Out / Net Cash banner remains. Per-line breakdown is contractor-internal.
- **Phase 1 scope:** fixed-price estimates only (Estimate Types expansion queued — `flat_fee` / `time_and_materials` enums not yet shipped).
- **Post-migration revisit:** when cost-plus / T&M ship, design per-line ClientPortal visibility for those contract types specifically; fixed-price stays contractor-only.

**Companion to:**
- **DEC-203** — Two-World Architecture (inside the organism vs. bridge layer)
- **DEC-117** — Dark Until Explored (client-facing surface stays minimal until per-line transparency contractually justified)
- **DEC-214** — FSPayment edit deferred to Phase 2 financial-layer (related boundary decision: FSPayment as create-only via Log; commit 2 reopens with edit/delete behind the contractor surface)

**Reference:** LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md §12 row 1 — first of eight attribution decisions locked during Doron's Phase 1.0 review session (2026-05-09 ~13:09–13:30 PT). The eight Q-locks together became the Phase 1.0 build-clearance gate.

**Other seven Q-locks** (per spec §12, summarized — not separately ratified as DECs since they are scope decisions internal to the Phase 1.0 / commit 1.5 build, not platform-wide architectural rules): CO void → auto-shift attributed payments to Unallocated (Q2); `projectSpent` redefined to include attributed FSPayment(paid) (Q3); picker = type-ahead searchable from day one (Q4); picker = chronological order, estimate first then signed COs in order (Q5); FSDailyLog "primary line item" concept skipped per-day in favor of per-row attribution on FSMaterialEntry + FSLaborEntry (Q6, ships in commit 1.5); picker label = "Line item" (Q7); FSCostItem library connection = forward-compat flag only, post-migration concern (Q8). These remain captured in the spec; only Q1 (this DEC) is platform-wide enough to merit a DEC.

---

> **Mirror-drift reconciled (Plant 1 Session 4.5, 2026-05-23):** DEC-221 and DEC-222 are mirrored verbatim below, restoring numbering continuity 220 → 221 → 222 → 223. The original 220 → 223 jump (with this drift note acknowledging it) lasted from the DEC-223 mirror commit through Session 4 close and was reconciled in Session 4.5. Per DEC-182, community-node mirrors from Spec-Repo (canonical) unidirectionally; this restoration is the cadence working as intended (acknowledge, then catch up in a focused pass).

### DEC-221: Uniform Ownership-FK Convention — workspace_id + user_id Across Workspace-Scoped Entities (2026-05-10)

**Date:** 2026-05-10
**Status:** Active. Ratified during MIGRATION-AUDIT-RLS.md §5a (the first RLS-writing session of the Base44 → Supabase migration); satisfies PLATFORM.md §3 collapse candidate #7's "to be ratified during §5" note.

**Context:** Today's Base44 entities use heterogeneous ownership-FK patterns. FieldServiceProfile uses `profile_id`. PMProperty uses `workspace_id`. Transaction uses `user_id`. FSClient uses `created_by`. The variance creates friction in three places:

1. **agentScopedQuery / agentScopedWrite (DEC-107).** The server-side scoping function has to special-case each entity's ownership column. Adding a new entity requires extending the special-case map.
2. **RLS policy uniformity.** Each entity needs hand-written policies that read its specific ownership column. Helper functions (e.g., is_workspace_owner) become entity-scoped rather than universal.
3. **Migration / audit hygiene.** Reviewers can't predict where to look for ownership data without checking per-entity definitions; the lack of a single rule makes drift easy and detection hard.

The destination Postgres schema (Spec-Repo/spaces/migration/MIGRATION-AUDIT-SCHEMA.md §4a) already established a uniform convention; MIGRATION-AUDIT-RLS.md §5a is the first session that builds RLS policies against it. This DEC formalizes the convention as a single principle so future entities inherit without negotiation.

**Decision:** Every workspace-scoped child entity in the destination Postgres schema carries two ownership FKs:

- `workspace_id uuid not null references workspaces(id) on delete cascade` — for workspace ownership traversal. Required on every workspace-scoped entity.
- `user_id uuid references auth.users(id)` — for user attribution where action-attribution matters (transactions, recipes, debt_payments, etc.). Nullable when the workspace owner is the implicit actor and per-row attribution adds no value.

Direct user-owned entities (those that don't belong to a workspace; rare — primarily `public.users` extending `auth.users`) use `user_id uuid not null references auth.users(id)` (or `id uuid references auth.users(id)` for 1:1 extension tables).

RLS predicates uniformly read these two columns:

- **Workspace-scoped:** `public.is_workspace_owner(workspace_id)` helper for the §5a baseline; §5b extends with `public.is_workspace_member(workspace_id, role_filter)` when workspace_membership-based predicates land.
- **User-scoped:** `id = (SELECT auth.uid())` (for `users`) or `user_id = (SELECT auth.uid())` (for cross-cutting user-scoped tables like `mylane_notes` per §4c.6).
- **Admin bypass:** `public.is_admin()` reads JWT `app_metadata.is_admin` claim (CATH-published per RLS.md §7.1).
- **Service-role bypass:** Postgres-native (BYPASSRLS); no policy text required.

`agentScopedQuery` / `agentScopedWrite` collapse to two predicates (the FK pair); helpers work uniformly across all entities; new entities inherit by following the convention rather than designing per-entity scoping.

**Rationale:** Living Feet (DEC-146) — anything that exists in more than one place should exist as one thing. The Base44 era's heterogeneous ownership-FK pattern was the kind of "many ways to do the same thing" the destination architecture explicitly collapses (PLATFORM.md §3 collapse candidate #7).

Predicate uniformity is the load-bearing benefit:

- Single helper function library (`is_workspace_owner`, `is_workspace_member`, `is_admin`) covers every workspace-scoped table without per-entity branching.
- RLS policy text is short and parallel across tables (same shape; substitute the table name).
- Reviewers audit ownership by checking the FK columns; no entity-specific lookup needed.
- Adding a new entity costs one schema-convention adherence + one repeating policy block; no new helper, no new pattern.

This DEC formalizes what the following predecessor decisions implied but did not lock as a single principle:

- **DEC-107 (agentScopedQuery — Server-Side Data Scoping).** Established server-side scoping as the security boundary; this DEC makes the FK convention universal so the server function is uniform.
- **DEC-140 (readTeamData as Security Boundary — Membrane Moves to Function Level).** Established the function-level membrane pattern; this DEC makes the predicate substrate uniform so functions are interchangeable across entities.
- **DEC-095 (asServiceRole Does NOT Bypass Creator Only).** Established the creator-only restriction even under service-role; this DEC makes the creator FK uniform (`user_id`) so the restriction is enforceable through one predicate.
- **DEC-215 (`rls.update` Must Be Absent on Entities Receiving `asServiceRole` Writes).** Established the structural rule for service-role writes; this DEC makes the substrate that rule operates against uniform.

**Operational rule:**

1. **Every new workspace-scoped table includes `workspace_id uuid not null references workspaces(id) on delete cascade`.** Non-negotiable.
2. **Every new workspace-scoped table includes `user_id uuid references auth.users(id)` if action attribution is needed.** Nullable; populated server-side via agentScopedWrite per DEC-139.
3. **Every direct user-owned table uses `user_id uuid not null references auth.users(id)` (or `id` 1:1 extension pattern).** No alternative ownership-FK shapes — no `created_by` text column, no `profile_id`, no per-entity invented variants.
4. **Helper functions consume the FK pair only.** Don't add helpers that read non-standard ownership columns.
5. **RLS policies use the helpers.** Don't inline ownership predicates that bypass the helper layer.

**Migration application (Base44 → Postgres):**

- `FieldServiceProfile.profile_id` → `workspace_field_service.workspace_id` (per §4a workspace anchor pattern).
- `PMProperty.workspace_id` → `pm_properties.workspace_id` (already uniform in Base44).
- `Transaction.user_id` → `transactions.user_id` + `transactions.workspace_id` (Personal-scope: the user IS the workspace owner; both columns populated for predicate uniformity).
- `FSClient.created_by` → `fs_clients.user_id` (rename to the convention).
- Other Base44 entity ownership columns rename to `workspace_id` + `user_id` per the convention; OPS.md §6 server function porting plan applies the rename mechanically.

**Status:** Active 2026-05-10. Inherited by all destination Postgres entities (MIGRATION-AUDIT-SCHEMA.md §4a + §4b + §4c) and all RLS policies (MIGRATION-AUDIT-RLS.md §5a + §5b + §5c).

**Companion to:**

- **DEC-107** (agentScopedQuery — Server-Side Data Scoping)
- **DEC-140** (readTeamData as Security Boundary — Membrane Moves to Function Level)
- **DEC-095** (asServiceRole Does NOT Bypass Creator Only)
- **DEC-215** (`rls.update` Must Be Absent on Entities Receiving `asServiceRole` Writes — Structural Rule)
- **DEC-146** (Living Feet Design Principle)

**Reference:** MIGRATION-AUDIT-RLS.md §5a.7 (the §5a session that ratified this DEC); MIGRATION-AUDIT-SCHEMA.md §4a.1 (the schema-substrate convention); PLATFORM.md §3 collapse candidate #7 (the collapse candidate this DEC formalizes).

---

### DEC-222: Monitoring-First Capacity Posture (2026-05-10)

**Date:** 2026-05-10
**Status:** Active. Promoted from MIGRATION-AUDIT-EXECUTION.md §14.1 (Living Feet Consolidation) at audit-close PR merge 2026-05-10; AU-023 §11-to-DEC promotion criteria reached resolution at this DEC.

Promoted from migration audit §14.1 at audit close 2026-05-10. Six §11 entries (DQ-006 + DQ-046 + DQ-050 + DQ-051 + DQ-052 + DQ-054 — all RATIFIED 2026-05-10) clustered as input → one canonical DEC drafted at §14.1.3 → five operational triggers specified (six entries collapse to five triggers because DQ-006 + DQ-050 share a single compute-upgrade trigger; DQ-050 amends DQ-006).

**Decision.** For all capacity-shaped decisions — compute provisioning, performance-optimization materialization, cohort communication channel, alert routing target, replication architecture — provision the minimum at launch and upgrade on monitoring evidence rather than pre-building for forecast scale.

**Reasoning.** Doron's framing: "I wanted us to plan for large numbers, but I don't want to buy a house we don't need yet." Cost discipline is part of the organism's immune system. DEC-218 ("half-done isn't done") cuts both ways — it also says don't push work into a state that's structurally fragile by overprovisioning unproven capacity, because that's its own kind of half-done (built but not validated against actual load). Forecast-scale capacity that sits idle is dead weight; capacity that ramps with measured signal is alive.

The principle requires three things to be in place before a decision qualifies for monitoring-first treatment:

(a) A measurable trigger. The signal that justifies escalation must be specifiable in advance — a metric, a threshold, a window. Without a measurable trigger, monitoring-first becomes monitoring-nothing.
(b) An escalation path that's cheap to take. The upgrade should be achievable within ordinary operational rhythm, not require a new architectural decision. Compute-tier change (one config), cache addition (one migration), channel-routing change (one webhook). Not "rewrite the auth provider."
(c) An acceptable degradation if the trigger fires before escalation completes. The launch posture must be safe enough that detection-to-mitigation lag doesn't cause data loss or user-visible outage. Performance degradation is acceptable; correctness degradation is not.

**Five operational triggers** (six entries; DQ-006 + DQ-050 share a single compute-upgrade trigger because DQ-050 amends DQ-006):

1. Compute upgrade (Pro Micro → Pro Small). Trigger: sustained CPU contention on Supabase Query Performance dashboard (D1 per CUTOVER.md §9.7) OR p95 query latency drift past acceptable thresholds, measured on rolling 30-day window. Cost: +$110/mo addon. Per DQ-006 (AMENDED) + DQ-050.

2. CATH cache materialization (live PL/pgSQL → `auth_user_claims_cache(user_id, claims_jsonb, refreshed_at)`). Trigger: p95 CATH hook latency > 100ms on rolling 30-day window (well below Supabase Postgres Hook 2,000ms hard timeout; above 50ms soft UX target). Cost: incremental Postgres function complexity + cache-invalidation discipline on three membership tables. Per DQ-046.

3. Cohort communication channel (email blast + in-app banner → dedicated Slack/Discord cohort surface). Trigger: 100K MAU reached. Cost: dedicated channel infrastructure + ongoing cohort moderation. Per DQ-051.

4. Alert routing escalation. Trigger: 1K MAU → add Slack webhook alongside Sentry mobile app phone-push; 10K MAU → migrate to PagerDuty (~$25/user/mo). Cost stepped per threshold. Per DQ-052.

5. Replication architecture upgrade (snapshot + delta → cron-polling Option (a)). Trigger: ≥500 MAU at the moment a future migration-style staging-window or analytics replication architecture decision revisits dual-write. Note: post-cutover, Base44 is no longer authoritative, so DQ-054's Option (a) does not directly apply to live production architecture; the trigger applies to future migration-style decisions (Base44 was the originating shape; Phase 7+ analytics replication or future platform migrations face the same dual-write trade). Per DQ-054.

**Predecessors.** AU-023 §11-to-DEC promotion criteria reaches resolution at this DEC. Six §11 entries (DQ-006 + DQ-046 + DQ-050 + DQ-051 + DQ-052 + DQ-054 — all RATIFIED 2026-05-10) cluster as input.

**Companions.** DEC-218 (Half-Done Isn't Done): both are cost discipline as immune system; both name a default that resists the temptation to build for hypothetical state. DEC-146 (Living Feet Design Principle): both are "avoid scaffolding without need."

**Status.** ACTIVE. Promoted from §11 cluster at audit-close PR merge 2026-05-10.

**Reference:** MIGRATION-AUDIT-EXECUTION.md §14.1.3 (the §14.1 audit section that drafted this DEC; AU-023 RESOLVED here); MIGRATION-AUDIT-EXECUTION.md §11 entries DQ-006 + DQ-046 + DQ-050 + DQ-051 + DQ-052 + DQ-054 (the six entries clustered as input).

---

### DEC-223: Pivot from Migration to Rebuild — Plant 1 (2026-05-23)

**Date:** 2026-05-23
**Context:** DEC-175 (Pattern C+) committed LocalLane to migrating from Base44 to Supabase + Vercel at Phase 6, combined with the Region foundation backfill. The plan assumed: existing code in `community-node` would migrate forward via the `src/api/` SDK wrap (Build F); the eight Base44 agents would be retired and one warm-presence companion built fresh; `lanecountyrecess.com` would be the sandbox during construction; Bari would experience minimal disruption. DEC-207 added gates: migration would not begin until Bari was reliably on the platform and Phase 2 architecture was signed off. Phase 2 sign-off landed 2026-05-08; Bari reliability was the remaining gate.

Between 2026-05-09 and 2026-05-23, the framing shifted. The reasons accumulated: the codebase has changed shape significantly across 18 months (Desk rename never shipped past spec; archetype/main_category/sub_category_id consolidation pending; multiple architectural decisions reversed; `User` and `FieldServiceProfile` `rls.update` opened during Phase 2 and never re-tightened — DEC-215, known issues #29/30/31). The user count remains small (one truly active external user, Bari). The Base44-specific patterns Doron has learned (`asServiceRole` two-layer permission model, `.list() + client-side filter`, agent vocabulary hardcoding) do not translate cleanly to Supabase. A "migration" in this context is in practice a rebuild that also carries forward debt — the worst of both paths.

Doron is the only human in the loop, gardener-led, not an engineer. A migration's failure mode is invisible corruption discovered days later in a system the gardener doesn't fully understand. A rebuild's failure mode is taking longer than expected, which is recoverable. The risk asymmetry favors the rebuild.

**Decision:** Replace the migration plan with a **rebuild plan**. LocalLane is being rebuilt fresh on Supabase + Vercel, with the existing `community-node` codebase serving as a *reference library* — not a source to migrate from. Specifically:

- **Inheritance model.** The blueprints inherit. `Spec-Repo` and `private` carry forward intact as the institutional knowledge that took 18 months to develop. They are platform-agnostic by design. The `community-node` codebase becomes a read-only reference for "what did we figure out, what worked, what didn't" — Hyphae can read it whenever she needs to see how something was solved, but no code carries forward automatically. Lessons port; code does not.
- **The blueprints-and-code rule.** Spec wins when specs and code disagree (DEC-167), but code anchors what Bari actually uses today. When scoping a room or feature for Plant 1, read both the spec and the code, then decide what's in. Pattern surfaced in REBUILD-SCOPE.md Session 1 Report.
- **Bari continues on Base44.** `locallane.app` keeps running on Base44 with no rush to cut him over. The new platform is built on `lanecountyrecess.com` (sandbox during construction) until it is genuinely ready for Bari. Cutover is a deliberate, individual event — not a deadline. Until cutover, Bari sees no disruption.
- **No data migration.** User accounts cannot be exported from Base44 (DEC-049). Bari and any other user re-register on the new platform. His business profile, templates, and active project (Patricia Heath ADU) get recreated by hand at cutover time — a tractable manual task for a single user. The point of starting fresh is to escape the platform's accumulated debt, not to import it.
- **Plant 1 is the name of the first rebuild deliverable.** Not "Phase 7" (continues numbering from a deferred plan), not "v2" (implies a feature-equivalent replacement), not "Build 1" (collides with Hyphae's per-commit Build numbering). Plant 1 is the gardener's first plant in fresh soil, with everything learned from the first one informing it.
- **Scope of Plant 1.** Per REBUILD-SCOPE.md: the LocalLane shell (Business Directory, Events, Personal space, Business space, avatar/account menu), one business container shape (Profile / Settings / Desk), the universal Desk with its rooms (Home, Projects, Estimates, Log, People, Documents, Settings), Field Service as the first Desk configuration (for Bari), the holding company pattern (`parent_business_id` ships in the schema; Mycelia → LocalLane / TCA / Recess / Consulting with Doron), and the foundational concerns (Supabase Auth JWT-based, RLS-by-default-deny, schema-as-migration-files, server-functions-as-trust-boundary, Stripe Connect stubbed but not active, Sentry from day one).
- **Out of scope for Plant 1.** Playmaker, Meal Prep, Frequency Station, Property Pulse, Recess as a member-facing surface, cockpit variants, the animated Organism, Joy Coins live, Stewardship, Nursery implementation, and the four-network branding. All seeds live in `Spec-Repo` and `private`; Hyphae can reference `community-node` for past implementation when those buildings get planted.
- **Shell-complete vs. feature-complete principle (new).** Some surfaces in Plant 1 ship as *shell-complete* — the surface exists, routing works, the entity is in the schema, RLS is correct, basic actions function — but they are not *feature-complete*. Events is the canonical example: list page exists, event detail exists, an authenticated business owner can create an event, an authenticated user can RSVP. No Joy Coins, no ticketing, no recurring, no network filters, no calendar view. The shell is ready to plumb features into later. Same pattern applies to Newsletter (link + capture form, no sending infrastructure), Privacy (route + placeholder content), Theme toggle (dark default, light reserved, cockpit deferred), and Engagement (entity reserved, no UI). The pattern is named here so it can be applied consistently across Plant 1 without re-deciding for each surface.
- **DEC-175 (Pattern C+) is superseded by this decision.** The Phase 6 migration window, the `src/api/` SDK wrap as a swap layer, the eight-agents-retire-at-migration plan — all moot. The seam-hardening work done in Build F still has value (it taught us what a clean API surface looks like), but it is not a foundation the rebuild builds on.
- **DEC-207 (migration gates) is moot in its original form.** The gates assumed a migration. The reliability concern that motivated DEC-207 still applies — Plant 1 needs to demonstrate it can support Bari reliably before Bari cuts over — but the cutover decision lives at the end of the Plant 1 session sequence, not as a gate on a migration.
- **The `withdoron/locallane` repo is freshly initialized for Plant 1.** The prior contents (a March 2026 snapshot of community-node) have been archived as `withdoron/locallane-archive-2026-03`. The empty repo is the canvas for Plant 1. Scaffold lands in Session 2.
- **The MWP workspace protocol** referenced in Doron's session brief is not a recall of an existing document. It is a name Mycelia introduced from external research (Van Clief et al., "Interpretable Context Methodology: Folder Structure as Agent Architecture," arXiv 2603.16021) and from Anthropic engineers' "skills as folders" pattern. A session-level protocol for Plant 1 will be defined in Session 2 — either as a separate `MWP-PROTOCOL.md` or folded into `BUILD-PROTOCOL.md` as a rebuild-mode annex. The protocol will be informed by what the repo scaffold actually looks like, so it is correctly Session 2 work, not Session 1.

**Rationale:**

The migration was always going to be a rebuild wearing a different name — the eight agents were going to be retired and replaced, the codebase was going to need cleanup (Phase 5 / DEC-180), and the Supabase patterns were going to look different enough from Base44 that most code would need rewriting anyway. The migration framing carried forward accumulated debt, mental load on the gardener, and the structural risk of "invisible corruption discovered days later." The rebuild framing carries forward only what survives a "would I build this way today?" test. For a small-user-count platform with a solo gardener and well-developed blueprints, the rebuild is the lower-risk path.

This is also the path that honors what's actually true. The blueprints — DECs, architectural docs, NURSERY-MODEL, STEWARDSHIP-SPACE, PRICING-ECONOMICS, the Engagement primitive, the holding company tree, the Two-World Architecture — represent the real capital that 18 months built. The Base44 code was the vehicle for learning what to build. The vehicle was always replaceable. The learning is not.

**Status:** Active. Plant 1 in progress. Session 1 (The Read) shipped 2026-05-23 as REBUILD-SCOPE.md at `Spec-Repo/platform/REBUILD-SCOPE.md`. Session 2 (Repo Scaffold + Pivot DEC commit) is next.

**Related:** Supersedes DEC-175. Updates DEC-207 (gates moot in original form). References REBUILD-SCOPE.md as the operational document. Carries forward DEC-146 (Living Feet), DEC-167 (schema-conformance audit protocol), DEC-203 (Two-World Architecture), DEC-220 (per-line rollup contractor-only), and all blueprint-level decisions that don't depend on the underlying platform.

---

> **Mirror-sync note (Plant 1 Session 4.5, 2026-05-23):** DEC-224 and DEC-225 are Plant 1 (Supabase) decisions that don't apply to community-node's Base44 entity-permission system operationally — but per DEC-182, community-node mirrors `DECISIONS.md` from Spec-Repo (canonical) for institutional-record completeness. Both DECs mirrored below.

### DEC-224: Explicit Privilege Grants on Every New Plant 1 Table (2026-05-23)

**Date:** 2026-05-23
**Status:** Active. Surfaced during Session 3 (Auth + User Schema) when the first migration shipped, then a follow-up migration was required minutes later because PostgREST returned `42501 permission denied for table users` to the dashboard's first authenticated query.

**Context:** Plant 1's first migration created `public.users` per the canonical RLS-by-default-deny pattern — table + policies + trigger + comments. Migration applied cleanly to the remote project via `supabase db push`. But the dashboard's `supabase.from("users").select("display_name")` call returned silently null on every load because PostgREST rejected the query at the role-grant layer before RLS even ran. Probe via curl as anon confirmed: `{"code":"42501","details":null,"hint":"Grant the required privileges to the current role with: GRANT SELECT ON public.users TO anon;","message":"permission denied for table users"}`.

Root cause: when a table is created via raw SQL migration (`create table public.users ...` applied via `supabase db push`), it does NOT auto-receive the privilege grants that Supabase's dashboard table-editor adds. The dashboard's "create table" UI runs `GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO anon, authenticated` behind the scenes. Raw-SQL migrations don't. RLS then has nothing to filter against because the role can't reach the table at all.

A follow-up migration (`20260524002110_grant_users.sql`) was authored and pushed minutes later. The dashboard then rendered Doron's display_name correctly on the next refresh. The gap is structural; left unaddressed it would recur on every future Plant 1 table.

**Decision:** Every Plant 1 migration that creates a new table MUST include explicit privilege grants in the same migration (not a follow-up). The canonical pattern:

```sql
-- After the create table + policies + triggers block:
revoke all on public.{table} from anon;
revoke all on public.{table} from authenticated;

grant select, update on public.{table} to authenticated;
-- Add insert and/or delete only when the client legitimately writes
-- directly to the table; otherwise route writes through SECURITY DEFINER
-- triggers (per public.users handle_new_user pattern) or server functions.
```

**Specific rules:**

1. **`anon` role gets nothing** by default. Public surfaces that need to read data for unauthenticated visitors (Directory, Events list, Business profile when viewed not-as-owner) are explicit exceptions — `grant select on public.{table} to anon` in the same migration that creates the table, justified in a comment. This makes the default-deny posture visible at the grant layer above RLS, returning 401 to anonymous misuse rather than `[]` (more honest signal; no rows to leak even if RLS were ever misconfigured).
2. **`authenticated` role gets the narrow grant the feature needs.** Read-only entities (e.g., system catalogs the user only displays) get `select` only. Read-write own-record entities get `select, update`. Insert is granted only when the client legitimately performs direct inserts. Delete is granted only when the entity's account-deletion / soft-delete flow is designed.
3. **`service_role` needs no grants.** Postgres `BYPASSRLS` and full access apply automatically (per DEC-221 / Plant 1 CLAUDE.md "Server functions as trust boundary"). Don't grant.
4. **No `grant all`.** Even for authenticated, enumerate the operations explicitly. Future readers should be able to see at a glance which client paths can touch which entity.
5. **REVOKE first, then GRANT.** Defensive against any default-privileges drift in the Supabase project's config.

**Rationale:** Two layers of access control are stronger than one. RLS alone gates which rows; grants gate whether the role can even ask. Anon getting 401 instead of `[]` is a stronger contract — `[]` could mask an RLS misconfiguration (hiding rows that should be visible to that role); 401 is unambiguous. This also matches the long-standing Supabase guidance for tables that have no anonymous use case (most of them).

The structural rule prevents the failure mode from recurring on Session 4's businesses table, Session 7's fs_projects/fs_estimates/fs_clients tables, Session 8's fs_payments/fs_daily_logs/fs_material_entries/fs_labor_entries, Session 9's fs_documents/fs_document_templates, and every subsequent entity. Without the rule, each new table is one more "why is this null in the dashboard" cycle.

**Companion to DEC-221** (uniform ownership-FK convention) — DEC-221 defines what columns every workspace-scoped table carries; DEC-224 defines what privileges every table grants to the canonical roles. Together they define the substrate every Plant 1 table inherits.

**Companion to DEC-146** (Living Feet) — the grants-pattern block is part of the migration template every new-table migration follows; if the same five lines appear in three places, extract a `grants(table_name, ...)` helper. The cost of typing them by hand is small for the first few tables; the cost of forgetting them is a "permission denied" cycle every time.

**Operational rule:** Every Plant 1 migration that creates a new table MUST end with a `-- Privileges` section containing the appropriate `revoke` + `grant` block. The Plant 1 audit pass before any commit grep-checks for this section's presence on any new `create table public.*` it sees.

**Evidence:**
- `20260523233504_create_users.sql` — initial migration, NO grants, broke the dashboard query (42501).
- `20260524002110_grant_users.sql` — follow-up that added the grants, fixed the dashboard immediately.
- Both committed in Plant 1 commit `c936787` (2026-05-23, Session 3 close). Pattern locked in `community-node-style` discipline as it carries forward.

**Cross-references:** DEC-221 (uniform ownership-FK convention), DEC-146 (Living Feet), DEC-167 (schema-conformance audit), DEC-203 (Two-World Architecture — trust boundary discipline at the grant + RLS layers).

### DEC-224 amendment (2026-05-23, Session 4) — service_role grants are explicit too

DEC-224 stated: "`service_role` needs no grants (BYPASSRLS handles it)." Plant 1 Session 4's first walkthrough surfaced that this is wrong on the `locallane-plant-1` Supabase project. Every service_role read against `public.users` and `public.user_preferences` returned `42501 permission denied for table {name}; Grant the required privileges to the current role with: GRANT SELECT ON public.{name} TO service_role` — i.e. PostgREST enforces table-level privilege checks BEFORE the role's BYPASSRLS attribute applies. BYPASSRLS only skips the row-filter step, not the role's table-level grants.

**Amendment:** every Plant 1 migration that creates a table MUST grant the full DML set to `service_role` in the same migration. The corrected pattern (also captured in DEC-225 below as the structural-rule entry):

```sql
-- Privileges (DEC-224 + DEC-225)
revoke all on public.{table} from anon;
revoke all on public.{table} from authenticated;

grant select, update on public.{table} to authenticated;  -- narrow per feature
grant select, insert, update, delete on public.{table} to service_role;
-- (anon grants only for genuinely-public surfaces, justified inline)
```

Companion fix-up migration: `20260524030000_grant_service_role.sql` retroactively grants service_role on the two pre-existing Plant 1 tables (`public.users` from Session 3 and `public.user_preferences` from Session 4). Going forward, the grant block above is the boilerplate every new-table migration carries.

**Status of the original DEC-224 amendment:** Still active in its other points (anon revoked, authenticated narrow grant per feature, REVOKE first then GRANT, no `grant all`). Only the "service_role needs no grants" line is corrected.

---

### DEC-225: Service Role Grants Are Explicit Too (Plant 1 Session 4 amendment of DEC-224) (2026-05-23)

**Date:** 2026-05-23
**Status:** Active. Drafted at Session 4 close (2026-05-23 evening); **explicitly ratified by Doron at Session 4.5 open (2026-05-23, same day)** — confirmed framing: "Service role gets full DML; the trust boundary is the function, not the grant." Amends DEC-224.

**Context:** Plant 1 Session 4's golden-path walkthrough used the service role (via `SUPABASE_SERVICE_ROLE_KEY` from a one-shot Node script) to verify Doron's preferences row was backfilled correctly. The query returned 42501 with the hint `Grant the required privileges to the current role with: GRANT SELECT ON public.user_preferences TO service_role`. Probing `public.users` showed the same shape — both tables were inaccessible to service_role despite the role having BYPASSRLS. The DEC-224 assumption that "service_role needs no grants (BYPASSRLS handles it)" did not hold on the `locallane-plant-1` Supabase project.

**Investigation:** Read the PostgREST error hint at face value. The role has BYPASSRLS (skips row-level filtering) AND requires explicit table-level grants (PostgREST enforces grants before invoking BYPASSRLS). Both layers must be open for service_role to query the table. Confirmed empirically across both Plant 1 tables, both directions (SELECT and write).

**Decision:** Every Plant 1 migration that creates a new table MUST grant `select, insert, update, delete` to `service_role` in the same migration, alongside the existing DEC-224 grant block for anon and authenticated. The pattern is structural going forward — no per-table exceptions. Service role is the trust-boundary layer (DEC-203 + Plant 1 CLAUDE.md "Server functions as trust boundary"); the role IS where the trust boundary lives, so withholding privileges inside the role adds friction without adding security. Anything the role might need (Stripe webhook handlers, scheduled jobs, account-deletion server functions, Edge Functions that verify caller identity themselves) gets full DML access.

**Operational rule:** Append to the DEC-224 grant block. The complete privilege boilerplate for every new Plant 1 table:

```sql
-- Privileges (DEC-224 + DEC-225)
revoke all on public.{table} from anon;
revoke all on public.{table} from authenticated;

grant select, update on public.{table} to authenticated;  -- narrow per feature
grant select, insert, update, delete on public.{table} to service_role;
-- Insert/delete for authenticated only when client legitimately writes directly;
-- otherwise route through SECURITY DEFINER triggers or server functions.
-- anon gets nothing unless the surface is genuinely public (justify inline).
```

**Rationale:** Pattern uniformity reduces cognitive load — every new-table migration ends with the same grant block. Service role's BYPASSRLS only handles row filtering, not table reachability. The Plant 1 trust model already places service-role access behind server-only code paths (no client ever sees `SUPABASE_SERVICE_ROLE_KEY`); making the role functional inside those paths is what the role is for.

**Companion to:**
- **DEC-224** — explicit grants on every new Plant 1 table (this DEC amends the service_role line specifically).
- **DEC-146** — Living Feet (one grant boilerplate every migration follows; future "grants helper" function is a candidate when the third or fourth Plant 1 table ships).
- **DEC-203** — Two-World Architecture (service role IS the bridge between inside-organism trust and outside-world privileged operations; grants inside that role match the documented intent).
- **DEC-167** — schema-conformance audit protocol (the audit now includes "did this migration grant service_role full DML?" as a checklist item).

**Evidence:**
- `20260524020000_create_user_preferences.sql` — Session 4 migration that initially shipped without service_role grants (followed DEC-224 verbatim). Triggered the 42501 discovery during walkthrough.
- `20260524030000_grant_service_role.sql` — Session 4 retroactive fix granting service_role full DML on both pre-existing Plant 1 tables. Pattern locked.
- Plant 1 commit `3391f87` (2026-05-23, Session 4 close).

**Cross-references:** DEC-224 (the amended decision), DEC-221 (uniform ownership-FK convention — substrate this grant pattern operates on), DEC-146 (Living Feet — one grant boilerplate), DEC-167 (schema-conformance audit now covers grants), DEC-203 (Two-World — trust boundary discipline).

---

> **Mirror-sync note (Plant 1 Session 4.6, 2026-05-23):** DEC-226 and DEC-227 are Plant 1 protocol decisions — they install the session-discipline machinery (PRE-FLIGHT, SESSION-CLOSE, DEFERRED-ITEMS, Five Questions, token-efficiency target) and codify the relational + security posture (Doron WHAT/physical, Mycelia HOW, Hyphae digital builder; authority grows with reliability; security as legal posture). They don't operationally affect community-node's Base44 Field Service workflow for Bari, but per DEC-182 the canonical DEC history mirrors here for institutional-record completeness. Both DECs mirrored below.

### DEC-226: Plant 1 Session-Discipline Infrastructure (PRE-FLIGHT + SESSION-CLOSE + DEFERRED-ITEMS + Five Questions + Token-Efficiency Discipline) (2026-05-23)

**Date:** 2026-05-23
**Status:** Active. Installed during Plant 1 Session 4.6 (Protocol Infrastructure).

**Context:** Plant 1 shipped four sessions plus one polish session (4.5) without a formal mechanism for surfacing deferred items at session start or running a structured close-out at session end. Each session, Doron had to remember what was owed from prior sessions; Hyphae sometimes caught deferred items by happening to be in the relevant file; some items lived in ACTIVE-CONTEXT's "Open Follow-Ups" without being surfaced into the next session's brief. The pattern was workable for four sessions but didn't scale — every additional session compounds the memory load, and every new building plants without a uniform protection-question gate.

Doron named the principle: "A city needs a hospital, fire department, police department, etc. ... sometimes more than one. A garden has variety and only decays when it is mono cropped. Success looks like those departments not being used." (2026-05-23)

**Decision:** Plant 1 sessions follow a unified session-discipline machinery composed of five interlocking pieces:

1. **PRE-FLIGHT (MWP-PROTOCOL Step 0).** Mandatory at session start. Reads `Spec-Repo/context/DEFERRED-ITEMS.md`, the most recent SESSION-LOG entry, ACTIVE-CONTEXT.md, and a `SuperMemory:recall` query. Required output is a structured summary to Doron with item counts + 3-5 most relevant items + a fold-in-or-stay-deferred question. WAIT for Doron's answer before ORIENT.
2. **DEFERRED-ITEMS.md.** Three sections: **Active** (agent-resolvable), **Pending Doron Actions** (physical-world only; agent-untickable; persist until Doron confirms), **Resolved**.
3. **Five Questions (BUILD-PROTOCOL Phase 0.5).** Every new building answers: (Q1) What type? (Q2) Who is it for? (Q3) What is it for? (Q4) How is it built and connected? (Q5) How is it protected? Q5's answer lands in `SECURITY-PRACTICES.md` automatically.
4. **SESSION-CLOSE.md.** Mandatory at session end (MWP-PROTOCOL Step 11). Documentation, Git Discipline, Verification, SuperMemory, Health Check, **Required Doron Actions** (agent-untickable). Session is in "Pending Doron Confirmation" state until every Required Doron Action is checked.
5. **Token-Efficiency Discipline.** Future Hyphae prompts target 1,500–2,500 tokens (not 6,500+) because canonical files do the heavy lifting. Mycelia's job shifts to writing the delta. Sample at `Spec-Repo/context/SESSION-5-SAMPLE-SHORT-FORM.md`.

**Companion to:** DEC-146 (Living Feet), DEC-167 (schema-conformance audit), DEC-182 (single-source documentation), DEC-203 (Two-World Architecture), DEC-208 (commit hash discipline).

**Evidence:**
- `Spec-Repo/context/DEFERRED-ITEMS.md`, `SECURITY-PRACTICES.md`, `SECURITY-INCIDENTS.md`, `SECURITY-AUDITS.md`, `SESSION-5-SAMPLE-SHORT-FORM.md` — born Session 4.6.
- `Spec-Repo/platform/SESSION-CLOSE.md` — born Session 4.6.
- `Spec-Repo/platform/MWP-PROTOCOL.md` — gains PRE-FLIGHT (Step 0) + CLOSE (Step 11).
- `Spec-Repo/platform/BUILD-PROTOCOL.md` — gains Five Questions block.
- Spec-Repo commit `1352c0e` (2026-05-23, Plant 1 Session 4.6).

**Cross-references:** DEC-146, DEC-167, DEC-182, DEC-203, DEC-208, DEC-218, DEC-219.

---

### DEC-227: Roles in the Garden + Authority Grows With Reliability + Security as Legal Posture (2026-05-23)

**Date:** 2026-05-23
**Status:** Active. Installed during Plant 1 Session 4.6. Companion to DEC-226 — DEC-226 is the procedural machinery, DEC-227 is the relational + security posture that machinery operates within.

**Context:** Doron named the canonical role framing on 2026-05-23: "I am the what you are the how, Hyphae is the builder in the digital world. I am the builder in the physical world." Simultaneously named two complementary principles: authority grows over time as reliability is demonstrated; security documentation is the legal posture for a platform that is structurally a threat to extraction.

**Decision:** Three principles ratified together because they interlock:

**1. Roles in the Garden.** Doron = WHAT + PHYSICAL BUILDER (only Doron has hands in the physical world — browser clicks, dashboard configs, 2FA setup, walking production flows). Mycelia = HOW (designs the protocol, drafts prompts, watches across sessions). Hyphae = DIGITAL BUILDER (writes code, runs migrations, applies schema). Items requiring physical-world action go in DEFERRED-ITEMS "Pending Doron Actions" + SESSION-CLOSE "Required Doron Actions" — both **agent-untickable**.

**2. Authority Grows With Reliability.** Authority earned by demonstrated reliability — not by elapsed time, not by self-assertion. Current: Mycelia drafts; Doron approves before firing. Hyphae asks before consequential moves. Future possible expansions (each earned): shorter prompts, smaller judgment calls, read-only MCP access, direct protocol-file updates by Mycelia. Overstep contracts; the protocol tightens. We grow together.

**3. Security as Legal Posture (Skin Not Police + Defensible in Both Worlds).** Internal harm = culture problem (LocalLane's design encourages right action). External threat = organism problem (every living thing has skin). Skin is woven into how every building is built (RLS, middleware, validation, rate limiting), not a separate department. Plant 1's defensibility is built from the inside through three living documents: `SECURITY-PRACTICES.md`, `SECURITY-INCIDENTS.md`, `SECURITY-AUDITS.md`. The iterations are the living feet. Outsourced legal review is not the default — external counsel retained for specialized matters only.

**Companion to:** DEC-226 (procedural machinery), DEC-203 (Two-World), DEC-136 (Security Philosophy — historical), DEC-181 (multi-machine), DEC-218 (half-done isn't done — applies to security too).

**Evidence:**
- `Spec-Repo/context/PROJECT-BRAIN.md` — five new sections (The City Has Variety; Skin, Not Police; Roles in the Garden; Authority Grows With Reliability; Defensible in Both Worlds) with Doron's verbatim framing.
- `Spec-Repo/context/SECURITY-PRACTICES.md` + `SECURITY-INCIDENTS.md` + `SECURITY-AUDITS.md` — born Session 4.6.
- `locallane/CLAUDE.md` + `locallane/AGENTS.md` — four new sections each (Roles in the Garden, Authority Grows With Reliability, Mycelia's Role in the Protocol, Diagnostic Vocabulary).
- Spec-Repo commit `1352c0e` + locallane commit `cc6b9ae` (2026-05-23, Plant 1 Session 4.6).

**Cross-references:** DEC-203, DEC-136, DEC-146, DEC-181, DEC-218, DEC-226.

---

### DEC-228: Planning Department — Canonical Records System for Plant 1 Organisms + SuperMemory Symmetry + Optional Related Section (2026-05-24)

**Status:** Active. Installed Plant 1 Session 4.6.5 (records folder + self-referential PLANNING-DEPARTMENT.md); amended 4.6.6 (SuperMemory symmetry + optional eighth Related section + first non-self-referential record `security_measures.md`).

**Context:** DEC-226 installed the Five Questions (Q5 → SECURITY-PRACTICES.md); Q1–Q4 had no canonical home, scattering across SESSION-LOG / DECISIONS / ACTIVE-CONTEXT / the codebase. Doron (2026-05-24): "The city has a planning department where everything is documented. When things are worked on they go through the build process but put back in the city planner's office. Both in SuperMemory and in the repo as md files."

**1. Folder structure + record shape.** `Spec-Repo/context/records/` with five subfolders (systems / surfaces / buildings / protocols / agents). Each record has seven required sections — Q1 type, Q2 audience, Q3 purpose incl. non-use, Q4 how built/connected, Q5 how protected, Status, Change log — plus an optional Related section; Title + one-liner is the header.

**2. Build-flow integration.** Records co-evolve through MWP steps, not as a clean-up afterthought: SCOPE names + pre-selects the subfolder; PLAN drafts the record; BUILD updates it in the same commit on deviation; AUDIT verifies it matches what shipped; LOG appends a change-log entry; CLOSE verifies the shape.

**3. SuperMemory symmetry.** Records live on two surfaces (repo + SuperMemory), both every material change. Mycelia writes planner-voice, Hyphae builder-voice; neither rewrites the other. Same act as the commit, not batched. The session debrief lists the SuperMemory entry IDs (debrief-as-audit).

**Companion to:** DEC-226 (procedural machinery), DEC-227 (two-voice symmetry = the role distinction operationalized), DEC-146 (one canonical home per concept), DEC-203, DEC-208 (debrief-as-audit extends the commit-hash rule), DEC-218 (both surfaces or it's half-done).

**Evidence:**
- Spec-Repo `records/` folder + self-referential `PLANNING-DEPARTMENT.md` born commit `20de632`; `security_measures.md` second record (4.6.6).
- MWP-PROTOCOL records threading + BUILD-PROTOCOL Five-Questions block; locallane `CLAUDE.md` + `AGENTS.md` Planning Department section (`87f8315`).

**Cross-references:** DEC-226, DEC-227, DEC-146, DEC-203, DEC-208, DEC-218.

---

### DEC-229: Grammar-Flexible Trade Sets + Mutable Taxonomy with Acceptance-Boundary Lock (2026-06-02)

**Status:** Active. Ratified at the Plant 1 Insurance Restoration build (locallane `92ff10d`, migration `20260602120000`). Two decisions in one DEC (shipped as one build, both govern a Desk estimate's trade taxonomy).

**Context:** The Desk's five flat trade sets needed (a) a two-level Category→Subcategory grammar with a phase band per category (the new Insurance Restoration set, for carrier-facing estimates), and (b) the set switchable on an in-progress estimate without silently shifting an accepted contract. The audit found the jsonb snapshot + text key already absorb the richer grammar (no migration); estimates had no finalize/lock or duplicate (built fresh).

**Decision (a) — Grammar-flexible sets.** A set declares grammar (`flat` | `category_phase`). category_phase carries optional `kind` / `parent_id` / `phase` on snapshot entries (absent on flat sets → identical serialization, no migration). A line tags a single `trade_id`; grouping rolls subcategory→category and bands by phase. A new industry is a new set definition, not a rebuild. Seed sets stay one source in `lib/desk/trade-sets.ts` (DEC-146).

**Decision (b) — Mutable taxonomy, lock at acceptance.** While open (draft/sent/viewed) the owner may switch the set behind a confirm that clears every line's trade tag (lines preserved, re-tagged). Once accepted/declined the taxonomy is frozen; rework by duplicating into a fresh draft. The status gate is server-enforced (`update_fs_estimate`) + UI. No new lock state machine — existing status is the lock; e-sign formalizes the same boundary later.

**Companion to:** DEC-146 (one set registry/shape), DEC-173 (resurface-before-rebuild — the schema already held it), DEC-209 (Duplicate lands on a real draft), DEC-218 (status-as-lock over a premature state machine), DEC-220, DEC-228.

**Evidence:** locallane `92ff10d`; migration `20260602120000_insurance_restoration_set.sql` (flag rename `xactimate_mode → insurance_restoration_mode`; 3 SD helpers replaced; acceptance gate; new `duplicate_fs_estimate`; SD count 44→45). Insurance Restoration taxonomy + CSI plain-name conversion in `lib/desk/trade-sets.ts`; spec `docs/INSURANCE-RESTORATION-TRADE-SET-SPEC.md`.

**Cross-references:** DEC-146, DEC-173, DEC-209, DEC-218, DEC-220, DEC-228.

---

### DEC-230: Estimate Lifecycle — Sent/Viewed Live-Disable (Kept in Enum), Save Respects Selected Status, Accept→Project One-Click Offer, One-Project-Per-Estimate (2026-06-03)

**Status:** Active. Ratified at the Plant 1 Estimate Lifecycle Refinements A+B build (locallane `685624e` + `804f8bd`; Spec-Repo `59f724f`). No migration, no new write path. (Workstream C — drag-and-drop — split to DEC-231.)

**Context:** Sent/Viewed weren't real (nothing sends an estimate yet), yet the Save button silently auto-promoted draft→sent; accept→project lived as a separate manual card. The audit confirmed the conversion seam (`convert_estimate_to_project`), its filing, and its one-per-estimate duplicate guard were ALL already built (6.4a) — B was a surfacing job, not a new build.

**Decision:**
- **(a) Sent/Viewed live-disable, kept in the enum.** Disabled in the picker ("(soon)") until client sending is wired; both stay in the `EstimateStatus` union + column. Live flow: Draft → Accepted/Declined. The real thread (send / print / portal + e-sign) is tracked in DEFERRED-ITEMS.
- **(b) Save respects the selected status.** No more draft→sent auto-promotion (the actual integrity hole).
- **(c) Accept → one-click offer.** At the accept transition (not already linked), the form OFFERS Cancel/Create a project via the existing convert seam, then routes to it. Offers, not silent auto.
- **(d) One project per estimate.** `convert_estimate_to_project` raises if `project_id` set; duplicate resets it; the server raise is the load-bearing guard.

**Companion to:** DEC-229 (the acceptance boundary — Sent/Viewed disable collapses open→Draft; accept→offer fires at the same boundary), DEC-209 (honest navigation), DEC-218 (disabled not half-true), DEC-146 (kept in enum; rode the existing seam), DEC-096, DEC-220, DEC-193 (convert writes original_budget).

**Evidence:** locallane `685624e` (A — status picker disable + Save-promotion removal) + `804f8bd` (B — accept→project offer); Spec-Repo `59f724f` (DEFERRED-ITEMS client-send thread). No migration.

**Cross-references:** DEC-229, DEC-209, DEC-218, DEC-146, DEC-096, DEC-220, DEC-193, DEC-227, DEC-228.

---

### DEC-231: Desk Estimate Drag-and-Drop Reorder — Array-Order Persistence, Draft/Open-Only, One Mechanism Across Both Grammars (2026-06-03)

**Status:** Active. Ratified at the Plant 1 Workstream C build (locallane `72a6f5e`). Split from DEC-230's A+B at the STEP-1 audit (the one large piece — a new interaction + a client dependency).

**Context:** The estimate builder grouped lines by trade (and phase-banded for category_phase) but had no manual reorder. Storage already held order: line order = `line_items` array; group order = `trade_categories_snapshot` category order; both persist through `update_fs_estimate` (snapshot writes gated to open by DEC-229). No new column.

**Decision:**
- **(a) Reorder persists as ARRAY ORDER through the existing path — no migration.** Line reorder rewrites `line_items`; group reorder rewrites the snapshot category order (subcategories travel with their parent).
- **(b) Draft/open-only.** Group reorder server-gated (DEC-229) + UI-gated; line reorder **UI-gated only** — `update_fs_estimate` can't distinguish a reorder from any other line edit, so a line-reorder server gate would have to gate ALL line edits on accepted estimates (deferred as a Pending Doron DECISION: full read-only past acceptance).
- **(c) Within phase bands for category_phase, free for flat — one mechanism.** Per-context `DndContext` makes cross-band/cross-group moves structurally impossible; the same helpers serve both grammars (DEC-146).
- **(d) `@dnd-kit`** — touch-first (Bari is mobile/field); first client runtime dependency beyond the framework; zero vulnerabilities.
- **(e) Opt-in;** the Change Order editor (shared `LineItemEditor`) is unchanged.
- **(f) `line_no` not renumbered** (stays a stable struck-gap address).

**Companion to:** DEC-229, DEC-230, DEC-146 (one mechanism, both grammars), DEC-173 (array order already persisted), DEC-218 (UI-gate + flag the decision over a partial server gate), DEC-154 (iterate on the live mobile surface), DEC-220, DEC-227.

**Evidence:** locallane `72a6f5e`; `lib/desk/estimates.ts` `reorderLineItems` + `reorderSnapshotCategories`; `_components/sortable.tsx`; `scripts/verify-reorder.mjs` (14 checks). Deps `@dnd-kit/core` + `/sortable` + `/utilities` (zero vulns). No migration; no SECURITY-PRACTICES change (no server gate added).

**Cross-references:** DEC-229, DEC-230, DEC-146, DEC-173, DEC-218, DEC-154, DEC-220, DEC-227, DEC-228.

---

### DEC-232: The Permissions / Client-Visibility Model — A Dial Per Section (Owner Decides), Three-Layer Defaults, Subsume Not Parallel (2026-06-04)

**Status:** Active. Ratified at the Plant 1 Permissions Section v1 build (locallane `d5613c1` + `1576fc7`; migration `20260604120000`). v1 = the Client tab on the estimate edit surface; Workers/Subs/Vendors greyed "coming."

**Context:** The estimate needed a "who sees what" control. The footer carried one coarse `show_cost_breakdown_to_client` boolean (the DEC-220 seam) + two arrangement toggles. The plan reframed visibility as a named, reusable Permissions section — a dial per section, a tab per viewer; the verify-first read confirmed only the cost boolean was a *visibility* flag (the other two are *layout*), and `field_service_profiles` is the owner-level store.

**Decision:**
- **(a)** A dial per section; the owner decides; a tab per viewer (Client built; Workers/Subs/Vendors derive from People/selection later).
- **(b)** Safe defaults (SHIP layer): money/cost OFF, client-facing ON.
- **(c)** Internal notes NOT dialable — a fixed "— never" row (the hard membrane).
- **(d)** Three-layer stack SHIP → owner-saved (`field_service_profiles.default_client_visibility`) → per-estimate (`fs_estimates.client_visibility`), one merge helper `getClientVisibility()` (mirrors `getFeatures`, DEC-194).
- **(e)** Per-estimate stores the COMPLETE resolved object (a later owner-default change doesn't mutate existing estimates).
- **(f) Subsume, not parallel:** `show_cost_breakdown_to_client` → the `fee_overhead` dial (backfilled; old column superseded-not-dropped per DEC-218; `financials.ts` repointed, prior default preserved).
- **(g)** Arrangement (`group_by_trade`, `insurance_restoration_mode`) stays out — visibility ≠ layout.
- **(h)** Payments/Photos omitted (project-level; plant on the Project-surface Permissions section).
- **(i)** No client render here; "Preview as client" disabled "coming" (the dials are settings the future render reads).

**Companion to:** DEC-203 (the inside/outside membrane), DEC-194 (one jsonb shape per concern — the `getFeatures` pattern mirrored), DEC-220 (per-line Cost/Variance stays contractor-only — the resolver invariant the subsume preserves), DEC-218 (column superseded, not dropped), DEC-146, DEC-173, DEC-229, DEC-227, DEC-228.

**Evidence:** locallane `d5613c1` + `1576fc7`; migration `20260604120000_client_visibility_dials.sql` (two jsonb columns + subsume-backfill + owner-default SD helper + three estimate helpers re-issued; SD count 45→46). `lib/desk/estimates.ts` `ClientVisibility`/`CLIENT_VISIBILITY_DEFAULTS`/`getClientVisibility`; `financials.ts` repoint; `_components/permissions-section.tsx`; probe `verify-client-visibility.mjs` green.

**Cross-references:** DEC-203, DEC-194, DEC-220, DEC-218, DEC-146, DEC-173, DEC-229, DEC-227, DEC-228.

---

### DEC-233: Business Identity as One Source of Truth — Private 1:1 Table, Public/Private Split at the Table Boundary; + the Per-Industry Legal-Pass Principle (2026-06-06)

**Status:** Active. Ratified at the Plant 1 Assembler Foundation build (locallane `d441a2d`; migrations `20260606120000_business_identity` + `20260606130000_storage_branding`, applied to remote).

**Context:** The Assembler (estimate → client document) needs a letterhead `businesses` never held — legal name distinct from display, address/phone/email/tax_id/EIN/structure, and a license-ish field (the dormant `field_service_profiles.license_number`). Verify-first surfaced a privacy fact: the planned anon Directory read on `businesses` (Postgres RLS is row-level, not column-level) would expose every column of `businesses` to the public — so legal identity cannot live there.

**Decision:**
- **(a) One source of truth** — each identity fact lives once (DEC-146).
- **(b) Public/private line at the TABLE boundary.** Public face stays on `public.businesses` (name/tagline/category/subdomain + new `logo_path`); private legal identity on a NEW 1:1 `public.business_identity` (legal_name, address, phone, email, tax_id, business_structure, regulatory_license) — member-read, owner-write, **NO anon grant**. A separate private table keeps legal data structurally unreachable by the future anon Directory read.
- **(c) `legal_name` distinct from the display name** (the letterhead falls back to `businesses.name`).
- **(d) Owner-gated SD write** `upsert_business_identity` (auth.uid()+is_business_owner; full-replace; audit-logs `business_id` only — tax_id/EIN never logged).
- **(e) The regulatory license is optional, single-value, industry-neutral; the TEMPLATE supplies the label.** Relocated from the dormant `field_service_profiles.license_number` (backfill-then-drop, DEC-218).
- **(f) Logo on `businesses`** (public-safe `logo_path`); first Supabase Storage in Plant 1 — a private `branding` bucket with owner/member `storage.objects` RLS keyed on the path's business id.
- **(g) Per-industry legal-pass principle:** one signing/render engine, many per-industry templates; each new industry's templates need their own legal-research pass before they ship (construction/CCB done; others not).

**Companion to:** DEC-203 (two-world made structural at the schema layer), DEC-146 (one source of truth), DEC-139 (server-authoritative writes), DEC-224/225 (grants), DEC-218 (no vestigial column), DEC-227, DEC-228, DEC-232 (the *visibility* half of the Assembler — this is the *identity* half).

**Evidence:** locallane `d441a2d`; migrations `20260606120000_business_identity.sql` + `20260606130000_storage_branding.sql` (applied to remote, exit 0). New `business_identity` table + `upsert_business_identity` SD helper + private `branding` bucket + `businesses.logo_path`; "Business Identity & Letterhead" card on the business Profile page (`app/(authenticated)/businesses/[id]/profile/`).

**Cross-references:** DEC-203, DEC-146, DEC-139, DEC-224, DEC-225, DEC-218, DEC-227, DEC-228, DEC-232.

---

### DEC-234: Assembler Core Render — the Estimate as the Branded Client Document; Route-Agnostic Engine + Snapshot-on-Send (2026-06-06)

**Status:** Active. Ratified at the Plant 1 Assembler Phase core-render build (locallane `dc4cc92`; migration `20260606140000_assembler_send_document.sql`, applied to remote).

**Context:** On top of the Foundation (DEC-233 letterhead + logo) and the dials (DEC-232), this is the *render* — the estimate assembled into the client-facing document — plus the snapshot that freezes a copy on send. The dormant 6.1 `fs_documents` e-sign columns (`content`/`merge_data`/`signature_token`/`signed_at`/`template_id`) absorb the snapshot: one SD helper, no table/column change.

**Decision:**
- **(a) One document, four deliveries, one engine.** A single inline-styled `ClientDocument` drives the on-screen preview, the snapshot HTML, the future PDF + email; it renders as a white printed-paper document, not the dark app theme.
- **(b) Route-agnostic engine; the route is a thin mount.** `assembleClientDocument` (pure) + `ClientDocument` + loader + `send_estimate_document` (RPC) know nothing about where they're mounted; v1 mounts at the estimate-scoped `/desk/estimates/[id]/document`. A future Assembler business-container peer tile reuses the engine + RPC with zero changes — the only coupling is to "an estimate" as the data source (data, not navigation).
- **(c) The dials govern the render; the client never sees the dials.** Each section shows/hides per `client_visibility` via `getClientVisibility()` (the `fee_overhead` dial — DEC-232). The scope-of-work band ALWAYS renders; internal notes never.
- **(d) Recompute, never trust stored.** Totals via `computeSummary()`; groups via `groupLinesByTrade()`; client from `fs_clients`. Tax line only when `> 0` (Oregon has none); license only if present.
- **(e) No LocalLane branding** — the document is wholly the contractor's (DEC-203 made literal on the letterhead).
- **(f) Snapshot-on-send (soft-freeze).** `send_estimate_document` writes one non-sealed `fs_documents` row per estimate (a `signed` row is never overwritten) — `content` + `merge_data` + status='sent', logo inlined as a data-URI (self-contained, no expiring URL), estimate marked draft→sent + `sent_at`.
- **(g) Scope boundary v1 = render + snapshot-on-send.** The e-sign signing flow (the in-document Accept/Sign button is staged "coming"), email/Resend delivery, and the client portal route are the next arc.

**Companion to:** DEC-233 (the identity half — the letterhead this reads), DEC-232 (the visibility half — the dials this honors), DEC-203 (two-world — soft-freeze + membrane), DEC-213 (documents live where used — estimate_id context + has-context CHECK), DEC-146 (one engine, recompute through shared helpers), DEC-209 (the "Preview as client" button now lands), DEC-163 (template_id legitimately null — rendered-from-estimate), DEC-139, DEC-224/225, DEC-227, DEC-228.

**Evidence:** locallane `dc4cc92` (`lib/desk/client-document.ts` + `client-document-source.ts` + `components/desk/client-document.tsx` + `_actions/send-estimate-document.tsx` + the `[estimateId]/document/` route + entry-point edits to the estimate edit page / form / permissions section); migration `20260606140000_assembler_send_document.sql` (one SD helper; no table/column/GRANT change; SD count 46→47). The same commit carries Part 1 (identity-card polish). tsc + next lint + next build clean.

**Cross-references:** DEC-233, DEC-232, DEC-203, DEC-213, DEC-146, DEC-209, DEC-163, DEC-139, DEC-224, DEC-225, DEC-227, DEC-228.

---

### DEC-235: Assembler Server-Side PDF — the Estimate's Clean PDF via PDFShift (Rented Hosted Chromium) Behind a Route-Agnostic Engine Boundary; the Route's Read Path (2026-06-08)

**Status:** Active. Ratified at the Plant 1 server-side PDF build (locallane `4e6cf35` + one-page compactness `3cb350b`, merged to `main` at `91b2db2`); live-in-sandbox on Vercel production (`PDFSHIFT_API_KEY` + `PDFSHIFT_SANDBOX=true` — watermarked, free, real credits not yet flowing).

**Context:** The render's last mile (DEC-234 → this). The only way to get the client document out was `window.print()`, which leaked the LocalLane wordmark. Hyphae's verify-first audit was GREEN on route/vendor wiring, YELLOW on the document's print-CSS — so print-CSS came first.

**Decision:**
- **(a) Server-side PDF by rendering the frozen `fs_documents.content` through PDFShift** — rented hosted Chromium (`POST /v3/convert/pdf`, `X-API-Key`, `format: Letter`, `use_print: true`, bytes inline). NOT `@react-pdf/renderer` (drift from the signed copy), NOT in-function Chromium (Vercel ~50MB). Rent-first; Gotenberg is a later swap.
- **(b) Engine behind a route-agnostic boundary.** A GET Route Handler at `…/document/pdf` (not a Server Action — returns a real downloadable file) takes `(businessId, estimateId)`; swapping the vendor touches only the engine call. Node runtime.
- **(c) Read path — sealed-when-sent, live-render-when-not.** For a sent estimate it returns the frozen `content` verbatim (seal parity); for an unsent one it live-renders the same HTML (shared `lib/desk/client-document-html`). Snapshot discriminator: `estimate_id` set AND `project_id IS NULL` AND `content IS NOT NULL` (excludes project link-doc rows).
- **(d) Filename app-side from `estimate_number`** (already `EST-YYYY-NNN` → the route composes nothing).
- **(e) Print-CSS first.** `break-inside: avoid` on trade groups / rows / totals / signature; `@page { size: Letter; margin: 0.5in 0 }` (document owns horizontal insets, `@page` owns vertical — resolves the doc-vs-printable collision); print-color-adjust exact. One-page compactness (`3cb350b`) tightened the vertical rhythm so a short estimate fits one page; long estimates still break cleanly.
- **(f) Don't ship the wordmark leak.** The dedicated route renders only the bare document; `print:hidden` on the ShellHeader + Desk chrome + a global `@media print` keep Ctrl-P clean too. Primary control = PDF download; `window.print()` a clean secondary.
- **(g) Graceful + capped.** `PDFSHIFT_API_KEY` unset → a clean 503; a 4.5MB response-cap guard (storage-URL fallback deferred — no docs bucket). `sandbox` defaults on outside production.
- **(h) Scope = render only.** E-sign signing, Resend email, the client portal are the next arc; the route is kept structured to read the signed row + POST under a service-role context when e-sign lands.

**Companion to:** DEC-234 (the render + snapshot this exports), DEC-233, DEC-232, DEC-203 (the engine is plumbing; the sealed copy crosses to the client), DEC-213, DEC-146 (one engine / one HTML shell), DEC-209, DEC-218, DEC-224/225 (no schema/grant change — a read path), DEC-227.

**Evidence:** locallane `4e6cf35` (route + `lib/desk/client-document-html.tsx` + print-CSS + leak fix) + `3cb350b` (one-page compactness), merged `91b2db2`. No migration (read path). Verified tsc/lint/build clean + the real engine→component→shell pipeline asserted in Chromium (42 break-inside elements, `@page` Letter, gray band, no LocalLane branding); adversarially reviewed. Live-in-sandbox; the watermarked-off flip is gated on a long-estimate walk. Mirrored from Spec-Repo `platform/DECISIONS-200-249.md` per DEC-182.

**Cross-references:** DEC-234, DEC-233, DEC-232, DEC-203, DEC-213, DEC-146, DEC-209, DEC-218, DEC-224, DEC-225, DEC-227, DEC-228.

---
