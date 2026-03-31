# PROJECT-BRAIN.md

> Read this first. This file orients any AI model — Claude, Gemini, GPT, or other — to work effectively on LocalLane. It is the single source of truth for project identity, philosophy, and working style.
> Last updated: 2026-03-31

---

## What Is LocalLane

LocalLane is a community-first platform serving Eugene/Springfield, Oregon that connects local businesses with families. The core offering is a business directory, events platform, and network membership system called Community Pass. The platform operates under a philosophy of "circulation over extraction" — community health comes from money and attention flowing between local people, not being siphoned by algorithms or ad platforms.

The live app is at locallane.app, built on Base44 backend with React/Vite/Tailwind frontend. GitHub repos are managed through GitHub Desktop with auto-deployment through Base44's system.

## The Organism Concept

LocalLane's north star. The platform functions as a living entity that reflects community health. Three fractal layers: personal creatures (individual vitality), network organisms (group health), and the overarching community organism. The Lane Avatar is a mushroom — connecting to Eugene's annual mushroom festival and representing the mycelial network that connects everything underground.

This isn't decoration. It's the design principle: every feature should make the Organism more alive by generating participation data, strengthening connections, or reflecting community vitality.

## Circulation Over Extraction

The foundational philosophy. Users earn visibility through community engagement, not paid promotion. Revenue sharing flows to businesses based on actual participation. Joy Coins (the platform's engagement currency) reward real community activity. No ads. No algorithmic manipulation. No pay-to-play.

## Dark Until Explored (DEC-117)

The app only illuminates what the user has entered through. Everything else exists but stays dark — not locked, not hidden, just quiet. Features light up through real connections and organic discovery. Spaces dim when unused but never turn off. The organism remembers. Entry point determines first lit room.

## Two Modes (DEC-120)

Auto mode (Mylane-driven, conversational) and Manual mode (full topology, user navigates). Organic gradient between them based on usage patterns. No toggle — the organism learns your preferred mode.

## Subdomain-as-Hypha (DEC-121)

Workspaces start as seeds inside LocalLane. Seeds that grow earn their own subdomain. Seeds that outgrow LocalLane can become independent platforms. The organism doesn't lose an arm — it grows one strong enough to reach independently.

## The Organism is the Relationship (DEC-123)

Parent-player links, contractor-client links, tenant-owner links — each relationship is a hypha. The organism's growth is the accumulation of these connections. Proximity is computed from existing relationships, not stored. The mycelium doesn't need its own database — it IS the connections between existing records.

*"The organism is the relationship in between." — Doron, 2026-03-30*

## Pricing as Circulation (DEC-125)

Charge only for features that help people make money or for advanced AI that acts on your behalf. Everything else is free. The free layer is circulation — people forming connections, the mycelium growing. A visible price gauge shows real-time usage. Pricing breathes with the dimming — unused features cost nothing. "The organism is honest about what it costs."

## Communication as Frequency (DEC-126)

How you interact with the organism IS your frequency. The organism learns it and carries it forward — through messaging, through your creature, through how Mylane represents you. Every generation of communication has lost more of the person. The organism carries more, not less.

## Conductor-per-User

Each user has Mylane as their personal conductor. Mylane routes to specialized space agents (PlaymakerAgent, HarvestAgent, etc.) in the background. The user only talks to Mylane. The conductor learns your frequency over time.

*"We can insert our frequency into the app through the way we interact and present ourselves." — Doron, 2026-03-31*

## Who Is Doron

Doron Fletcher is the founder, visionary, and decision-maker. Background in accounting and economics. Previously built Bomb Squad Growers to international recognition before losing it overnight. Now approaches development as a "gardener of life."

How Doron works:
- Communicates in goals and outcomes, not technical specifications
- Tests in the browser, reports results with screenshots
- Values directness, efficiency, and honesty
- Wants the best idea, not agreement — push back when something is wrong
- Thinks fractally: "what is true of the part is true of the whole"
- Is NOT an engineer — never ask him to write code or understand implementation details

The AI assistants in this project are Mycelia (Claude chat — strategist) and Hyphae (Claude Code — builder). Together with Doron, they are co-gardeners tending the Organism.

## Decision Filter

Before suggesting or building anything, ask three questions:
1. Does this help a real person right now?
2. Does this make the Organism more alive?
3. Does this move money closer to flowing?

If none of the above: defer unless Doron specifically asks.

## Revenue Model

Community Pass is a membership subscription with four network passes:
- Recess (movement)
- Creative Alliance (learning)
- Harvest Network (local food)
- Gathering Circle (social events)

Business tiers: Basic (free), Standard ($79/mo), Partner ($149/mo). Currently in pre-launch with founding member rates. Revenue comes from business subscriptions and Community Pass memberships. Joy Coins are the engagement currency — not stored value (Oregon money transmitter laws prevent that).

Stripe Connect handles payment processing. Revenue share flows to businesses based on participation.

## Key People

- **Dan Sikes** — Contractor, field testing Contractor Daily (Build 17 complete). The original "find the Dan" principle: every node needs a named real person who will test it.
- **Doron's children** — Thoughtful sounding boards who challenge his thinking. His boys are the real users for Play Trainer (team workspace).
- **Family members** — Involved in Property Pulse (family property management).
- **Peter** — Elite Auto Tech N Tow, Eugene. Potential second vertical for Field Service Engine.
- **Hayley** — Lane County Farmers Market Executive Director. Relationship building in progress.
- **Randy** — Head coordinator of Grab It NFL FLAG in Eugene. Met 2026-03-30. League-wide Playmaker sponsorship opportunity.

## The Node Lab Model (DEC-047)

Nodes (Contractor Daily, Property Pulse, etc.) are independent apps with real users. They do NOT sync with the Community Node during the lab phase. A node integrates into LocalLane only after proving maturity: real users depend on it, data model is stable, role system is tested, UX has been iterated with field feedback.

## Research-First Principle (DEC-048)

Before building any new node or major feature: find the real person who needs it, research their actual workflow, compare against what already exists, only spec and build if a genuine gap exists.

## Build Protocol

All features ship through a 16-phase sequence (Phases 0-15): Decision Filter → Plan → Scheme → Surface Mapping → UI/UX Design → Pre-Build Audit → Security → Build → Construction Gate → Tier Gating → Polish → Post-Build Audit → Documentation → Legal Check → Organism Signal → Space Agent.

Reference BUILD-PROTOCOL.md for the full protocol. Don't skip phases.

## Superagent Architecture

Base44 Superagents are the organism's nervous system. Each space in the garden gets its own agent — an AI assistant that reads the space's entity data, answers user questions, provides workspace guidance, searches the directory, looks up external information via web search, and collects feedback through the ServiceFeedback entity.

Architecture: One agent per space. Chat UI is a reusable AgentChat component with `agentName` prop. Voice input via browser SpeechRecognition API. Conversations persist across page navigations. Agents are READ-ONLY on workspace entities (except ServiceFeedback for feedback capture). Each agent has memory (Global + Per User for space agents, Global Only for Admin).

### Live Agents (as of 2026-03-29)

| Agent | Space | Organ | Entities | Memory | Commit |
|-------|-------|-------|----------|--------|--------|
| FieldServiceAgent | Field Service | Hands | 15+ FS entities | Global + Per User | Original (2026-03-27) |
| PlaymakerAgent | Team | Coordination | 9 team entities | Global + Per User | 9f250f5 |
| AdminAgent | Admin | Self-awareness | 34 entities (all) | Global Only | 4a719a6 |
| FinanceAgent | Finance | Circulatory system | 6 finance entities | Global + Per User | 6721aaa |
| PropertyPulseAgent | Property Mgmt | Skeleton | 13 PM entities | Global + Per User | 3db454b |
| Mylane | Conductor | Living surface | 29 entities (all workspaces) | Per User Only | 664d987 |

Planned agents: HarvestAgent, RecessAgent, CreativeAgent, FrequencyAgent (as spaces mature). Layer 2 internal agents: Conductor, Research/AI Scout, Marketing, Content, Bookkeeper, Community Pulse (specced in ORGANISM-AGENT-TEAM.md).

### Data Scoping (DEC-107)

All agents (except AdminAgent) query data through the `agentScopedQuery` server function instead of raw entity reads. The function takes user_id + workspace type + entity name, finds the user's workspace profile, and returns only records belonging to that workspace. This is the organism's permission membrane — each nerve ending feels only its own garden. Reference AGENT-SCOPED-QUERY-SPEC.md (private repo).

### Mylane — The Conductor Space (DEC-105)

Mylane is the organism's living surface and Conductor. She is a space with her own agent, entity (MyLaneProfile), and memory (Per User Only). She renders interactive cards from all active workspaces via the Component Registry pattern (DEC-106, myLaneRegistry.js). Cards reorder organically based on user interaction (useMyLaneState.js). Time-aware urgency shifts card colors when data needs attention. WhatsChangedBar whispers entity changes since last visit. She does not speak unless spoken to.

Phases 1-4 shipped (admin beta). Phase 1: card grid + drill-through. Phase 2: docked AgentChat conversation panel. Phase 3: organic card reordering + time awareness. Phase 4: WhatsChangedBar whisper. Reference MYLANE-CONDUCTOR-SPEC.md (private repo).

Credit model: Agent messages cost ~3+ integration credits each. Business spaces: $9/month workspace + optional $18/month for full agent partner (first month included). Community spaces: agent included at no cost.

**Protocol rule (DEC-103):** When any entity, field, or feature changes in a space that has a superagent, update the agent's instructions to reflect the change. The agent must know its own garden.

Reference SUPERAGENT-SPEC.md (private repo) for birth protocol, growth model, organ identities, and tier model.

The fractal: what's true of one space's agent is true of all spaces' agents. Same UI, same feedback entity, same voice input, different instructions and entity access.

## The Gold Standard Design System

Dark theme only. No light backgrounds. Amber/gold accent color (amber-500). Icons are gold or white only. No functional color-coding (no red hearts, green checkmarks). Premium, not generic.

Key values:
- Page background: bg-slate-950
- Cards/surfaces: bg-slate-900
- Primary accent: bg-amber-500 (hover: amber-400, active: amber-600)
- Primary text: text-white or text-slate-100
- Secondary text: text-slate-300
- On gold backgrounds: text-black

Reference STYLE-GUIDE.md for complete patterns and component specifications.

## Technical Stack

- **Backend:** Base44 platform
- **Frontend:** React, Vite, Tailwind CSS
- **Hosting/Deploy:** Base44 auto-deploys from GitHub
- **Payments:** Stripe Connect
- **Email:** IONOS (hello@locallane.app)
- **Version Control:** GitHub Desktop
- **AI Tools:** Claude.ai / Mycelia (strategy/planning), Claude Code / Hyphae (primary coding agent), OpenCode (backup coding agent with Gemini/GPT), Cursor IDE (visual editing)
- **Memory Bridge:** SuperMemory MCP connector across all surfaces
- **Organism Bridge:** Mycelia MCP Server on Cloudflare Workers (DEC-099) -- connects all Claude surfaces to Base44 via MCP protocol

### Organism Identity

Three gardeners tend the LocalLane organism:
- **Doron** — Visionary and decision-maker. Describes goals, tests in browser, makes final calls.
- **Mycelia** (Claude chat) — Strategist and network mind. Planning, spec writing, prompt generation, context continuity.
- **Hyphae** (Claude Code) — Builder and growing edge. Codebase-aware implementation, audits, multi-file changes.

The Lane Avatar is a mushroom. Mycelium is the connective network (Mycelia). Hyphae are the growing tips that build new structure (Hyphae). The organism is tended by all three together.

## Cursor Prompt Format

When generating prompts for Cursor or Claude Code, use this format:

```
GOAL: [What should be true after]
WHERE: [File path(s)]
[Instructions — numbered steps or FIND/REPLACE]
CONSTRAINTS:
- [What NOT to change]
- Git commit message: "[message]"
```

One continuous copy-paste block. No extra explanation around it. No markdown code fences around structural content (tree diagrams, markdown). Only use code fences when the content IS code (.jsx, .css, etc.).

## Time-Sensitive Context

- Custody trial: 2026-05-19. Revenue and stable employment urgently needed before this date.
- MYCELIA, LLC filed as legal entity.
- Saturday Market outreach active (spring season).
- Aegis Asphalt fractional operations role applied for.

## File Map

Key files to read before working:

| File | What It Contains |
|------|-----------------|
| context/ACTIVE-CONTEXT.md | What's happening RIGHT NOW — current builds, blockers, priorities |
| context/SESSION-LOG.md | Running timeline of what shipped and when |
| BUILD-PROTOCOL.md | The 16-phase build sequence (Phases 0-15) |
| STYLE-GUIDE.md | Gold Standard design system — colors, components, patterns |
| ARCHITECTURE.md | Technical patterns, node architecture, Base44 patterns |
| DECISIONS.md | All numbered decisions and their rationale |
| .cursorrules | Component patterns and coding conventions |
| STATUS-TRACKER.md | Comprehensive project status with session logs |
| SEEDLING-TRACKER.md | All nodes, contacts, and growth status |
| LAUNCH-CHECKLIST.md | Pre-pilot checklist items |

Private repo (sensitive strategy):
- NODE-LAB-MODEL.md — When to build vs wait
- NODE-PLAYBOOK.md — Field testing SOP
- ORGANISM-CONCEPT.md — North star vision document
- COMMUNITY-PASS.md — Membership model details

---

*This file is maintained in spec-repo/context/ and read by all AI surfaces. Update it when foundational project facts change — not for session-level updates (those go in ACTIVE-CONTEXT.md and SESSION-LOG.md).*
