# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Any AI surface reads this to know the current state without searching conversation history.
> Last updated: 2026-03-30

---

## Current Phase

Platform live, full nervous system operational. 8 App Agents (6 workspace + Mylane + 2 internal) + 1 Mycelia Superagent (API bridge). MCP v2 deployed with 5 tools. Mylane is a living surface with universal renderer and internal drill-through. ObjectId comparison fix applied to agentScopedQuery.

## What Just Shipped

- MCP v2 (5 tools): pulse, scoped_query, ask_agent (wired to Mycelia Superagent), write_feedback, list_agents — deployed at locallane-mcp.doron-bsg.workers.dev/mcp
- Mycelia Superagent: Base44 Superagent (not App Agent) with full REST API access. 7 knowledge files, GitHub connected, memory seeded. The bridge between Claude.ai Mycelia and the organism.
- Universal renderer (renderEntityView.jsx): 280 lines, field type detection, 30 entity title mappings, 15 status colors, three display modes
- Mylane internal rendering (MyLaneDrillView.jsx): workspace tabs render INSIDE Mylane, user never leaves, breadcrumb navigation
- Renderer Agent + Scout Agent: 7th and 8th superagents created in Base44 (visual cortex + immune system)
- Full Mylane/Renderer audit: 4 bugs fixed (owner_id vs user_id, tab aliases, missing title mappings, missing status colors)
- ObjectId comparison fix: idMatch() helper with String() coercion applied to all 5 comparison points in agentScopedQuery

## What's In Flight

- MCP circuit testing from Claude Desktop (ask_agent → Mycelia Superagent → organism)
- SuperMemory bearer token connection for Mycelia Superagent (deferred — needs API key)
- Coaches card for Monday 6:30 PM meeting

## Active Nodes

| Node | Status | Current Build | What's Next |
|------|--------|--------------|-------------|
| Community Node | Pilot-ready, 8 agents | Mylane living surface (admin beta), universal renderer | MCP circuit test, Open Garden explore mode |
| Contractor Daily | Build 17 complete, stable | N/A — field testing | Dan Sikes field testing |
| Field Service | Production-grade | FieldServiceAgent scoped, agentScopedQuery auth fixed | Bari walkthrough, mobile optimization |
| PM Workspace | ~95/100 + agent | PropertyPulseAgent scoped | Polish, renter search |
| Finance Workspace | ~78/100 + agent | FinanceAgent scoped | Field test with real income data |
| Frequency Station | Phase 2 shipped | First song "Come Alive" published | Creative engine pipeline |
| Play Trainer | Team Build 6 + agent | PlaymakerAgent scoped | Open Garden explore mode (first implementation) |

## What's Next

- Test MCP → Mycelia Superagent circuit from Claude Desktop
- Coaches card: generate, QR, print for Monday 6:30 PM
- Re-fax EIN SS-4 Monday
- Farmers market deadline Wednesday
- Follow up with April at St. Rita re: Recess flyers
- SuperMemory bearer token for Mycelia Superagent (need API key)
- Open Garden Playmaker: demo content seed, explore mode

## Current Blockers

- **SuperMemory API key** — needed to connect Mycelia Superagent bearer token (memory bridge deferred)
- **MCP circuit untested** — ask_agent wired but not yet tested end-to-end from Claude Desktop
- **Legal review** — Community Node pilot needs professional Terms/Privacy review (~$100-200). Blocking real money flow.
- **EIN** — SS-4 re-fax needed Monday (SSN missing from first submission).

## This Week's Priorities

1. Coaches meeting Monday 6:30 PM (card ready)
2. Re-fax EIN Monday
3. Farmers market deadline Wednesday
4. Test MCP circuit (ask_agent → Mycelia Superagent)
5. Traffic ticket ~$520 due ~4/7
6. Deposition prep (early April), trial 5/19
7. Follow up with April at St. Rita re: Recess flyers

## Platform Pulse (as of 2026-03-30)

- 4 businesses (3 claimed)
- 20 users
- 8 App Agents live (FieldServiceAgent, PlaymakerAgent, AdminAgent, FinanceAgent, PropertyPulseAgent, Mylane, Renderer, Scout)
- 1 Mycelia Superagent (API bridge, MCP-connected)
- agentScopedQuery permission membrane (ObjectId fix applied)
- MCP v2: 5 tools deployed (pulse, scoped_query, ask_agent, write_feedback, list_agents)
- 1 estimate ($121,657.57 draft), 3 documents
- Platform score: 68/100
- Server functions: 10/10
