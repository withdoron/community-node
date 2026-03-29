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
