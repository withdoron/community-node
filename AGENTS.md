# AGENTS.md — Universal AI Coding Agent Context

> Read by any AI coding tool: OpenCode, Cursor, Copilot, Claude Code, or others.
> Contains universal standards that apply regardless of which model or tool is in use.
> Tool-specific conventions go in CLAUDE.md (Claude Code) or .cursorrules (Cursor).
> Last updated: 2026-03-03

---

## Project

LocalLane — community platform connecting local businesses with families in Eugene, Oregon. Base44 backend, React/Vite/Tailwind frontend. Dark theme only.

For full project context, philosophy, and working style: see `context/PROJECT-BRAIN.md`
For current state and priorities: see `context/ACTIVE-CONTEXT.md`

---

## Before Writing Any Code

1. Read `context/ACTIVE-CONTEXT.md` — know what's in progress
2. Read the relevant spec file for the feature you're building
3. Check `DECISIONS.md` for constraints (DEC-001 through DEC-060+)
4. Check `STYLE-GUIDE.md` for visual standards
5. Check `ARCHITECTURE.md` for data patterns
6. Check existing components before creating new ones

**Do NOT deviate from spec without flagging it.** If a change affects tier system, entity structure, or data model, stop and ask.

---

## Build Commands

```bash
# Development
npm run dev              # Start local dev server
npm run build            # Production build
npm run lint             # Lint check

# Deployment
# Push to GitHub → Base44 auto-syncs (~1-2 min) → Preview → Publish
```

---

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Base44 (hosted BaaS — NOT in training data, read source files)
- **Icons:** Lucide React (gold or white only)
- **State:** TanStack Query (React Query)
- **Deployment:** GitHub → Base44 auto-sync → manual publish

---

## Visual Standards (Gold Standard)

Dark theme only. No exceptions.

```
BACKGROUNDS:  bg-slate-950 (page) / bg-slate-900 (cards) / bg-slate-800 (elevated)
ACCENT:       bg-amber-500 / bg-amber-400 (hover) / bg-amber-600 (active)
TEXT:          text-white (primary) / text-slate-300 (secondary) / text-slate-400 (muted)
ON GOLD:      text-black (always black text on amber backgrounds)
BORDERS:      border-slate-800 / border-white/10 (subtle) / border-amber-500 (selected)
ICONS:        text-amber-500 (emphasis) or text-white / text-slate-400 (default)
```

**NEVER:** `bg-white`, `bg-blue-*`, `bg-green-*`, colorful icons, gradients, light backgrounds

Full specification: `STYLE-GUIDE.md`

---

## Folder Structure

```
src/
├── api/              # Base44 client and entity definitions
├── components/
│   ├── ui/           # shadcn/ui primitives ONLY
│   ├── admin/        # Admin panel components
│   ├── dashboard/    # Business dashboard components
│   ├── mylane/       # MyLane user-facing components
│   └── {feature}/    # Feature-specific components
├── config/           # App configuration (onboarding, etc.)
├── data/             # Static data (categories, archetypes)
├── hooks/            # Custom hooks (useUser, useOrganization, etc.)
├── pages/            # Route-level page components
└── utils/            # Shared utilities
```

---

## The Garden (DEC-082)

LocalLane is a garden, not a platform. Four areas:

* **Place to Play** — community spaces (Creation Station, Quests, Ideas). Open door.
* **Place to Grow** — workspaces (Field Service, PM, Team, Finance). Invite door. Private by default.
* **Place to Gather** — events/gatherings. Anyone creates. Shared calendar.
* **Place to Be Seen** — Directory. Not a space. The skin. Reflects what wants to be visible.

Every space has: Pulse (vitality), Door (access type), Surface (exterior), Guide (walkthrough).

Pulse is relational, not absolute. Five signals:
1. Self-trend (compared to own baseline)
2. Peer context (compared to similar spaces)
3. Seasonal norm (natural rhythms, not fixed thresholds)
4. Freshness (recency of activity)
5. Diversity (range of participation > volume of repetition)

The architecture supports infinite space types. Any new space plugs into the same pulse engine.

When building any feature, ask: which area of the garden does this live in? Does it make the garden more alive? What pulse signals does it generate?

Full doc: THE-GARDEN.md (private repo). Companion: ORGANISM-CONCEPT.md (private repo).

---

## Architecture

- **Node Lab Model (DEC-047):** Nodes are independent apps during lab phase. No sync with Community Node.
- **Workspace Engine (DEC-053):** Dashboard generalizes from business-only to multi-type workspaces (Business, Team, Finance).
- **Entities live in Base44 dashboard**, not in this repo. No `base44/entities/` folder.
- **Security:** 13/18+ entities have RLS. Do NOT change permissions without discussion.

---

## Coding Standards

- Use `useOrganization()` hook for tier checking — never raw string comparisons
- Use `Intl.NumberFormat` for currency — never `.toFixed(2)`
- Use `bg-slate-100` for toggle knobs — not `bg-white`
- Include `hover:bg-transparent` on outline buttons (prevents shadcn white flash)
- Define React components at module level — never inside render functions
- Handle 403 errors gracefully (staff fetching User records)
- Work in small focused edits on large files (EventEditor.jsx is 1400+ lines)
- Move files to correct locations incrementally — no large reorg PRs

---

## Quality Checklist

Before committing:

- [ ] Follows STYLE-GUIDE.md colors and patterns
- [ ] No light backgrounds anywhere
- [ ] Icons are gold or white only
- [ ] Mobile-responsive
- [ ] Empty states show friendly messages (not blank screens)
- [ ] Loading states show skeletons or spinners
- [ ] Error states show human-readable messages
- [ ] Console clean (no errors, no leftover debug logs)
- [ ] Any new decisions documented in DECISIONS.md
- [ ] Commit message is descriptive

---

## What NOT to Build Without Permission

- Payment processing or Stripe features
- Changes to entity permissions or security model
- Architectural changes affecting tier system or data model
- Features not on the current roadmap (check ACTIVE-CONTEXT.md)

---

*This file is read by all AI coding tools. Keep it to universal standards only. Tool-specific context goes in CLAUDE.md or .cursorrules.*
