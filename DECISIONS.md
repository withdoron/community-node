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
**Status:** Active — must ship before Randy league rollout

---

### DEC-131: MyLane Spinner Navigation (2026-04-01)

**Date:** 2026-04-01
**Context:** Card grid navigation doesn't give the app identity or handle workspace growth. After two rounds of Hyphae consultation and mockup design sessions.
**Decision:** Replace card grid with horizontal gallery-style spinner (SpaceSpinner). Home has tabbed vertical spinner (Attention | This week | Spaces). BusinessDashboard retired — business workspace renders through MyLaneDrillView. Artwork mockups mandatory in BUILD-PROTOCOL Phase 4.
**Rationale:** Spinner gives distinct identity, handles growth, embodies Dark Until Explored, enables future auto-mode.
**Status:** Active — built

---

### DEC-132: Semantic Tailwind Migration Rule (2026-04-02)

**Date:** 2026-04-02
**Context:** Theme propagation shipped — 146 lines of CSS override 2,870 Tailwind utility classes across 35 workspace files. This works but uses !important on every override. The clean long-term solution is for workspace components to use semantic Tailwind classes (bg-card, text-foreground) that resolve through CSS variables, not hardcoded classes (bg-slate-900, text-white) that require override layers.
**Decision:** When modifying any workspace file for any reason, convert hardcoded color classes to semantic equivalents before committing. Don't do a bulk migration — let it happen organically as files are touched. This way every file gets gradually cleaner without a risky big-bang rewrite.
**Rationale:** The !important override layer works but is fragile. Each workspace file touched for features gets one step closer to clean theming. Organic migration > risky bulk rewrite.
**Status:** Active — ongoing

---

### DEC-136: Creator Only as Default Entity Permission (2026-04-04)

**Date:** 2026-04-04
**Context:** Full audit found FSClient, FSDocument, FSEstimate had public read, exposing PII and portal tokens. 6 Critical issues, 3 were entity permission holes.
**Decision:** Entity permissions default to Creator Only. Server functions with `asServiceRole` handle authorized cross-user access. Entity-level permissions are the last line of defense. New entities start Creator Only and open up only with explicit justification.
**Status:** Active — 9 entities locked down

---

### DEC-137: Feedback Flows Through Companion (2026-04-04)

**Date:** 2026-04-04
**Context:** Two parallel feedback systems (FeedbackLog + ServiceFeedback). Bari's 14+ feedback items were verbal, never reached data layer.
**Decision:** All feedback flows through MyLane companion. "Have feedback?" chip on all 8 space positions. ServiceFeedback is the sole entity. No confirmation card for feedback — effortless, not bureaucratic. FeedbackLog retired.
**Status:** Active — floating button removed, ServiceFeedback is sole path

---

### DEC-138: Founding Gardener — Earned Status, Not Signup Bonus (2026-04-04)

**Date:** 2026-04-04
**Context:** platformPulse gardener observation revealed 22 users, 6 active, 16 dormant. Engagement highly concentrated.
**Decision:** Founding Gardener is earned, not given. Weighted score: spaces (10), feedback (5), weeks active (3), content (2), participation (1). Personally assigned by Doron. Mycelia observes via gardener pulse; Doron observes from the field.
**Status:** Active — gardener observation live via MCP

---

### DEC-139: Server-Authoritative Identity on Agent Writes (2026-04-05)

