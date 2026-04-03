# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-03 (mega session complete — 12 commits, spinner finalized, demo prep)

## Current Focus

Spinner physics complete (friction model, ratchet snap, audio ticks). 3D variant architecture shipped. Coach Rick demo today at 5 PM. Landing page scroll story concept ready.

## Active Architecture

- **Theme system:** Semantic tokens throughout (bg-card, text-foreground, etc.). Three themes as game modes: Gold Standard (dark, cover flow, precise), Cloud (light, cover flow, heavy/gentle), Fallout (CRT effects, drum variant, loose). No !important overrides. Two variable systems coexist: shadcn HSL + --ll-* hex (latter being phased out).
- **Spinner:** 3D variant architecture — render function strategy pattern. Drum (Fallout) + cover flow (Gold Standard/Cloud) + flat (reduced motion). Friction + mass physics (no spring). Ratchet snap on slow drag (zero animation). Momentum mode on fast flick (friction deceleration with per-space ticks). Dev Lab physics tuner (admin-only, flask toggle below spinner).
- **Audio:** iOS Safari AudioContext hardened — touchstart + pointerdown init, silent buffer unlock, resume check on every tick. Triangle wave 320Hz (transition), 260Hz (landing). Gain 0.07.
- **Copilot:** CommandBar (atomic queries, ephemeral polling). Render pipeline wired: RENDER, RENDER_DATA, RENDER_CONFIRM parsed from agent responses. Loading indicator (pulsing dots). Themed input (semantic tokens).
- **Panel:** Mylane panel viewport-fixed (position:absolute in relative body). Two independent scroll contexts. Close/minimize with localStorage persistence. Desktop: 300px right panel. Mobile: bottom bar.
- **Responsive:** Container queries. Desktop >= 1024px (panel + content). Tablet/Mobile: bottom bar, full-width content.
- **Query optimization:** staleTime 5min on all card queries, 10min on auth. ~5 API calls per subsequent navigation.

## Today — Coach Rick Demo (5:00 PM April 3)

1. Publish in Base44 to deploy all 12 commits
2. locallane.app on iPhone, sign in as Coach Rick
3. Team space: roster, playbook, Playbook Pro
4. Spinner: cover flow variant, ratchet snap feel, audio ticks
5. Theme toggling: Gold Standard → Fallout (CRT effects + drum variant)
6. CommandBar: "show me my roster" — verify RENDER_DATA pipeline
7. Panel: viewport-fixed, input always visible, close/reopen

## Seeds Ready for Future

- Landing page scroll story: "Want to play a game? The game of within." Mockup built.
- Ephraim's Game Lab: HTML games, async multiplayer, IINE controller
- Frequency Station playlist: auto-advance, shuffle, queue
- Church network need: internal + cross-church coordination
- Elderly/Garden theme concept
- Themes as subdomains (fallout.locallane.app)

## Upcoming Priorities

1. Playmaker walkthrough with Doron
2. Landing page scroll story polish
3. Frequency Station playlist feature
4. Mylane agent instruction refresh for ephemeral RENDER_DATA
5. Base44 rate limit numbers (support ticket open)
6. Living Map — seedling phase, spec with builder notes in private repo
7. Mylane Intelligence Tiers architecture (Tier 1/2/3)
8. Future: Anthropic API key for direct backend function LLM calls (zero credits)
