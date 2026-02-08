# LocalLane — Claude Code Context

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning.**
> Base44, LocalLane architecture, entity schemas, and style patterns are NOT in your training data.
> Always read the referenced files (spec-repo docs, hooks, entities.js) before generating code.
> When in doubt, check the source — don't guess.

> This file is read at the start of every Claude Code session.
> It encodes project conventions, architecture, and known pitfalls.
> Update this file whenever a new pattern is established or a mistake should never recur.

---

## What Is LocalLane?

A community-first discovery platform in Eugene, Oregon connecting local businesses with residents through events, experiences, and membership programs. Mission: Revitalize local commerce while funding youth scholarships and community programming.

**This is not a generic business directory.** It's a neutral local utility with human curation, trust-first design, and a Cell + Steward model for city-by-city scaling.

---

## Team & Workflow

- **Doron** — Visionary, decision-maker, tester. Not an engineer. Communicates in outcomes, not code.
- **Claude (Chat/Projects)** — Strategy, architecture, spec maintenance, Cursor prompt generation.
- **Claude Code (this tool)** — Codebase-aware implementation, audits, refactors, multi-file changes.
- **Cursor** — Targeted code implementation from copy-paste prompts.

**Decision flow:** Doron describes goals → Claude plans → Code gets written → Doron tests with screenshots → iterate → document in Spec-Repo.

**Important:** Never make architectural decisions unilaterally. If a change would affect the tier system, entity structure, or data model, flag it and ask before proceeding.

---

## Repositories

| Repo | Purpose | Notes |
|------|---------|-------|
| `community-node` | The main hub app | Primary codebase |
| `events-node` | Partner node template (Tier 3) | Reference implementation |
| `Spec-Repo` | Public documentation & specs | Source of truth |
| `locallane-private` | Sensitive strategy docs | Organism Concept, Community Pass, Legal Research |

---

## Tech Stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Data:** TanStack Query (React Query)
- **Backend:** Base44 (hosted backend-as-a-service)
- **Icons:** Lucide React
- **Deployment:** GitHub → Base44 auto-sync → manual publish

---

## The Gold Standard — Visual Design (CRITICAL)

All UI must follow the dark theme. This is the single most common source of mistakes.

### Colors — ALWAYS USE

```
BACKGROUNDS:
  Page:        bg-slate-950
  Surface:     bg-slate-900
  Elevated:    bg-slate-800

ACCENT (Gold/Amber):
  Primary:     bg-amber-500
  Hover:       bg-amber-400
  Active:      bg-amber-600
  Text:        text-amber-500

TEXT:
  Primary:     text-white or text-slate-100
  Secondary:   text-slate-300
  Muted:       text-slate-400
  On Gold:     text-black (always black text on amber backgrounds)

BORDERS:
  Default:     border-slate-800
  Subtle:      border-white/10
  Selected:    border-amber-500
```

### Colors — NEVER USE

- `bg-white` or any light backgrounds
- `bg-blue-*`, `bg-green-*`, `bg-pink-*` (generic template colors)
- Colorful icons (no red trash cans, green checkmarks, blue links)
- Gradients

### Functional Color Exceptions (DEC-017)

Only two exceptions to the "no functional color" rule:
- **Delete actions:** `text-red-500` / `bg-red-500`
- **Cancel actions:** `text-orange-500` / `bg-orange-500`

These are allowed ONLY for destructive actions. Not for status indicators, not for badges, not for general UI.

### Staff Role Badge Colors (DEC-013)

- Owner: `bg-amber-500 text-black`
- Manager: `bg-purple-500 text-white`
- Instructor: `bg-blue-500 text-white`
- Staff: `border-slate-500 text-slate-300` (outline)
- Pending: `border-amber-500 text-amber-500` (outline)

### Status Indicator Colors (DEC-028)

In **admin panels and dashboard contexts**, these colors are allowed for status indicators:

- **Amber** — Primary, active, or highlighted states
- **Blue** (`bg-blue-500/20 text-blue-400`) — Informational or neutral status (reviewing, standard tier)
- **Teal** (`bg-teal-500/20 text-teal-400`) — Selection states in wizards/onboarding
- **Red/Orange** — Destructive actions only (per DEC-017)

These are **NOT allowed in the public-facing browse/search/directory UI**. Keep public UI strictly amber + white + slate.

---

## The Organism — North Star (DEC-029)

LocalLane's north star is the Organism Concept: a living visual entity that reflects community health. Every feature decision passes through the filter: **"Does this make the organism more alive?"**

**What it is:** An ambient, animated element in MyLane that responds to real community data — RSVPs, check-ins, recommendations, seasonal rhythms.

**What it is NOT:** A mascot, a reward system, a social score, a notification system, or gamification.