**Date:** 2026-04-05
**Context:** MyLane agent wrote `user_id: "special-user"` as literal string into MylaneNote. LLM interpreted instruction as placeholder token. Record persisted but invisible (query by real user_id found nothing).
**Decision:** Identity fields (`user_id`, `owner_id`) are set exclusively by agentScopedWrite from server-resolved auth context. Null-check guard removed — server always wins. Query/write asymmetry: queries need user_id for scoping, writes forbid it.
**Cross-references:** Extends DEC-115 (three-gate enforcement) with identity stamping gate. Complements DEC-136 (Creator Only permissions).
**Affected:** ServiceFeedback, Recommendation, MylaneNote, plus `workspace === 'platform'` catch-all.
**Status:** Active — shipped, pending Base44 publish

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
**Context:** Frequency Station audit revealed: FrequencyProvider mounted inside MyLane (audio dies on navigation), page components ran their own `<audio>` elements (three players fighting), no MediaSession API (no lock-screen controls), no persistent mini-player. Status and mood taxonomies diverged between spec and code.
**Decision:** Three changes:
1. **Pip-Boy Radio model:** FrequencyProvider lifted to App.jsx root (wraps all routes). Single `<audio playsInline>` element. Page components are pure UI — read state from `useFrequency()`, no local audio tags. Persistent floating mini-player at bottom of every screen. MediaSession API for lock-screen controls (play/pause/skip/seekto). localStorage persists current song + position.
2. **Canonicalized taxonomies (code wins):** Mood tags: `fire, water, earth, air, storm, custom` (elemental, not emotional). Status lifecycle: `submitted, in_progress, released, archived` (matches code, not spec's longer list). Spec updated to match.
3. **FrequencyArtist confirmed as real entity** for Build 2 (not just a "future possibility seed"). Artist-scoped library, `artist_id` on FrequencySong, and song creation form are the next build after Pip-Boy radio lands.
**Cross-references:** Updates FREQUENCY-STATION-SPEC.md (private). Extends DEC-102 (Creative Engine).
**Status:** Active — Build 1 shipped

---

### DEC-143: Frequency Station Build 2 — Studio, Library, Ownership Model (2026-04-10)

**Date:** 2026-04-10
**Context:** Build 1 shipped the radio (background playback, MediaSession, mini-player). Build 2 adds the studio: ownership, library, rich submissions, and admin transform workflow.
**Decision:** Five architectural changes:
1. **Ownership model:** `owner_user_id` and `is_public` on FrequencySong. Every song has an owner. Owner toggles public/private. Listen tab shows only `is_public === true`. My Library shows owner's songs.
2. **Submission wizard:** Multi-step form (words → sound → details) collecting title, raw_text, mood (dynamic FrequencyMood entity), style_genre, vocal_style, tempo_feel, reference_artist, dedication. Replaces old single-form SubmitTab.
3. **Admin workbench:** Suno copy-paste boxes (Lyrics + Styles) assembled from submission fields. "Deliver to submitter" creates FrequencySong owned by submitter + FrequencyNotification. Marked as temporary path toward Frequency Agent.
4. **FrequencyArtist entity:** user_id, name, bio, avatar_url. One per user. Created from My Library tab. Used for credit display and lock-screen metadata.
5. **Dynamic FrequencyMood:** Moods loaded from entity (name, icon, color, is_active). No more hardcoded lists.
**New entities:** FrequencyArtist, FrequencyMood, FrequencyNotification.
**New fields on FrequencySong:** owner_user_id, is_public, artist_id, source_submission_id.
**New fields on FSFrequencySubmission:** title, mood_id, style_genre, vocal_style, tempo_feel, reference_artist.
**Cross-references:** Updates FREQUENCY-STATION-SPEC.md (private). Extends DEC-142.
**Status:** Active — Build 2 shipped

---

### DEC-144: Frequency Station RLS Loosening + Client-Side Scoping Pattern (2026-04-10)

**Date:** 2026-04-10
**Context:** FSFrequencySubmission.Read and FrequencyNotification.Read were set to `owner` (RLS: created_by == user.email). Admin workbench couldn't see other users' submissions; notification recipients couldn't read admin-created notifications. FSFrequencySubmission.Update also blocked admin status changes on other users' records.
**Decision:** Three changes:
1. **RLS loosened:** FSFrequencySubmission.Read, FSFrequencySubmission.Update, and FrequencyNotification.Read changed from owner to authenticated.
2. **Client-side scoping enforces isolation:** MySeedsTab filters by `user_id === currentUser.id`. NotificationBell filters by `user_id === currentUser.id`. AdminWorkbench shows all (admin-only tab gated by `isAdmin`).
3. **Base44 agent discussion mode default:** Base44 agent stays in discussion mode by default (extends DEC-093). Action mode only for entity creation, field additions, permission changes, and server function work. Prevents accidental schema drift.
**Rationale:** RLS on cross-user entities blocks core workflows (admin can't manage submissions, recipients can't read notifications). Matches the existing pattern on FrequencySong.Update (No Restrictions for server function compatibility). Trades database-level isolation for application-level isolation. Tighten with dedicated server functions if strict isolation becomes a requirement.
**Cross-references:** Extends DEC-093 (Base44 entity management), DEC-136 (Creator Only default), DEC-140 (same RLS loosening pattern used for team entities).
**Status:** Active

---

### DEC-145: Payload-First Debugging + Single-Owner Hooks + FrequencyLibraryContext Planned (2026-04-11)

**Date:** 2026-04-11
**Context:** Three-layer debug chain on Frequency Station favorites/queue: (1) stale closure theory led to ref-based hook hardening — correct as defensive measure but didn't fix the bug, (2) ERR_CONNECTION_CLOSED traced to duplicate hook instances racing concurrent Base44 creates — fixed by single-owner pattern, (3) FSFrequencyPlaylist 422 traced to `track_ids: '[]'` (string instead of array) — the actual root cause all along. Two hours spent on architecture theories before 10 seconds of payload inspection revealed a type mismatch.
**Decision:** Three changes:
1. **Payload-first debugging rule (extends DEC-141):** When a Base44 entity operation fails (422, 400, ERR_CONNECTION_CLOSED, or silent non-persist), the first diagnostic step is: log the exact payload immediately before `.create()` or `.update()`. Compare every field name, type, and value against the Base44 entity schema. The bug is almost always wrong JS type (string where array expected), wrong field name, or null where string expected. Do not theorize about React state until the payload is confirmed correct.
2. **Single-owner hook pattern:** When a custom hook manages Base44 entity state (CRUD operations), call it in exactly one component (the highest common ancestor). Pass results as props to children. Never instantiate the same hook in a parent and child simultaneously — duplicate instances cause concurrent Base44 writes that trigger ERR_CONNECTION_CLOSED.
3. **FrequencyLibraryContext planned:** The single-owner pattern works but creates prop drilling (10+ props from FrequencyStation to MyLibrary). Next touch of this area should wrap favorites + queue state in a `FrequencyLibraryContext` provider. One provider, any consumer, no prop drilling, no races.
**Cross-references:** Extends DEC-141 (runtime logging before theorizing), DEC-144 (client-side scoping).
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
