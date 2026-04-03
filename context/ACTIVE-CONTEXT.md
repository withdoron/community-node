# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-02 (mega session — 5 commits, living map spec, credit research)

## Current Focus

Semantic migration complete. Fallout CRT live. CommandBar render pipeline wired. Panel viewport-fixed. Friday demo prep.

## Active Architecture

- **Theme system:** Semantic tokens throughout (bg-card, text-foreground, etc.). Three themes: Gold Standard (dark), Cloud (light), Fallout (CRT effects). No !important overrides. Two variable systems coexist: shadcn HSL + --ll-* hex (latter being phased out).
- **Navigation:** SpaceSpinner (horizontal gallery) + native scroll. Spinner centers via container ResizeObserver.
- **Copilot:** CommandBar (atomic queries, ephemeral polling). Render pipeline wired: RENDER, RENDER_DATA, RENDER_CONFIRM all parsed from agent responses. Loading indicator (pulsing dots). Themed input.
- **Panel:** Mylane panel viewport-fixed (position:absolute). Two independent scroll contexts. Close/minimize with localStorage persistence. Desktop: 300px right panel. Mobile: bottom bar.
- **Responsive:** Container queries. Desktop >= 1024px (panel + content). Tablet 768-1023px (mobile layout). Mobile < 768px (bottom bar).
- **Audio:** FrequencyContext with persistent audio element and master power switch.

## Friday Demo Path (Coach Rick, 5:00 PM April 3)

1. Publish in Base44 to deploy latest commits
2. locallane.app on iPhone, sign in as Coach Rick
3. Team space: roster, playbook, Playbook Pro
4. CommandBar: "show me my roster" should render player cards (verify RENDER_DATA pipeline)
5. Theme toggling: Gold Standard → Fallout (CRT effects showcase)
6. Panel behavior: viewport-fixed, input always visible, close/reopen

## Upcoming Priorities

1. Verify render pipeline end-to-end on deployed app
2. Mylane agent instruction refresh if needed for ephemeral RENDER_DATA
3. Base44 rate limit numbers (support ticket open, awaiting human team)
4. Living Map — seedling phase, spec in private repo with builder notes
5. Mylane Intelligence Tiers architecture spec (Tier 1 client / Tier 2 server / Tier 3 LLM)
6. Future: Anthropic API key for direct backend function LLM calls (zero Base44 credits)
7. Ephemeral conversation cleanup (CommandBar orphaned records)