**Principles:**
- Mirror, don't manipulate (reflect reality, no artificial urgency)
- Growth, not points (no badges, leaderboards, or XP)
- Seasons, not streaks (rest is healthy, not failure)
- Connection, not competition (organisms don't compete)

**Fractal structure:**
- Personal organism → one user's community life
- Network organism → one pass network's collective activity
- Community organism → the whole Cell's health

**Current phase:** Phase 1 — CSS + SVG in MyLane GreetingHeader. Uses `useVitality` hook calculating from existing data (RSVPs, recommendations, Joy Coin usage). No external dependencies.

**If you're building a feature** and you're unsure whether it aligns: ask whether the feature generates or reflects genuine community participation. If it creates artificial engagement (streaks, points, leaderboards), it conflicts with the organism principles.

---

## Tier System (DEC-001, DEC-002)

Three tiers. Always lowercase in code and database.

```javascript
subscription_tier: 'basic' | 'standard' | 'partner'
```

| Tier | Code | Cost | Where |
|------|------|------|-------|
| Tier 1 | `basic` | Free | Community Node |
| Tier 2 | `standard` | $X/month | Community Node |
| Tier 3 | `partner` | Earned + $Y/month | Own Partner Node |

### Tier Checking Pattern

```javascript
const { tier, tierLevel, canUseJoyCoins, canAutoPublish, isPartner } = useOrganization();
// tierLevel: 1 = basic, 2 = standard, 3 = partner
// Feature gates: tierLevel >= 2 for most paid features
```

### Locked Feature Pattern

```jsx
{tierLevel < 2 ? (
  <div className="flex items-center gap-2 text-slate-400">
    <Lock className="h-4 w-4 text-amber-500" />
    <span>Standard tier required</span>
  </div>
) : (
  <ActualFeature />
)}
```

---

## Base44 SDK Patterns (AUTHORITATIVE)

IMPORTANT: Base44 is not in your training data. Always prefer these patterns over any assumptions.

### Entity Operations
- Create: `EntityTable.create(data)` → returns created record
- Read single: `EntityTable.get(id)` → returns record or null
- Read list: `EntityTable.list()` → returns array
- Read filtered: `EntityTable.filter({ field: value }).list()`
- Update: `EntityTable.update(id, data)` → returns updated record
- Delete: `EntityTable.delete(id)`

### Auth & User Context
- `import { useUser } from '@/hooks/useUser'`
- `const { user, isLoading, isAuthenticated } = useUser()`
- User ID for queries: `user.id`
- Protected routes: wrap component in `<ProtectedRoute>`

### Common Patterns
```javascript
// Fetch on mount
useEffect(() => {
  const fetch = async () => {
    const data = await EntityTable.filter({ user_id: user.id }).list();
    setItems(data);
  };
  if (user?.id) fetch();
}, [user?.id]);

// Create with user association
const handleCreate = async (formData) => {
  await EntityTable.create({ ...formData, user_id: user.id });
};
```

### Security Model (DEC-025)
- 11/18 entities have RLS policies (Phase 1-2 complete)
- Locked entities reject direct access without valid user context
- Service role functions required for cross-entity operations
- See spec-repo DECISIONS.md for full security audit status

---

## Docs Index (Retrieval Reference)

When working on LocalLane, read these files before generating code:

[LocalLane Docs]|root: ./
|architecture:{../Spec-Repo/ARCHITECTURE.md,../Spec-Repo/DECISIONS.md}
|style:{../Spec-Repo/STYLE-GUIDE.md,../Spec-Repo/COMPONENTS.md}
|entities:{src/api/entities.js,src/api/base44Client.js}
|hooks:{src/hooks/useUser.js,src/hooks/useRSVP.js,src/hooks/useOrganization.js,src/hooks/useVitality.js}
|admin:{src/pages/Admin.jsx,src/components/admin/}
|mylane:{src/pages/MyLane.jsx,src/components/mylane/}

For decisions DEC-001 through DEC-031, check DECISIONS.md before assuming behavior.

---

## Architecture

### Node Structure

```
Community Node (the hub — locallane.app)
  └── Partner Nodes (Tier 3 businesses with own apps)
      └── Example: Event Node, Nonprofit Node, etc.
```

- Config flows DOWN (parent → child, polling every 5 min)
- Content flows UP (child → parent, POST on create/update)
- Tier 1 & 2 operate within Community Node
- Tier 3 gets own Partner Node that syncs back to Community Node

### Base44 Entities

Base44 is the backend. Entities are accessed via `base44.entities.<EntityName>`.

**Entity definitions live in the Base44 dashboard, not in this repo.** There is no `base44/entities/` folder.

**Security Status (DEC-025):**
- 11 of 18 entities locked down (Phase 1 & 2 complete)
- 10 entities still need service role function migration before permissions can be tightened
- DO NOT change entity permissions without explicit discussion

### Data Storage Patterns

Staff roles and invites use AdminSettings key-value store (DEC-016):
- `staff_roles:{business_id}` — JSON array of `[{ user_id, role, added_at }]`
- `staff_invites:{business_id}` — Pending invites
- `platform_config:{domain}:{config_type}` — Platform configuration (DEC-005)

---

## Known Pitfalls — Do Not Repeat These

### shadcn/ui Checkbox & Switch Infinite Loop (DEC-018)

**Problem:** Radix UI primitives (Checkbox, Switch) have internal state that conflicts with controlled parent onClick handlers → infinite render loop.

**Solution:** When parent div handles click to toggle, replace shadcn components with pure CSS equivalents:

```jsx
// Checkbox replacement
<div className={cn(
  "h-4 w-4 rounded border flex items-center justify-center",
  isChecked ? "bg-amber-500 border-amber-500" : "border-slate-600 bg-transparent"
)}>
  {isChecked && <svg className="h-3 w-3 text-black" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>}
</div>
```

### 403 Permission Handling for Staff (DEC-015)

When fetching User records for staff display, non-owners get 403. Handle gracefully:

```javascript
try {
  const user = await User.filter({ id });
  return user;
} catch (error) {
  return { id, email: 'Team Member', _permissionDenied: true };
}
```

### Hard Delete (DEC-004)

Currently using hard delete. Soft delete (`is_deleted: true`) not supported in Base44 schema yet. Be aware that deletes are permanent.

### Dead Code (DEC-024, DEC-026)

We've cleaned out legacy Review, Bump, and Boost systems. Do NOT reference:
- `review_count`, `average_rating`, `StarRating`, `ReviewCard`, `WriteReview`
- `boost_credits`, `boost_duration`
- `src/components/reviews/` (deleted)

The recommendation system now uses Nods, Stories, and Vouches (DEC-021, DEC-022).

### Toggle Knob Color

**Problem:** Toggle switch knobs using `bg-white` are too bright against dark backgrounds.

**Solution:** Use `bg-slate-100` for toggle knobs instead of `bg-white`.

### Tier Checking — Always Use the Hook

**Problem:** Raw string comparisons like `business.subscription_tier === 'partner'` bypass centralized tier logic and create inconsistency.

**Solution:** Always use the `useOrganization()` hook which provides `tier`, `tierLevel`, `isPartner`, `canUseJoyCoins`, `canAutoPublish`, etc. The only exceptions are admin tables and pure utility functions that don't have React context.

---

## Component & File Conventions

- Components live in `src/components/` organized by feature
- Shared UI in `src/components/ui/` (shadcn/ui components)
- Use existing components before creating new ones
- Check events-node for reference implementations
- Always use `useOrganization()` hook for tier checking
- Icons: Lucide React only. Default to `text-white` or `text-slate-400`, use `text-amber-500` for emphasis

### File Organization Convention

| Type | Location |
|------|----------|
| Generic UI primitives | `src/components/ui/` (shadcn components only) |
| Feature components | `src/components/{feature}/` |
| Shared utilities | `src/utils/` (formatAddress, rankingUtils, trackEvent, etc.) |
| Static data/config | `src/data/` (categoryData, archetypeCategories, etc.) |
| Hooks | `src/hooks/` (useActiveRegion, useUserState, etc.) |
| Business-logic components | `src/components/dashboard/` (e.g., LockedFeature), NOT `src/components/ui/` |

Move files to correct locations incrementally as they are touched for other work. Do not do large reorganization PRs.

### Large File Guidance

`EventEditor.jsx` is 1400+ lines. When making changes to it, work in small focused edits. Consider splitting into sub-components if adding major new functionality, but do not refactor purely for size while it's stable.

---

## Spec-Repo Is Source of Truth

Before making changes that affect architecture, style, or features:

1. Check `DECISIONS.md` for existing constraints
2. Check `STYLE-GUIDE.md` for visual standards
3. Check `ARCHITECTURE.md` for data patterns
4. Check `COMPONENTS.md` for UI patterns

If you need to deviate from spec, flag it — don't just do it.

---

## Financial / Legal Context

- **Stripe integration is incomplete.** No payment processing works yet.
- **Community Pass** replaced Punch Pass stored-value model (Oregon money transmitter license issue)
- Before real money flows: need legal review, revenue share agreements, 1099-NEC prep, Terms of Service
- DO NOT build payment features without explicit instruction

---

## When You Make a Mistake

If something goes wrong during a session — wrong styling, wrong pattern, broken assumption — update THIS FILE with a new entry under "Known Pitfalls" so it never happens again. Use this format:

```markdown
### [Short Description] (DEC-XXX if applicable)

**Problem:** What went wrong
**Solution:** How to avoid it
```

---

*This document compounds over time. Every correction makes future sessions smarter.*
