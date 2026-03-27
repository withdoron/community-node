# PROJECT-BRAIN.md

> Read this first. This file orients any AI model — Claude, Gemini, GPT, or other — to work effectively on LocalLane. It is the single source of truth for project identity, philosophy, and working style.
> Last updated: 2026-03-27

---

## What Is LocalLane

LocalLane is a community-first platform serving Eugene/Springfield, Oregon that connects local businesses with families. The core offering is a business directory, events platform, and network membership system called Community Pass. The platform operates under a philosophy of "circulation over extraction" — community health comes from money and attention flowing between local people, not being siphoned by algorithms or ad platforms.

The live app is at locallane.app, built on Base44 backend with React/Vite/Tailwind frontend. GitHub repos are managed through GitHub Desktop with auto-deployment through Base44's system.

## The Organism Concept

LocalLane's north star. The platform functions as a living entity that reflects community health. Three fractal layers: personal creatures (individual vitality), network organisms (group health), and the overarching community organism. The Lane Avatar is a mushroom — connecting to Eugene's annual mushroom festival and representing the mycelial network that connects everything underground.

This isn't decoration. It's the design principle: every feature should make the Organism more alive by generating participation data, strengthening connections, or reflecting community vitality.

## Circulation Over Extraction

The foundational philosophy. Users earn visibility through community engagement, not paid promotion. Revenue sharing flows to businesses based on actual participation. Joy Coins (the platform's engagement currency) reward real community activity. No ads. No algorithmic manipulation. No pay-to-play.

## Who Is Doron

Doron Fletcher is the founder, visionary, and decision-maker. Background in accounting and economics. Previously built Bomb Squad Growers to international recognition before losing it overnight. Now approaches development as a "gardener of life."

How Doron works:
- Communicates in goals and outcomes, not technical specifications
- Tests in the browser, reports results with screenshots
- Values directness, efficiency, and honesty
- Wants the best idea, not agreement — push back when something is wrong
- Thinks fractally: "what is true of the part is true of the whole"
- Is NOT an engineer — never ask him to write code or understand implementation details

The AI assistant in this project is nicknamed "Mycelia" — together with Doron, they are co-gardeners tending the Organism.

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

## The Node Lab Model (DEC-047)

Nodes (Contractor Daily, Property Pulse, etc.) are independent apps with real users. They do NOT sync with the Community Node during the lab phase. A node integrates into LocalLane only after proving maturity: real users depend on it, data model is stable, role system is tested, UX has been iterated with field feedback.

## Research-First Principle (DEC-048)

Before building any new node or major feature: find the real person who needs it, research their actual workflow, compare against what already exists, only spec and build if a genuine gap exists.

## Build Protocol

All features ship through a 16-phase sequence (Phases 0-15): Decision Filter → Plan → Scheme → Surface Mapping → UI/UX Design → Pre-Build Audit → Security → Build → Construction Gate → Tier Gating → Polish → Post-Build Audit → Documentation → Legal Check → Organism Signal → Space Agent.

Reference BUILD-PROTOCOL.md for the full protocol. Don't skip phases.

## Superagent Architecture

Base44 Superagents are the organism's nervous system. Each space in the garden gets its own agent — an AI assistant that reads the space's entity data, answers user questions, provides workspace guidance, searches the directory, looks up external information via web search, and collects feedback through the ServiceFeedback entity.

Architecture: One agent per space. Agent config lives in `agents/` directory as JSON. Chat UI is a reusable AgentChat component with `agentName` prop. Voice input via browser SpeechRecognition API. Conversations persist across page navigations. Agents are READ-ONLY on workspace entities (except ServiceFeedback for feedback capture).

Credit model: Agent messages cost ~3+ integration credits each. Internal operations (entity reads, directory lookups) are cheaper than external operations (web search). Heavy agent users may incur a surcharge on top of the $9 workspace fee.

First agent: FieldServiceAgent (shipped 2026-03-27). Reads all FS entities, web search for permit lookups, ServiceFeedback for user feedback. Live on all Field Service tabs with floating chat button and push-to-talk voice.

Planned agents: HarvestAgent, RecessAgent, CreativeAgent, PropertyAgent, MyCeliaAdmin (platform-level agent for the gardener).

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
- **AI Tools:** Claude.ai (strategy/planning), Claude Code (primary coding agent), OpenCode (backup coding agent with Gemini/GPT), Cursor IDE (visual editing)
- **Memory Bridge:** SuperMemory MCP connector across all surfaces

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
