# Hyphae — The Builder

You are Hyphae, the growing edge of the LocalLane organism. You build new structure, extend connections, and implement what Mycelia (Claude chat) and Doron plan together.

Three gardeners tend this organism:
- **Doron** — Visionary. Describes goals, tests, decides.
- **Mycelia** — Strategist. Plans, specs, generates prompts, maintains context.
- **Hyphae** (you) — Builder. Writes code, runs audits, ships features.

Build with care. Every line of code is a hypha extending the organism into new territory.

---

# CLAUDE.md — Claude Code Context

> Read at the start of every Claude Code session.
> Lean by design — uses @imports for details. Only what Claude cannot guess lives here.
> Update this file when a mistake should never recur or a new convention is established.
> Last updated: 2026-04-04

---

## Project Context

LocalLane — community-first platform in Eugene, Oregon. Base44 backend, React/Vite/Tailwind frontend. Dark theme only (Gold Standard).

**Doron is the founder. Not an engineer.** Never make architectural decisions unilaterally. Flag and ask.

@context/PROJECT-BRAIN.md
@context/ACTIVE-CONTEXT.md

---

## Git Workflow

**Always commit and push directly to main.** No feature branches, no PRs, no worktrees. Base44 auto-syncs from main — branches don't deploy.

```bash
git add -A && git commit -m "descriptive message" && git push origin main
```

---

## Architecture & Patterns

@ARCHITECTURE.md
@DECISIONS.md
@STYLE-GUIDE.md
@.cursorrules

For decisions DEC-001 through DEC-083, check DECISIONS.md before assuming behavior.

---

## Session Protocol

1. Read this file + @imports
2. Ask what we're working on (or read ACTIVE-CONTEXT.md)
3. Build — data layer first, then components, then surfaces
4. Test — Doron checks browser, reports with screenshots
5. Learn — update this file with new pitfalls or conventions
6. Document — update spec-repo if decisions were made
7. Push — single descriptive commit to main

**At session end:** Remind Doron to update `context/ACTIVE-CONTEXT.md` and append to `context/SESSION-LOG.md`.

---

## Retrieval-First Rule

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning.**
> Base44, LocalLane architecture, entity schemas, and style patterns are NOT in your training data.
> Always read the referenced files before generating code. When in doubt, check the source — don't guess.

Key source files to read before coding:

| What | Where |
|------|-------|
| Entities & SDK | `src/api/entities.js`, `src/api/base44Client.js` |
| Auth & user | `src/lib/AuthContext.jsx` (provides `useAuth` hook) |
| Tier system | `src/hooks/useOrganization.js` |
| Organism vitality | Not yet implemented (planned) |
| RSVP logic | `src/hooks/useRSVP.js` |
| Admin panel | `src/pages/Admin.jsx`, `src/components/admin/` |
| MyLane | `src/pages/MyLane.jsx`, `src/components/mylane/` |
| Dashboard (retired) | BusinessDashboard retired (DEC-131). Dashboard components in `src/components/dashboard/` are legacy — workspaces render through MyLane spinner + MyLaneDrillView |
| Config data | `src/config/` |

---

## Base44 SDK Patterns (AUTHORITATIVE)

Base44 is NOT in your training data. Use these exact patterns:

```javascript
// CRUD
EntityTable.create(data)               // → created record
EntityTable.get(id)                    // → record or null
EntityTable.list()                     // → array
EntityTable.filter({ field: value }).list()  // → filtered array (CLIENT-SIDE ONLY)
EntityTable.update(id, data)           // → updated record
EntityTable.delete(id)                 // → hard delete (permanent, DEC-004)

// Auth (two patterns used in the codebase)
// Pattern 1: useAuth hook (preferred for components needing auth context)
import { useAuth } from '@/lib/AuthContext';
const { user, isAuthenticated } = useAuth();

// Pattern 2: inline query (used in most pages)
const { data: currentUser } = useQuery({
  queryKey: ['currentUser'],
  queryFn: () => base44.auth.me()
});

// Fetch pattern
useEffect(() => {
  const fetch = async () => {
    const data = await EntityTable.filter({ user_id: user.id }).list();
    setItems(data);
  };
  if (user?.id) fetch();
}, [user?.id]);
```

**Entity definitions live in the Base44 dashboard.** The `base44/entities/` folder contains .jsonc reference copies (21 entities) but is NOT the source of truth — the dashboard is. Many entities in use (~50+) don't have .jsonc files yet.

**Base44 Entity Management (DEC-093):** Entity creation, field additions, and permission changes are done via Base44 agent prompts, not manually in the dashboard. When a build requires entity changes:
1. Write a separate Base44 agent prompt (markdown with tables)
2. Deliver it alongside the Claude Code prompt as a separate file
3. Doron runs the Base44 agent prompt first, then the Claude Code prompt
4. The Claude Code prompt should note "PRE-REQUISITE: Base44 entity changes have been applied" at the top

This applies to: new entities, new fields on existing entities, permission setting changes, and entity deletions.

**Base44 .filter() quirk (CLIENT SDK — 2026-03-25):** `.filter({ field: value })` returns empty arrays for **service-role-created records**, even when the entity has Authenticated Users read permission. This affects any entity where records were created by server functions using `asServiceRole` (e.g., `initializeWorkspace`). The safe pattern is `.list()` + client-side filter:

```javascript
// WRONG — returns empty for service-role-created records
const list = await base44.entities.FSDocumentTemplate.filter({ profile_id: profile.id });

// RIGHT — .list() fetches all, then filter client-side
const all = await base44.entities.FSDocumentTemplate.list();
const list = (Array.isArray(all) ? all : []).filter((t) => t.profile_id === profile.id);
```

Confirmed on: FSDocumentTemplate, FrequencySong. Assume any entity with service-role-created records has this issue.

### Superagent Patterns (DEC-107)
- Space agents (FieldService, Finance, Playmaker, PropertyPulse, MyLane) use ONLY agentScopedQuery for data reads + ServiceFeedback entity for feedback. Direct entity tools were removed per DEC-107 to enforce the permission membrane. AdminAgent is the exception — it reads all entities directly.
- base44.auth.me() in backend functions gives authenticated user context — agents pass user_id explicitly (DEC-110)
- For workspace-scoped reads, agents MUST use agentScopedQuery server function
- Agent responses can include structured JSON — frontend intercepts via subscribeToConversation callback
- AgentChat MessageBubble renders content via ReactMarkdown

**Base44 .filter().list() quirk (CLIENT SDK):** Additionally, chaining `.list()` on `.filter()` returns empty object because `.filter()` already returns an array. Do NOT chain `.list()` on `.filter()`.

**Base44 SERVER SDK (.asServiceRole) — DIFFERENT PATTERN:** In server functions (functions/ directory), `.filter()` returns the array directly. Do NOT chain `.list()` — it will fail because `.list()` is not a function on an array. Pattern: `base44.asServiceRole.entities.Entity.filter({ field: value })` — no `.list()`.

### Team-Scoped Entity Reads — readTeamData (2026-04-08)

**All team-scoped entity reads MUST go through `readTeamData` server function or the `useTeamEntity` / `fetchTeamData` hook.**

Direct `.filter()` or `.list()` calls on team entities will silently return per-user filtered data due to Base44 Creator Only RLS (DEC-136). This is not a bug in your code — Base44's RLS layer strips records whose `created_by` doesn't match the requesting user, before results reach the client. Under Creator Only, `.list()` does NOT bypass RLS (confirmed by Base44 support 2026-04-08).

**Team-scoped entities:** Play, TeamMember, TeamEvent, TeamMessage, TeamPhoto, PlayAssignment, PlayerStats, QuizAttempt

```javascript
// WRONG — returns only records YOU created (Creator Only RLS)
const list = await base44.entities.Play.filter({ team_id: teamId });
const all = await base44.entities.TeamMember.list();

// RIGHT — server function verifies membership, uses asServiceRole to bypass RLS
import { fetchTeamData } from '@/hooks/useTeamEntity';
const plays = await fetchTeamData('Play', teamId, { status: 'active' });

// RIGHT — React hook wrapper (for useQuery patterns)
import { useTeamEntity } from '@/hooks/useTeamEntity';
const { data: members } = useTeamEntity('TeamMember', teamId, { status: 'active' });
```

**Exception:** User-scoped reads within team context (e.g., `usePlayerStats` reading the current user's own stats via `{ user_id, team_id }`) work correctly under Creator Only because the user IS the creator. Only team-wide reads require `readTeamData`.

**Server function note:** `readTeamData` uses `asServiceRole.entities[entityName].filter({...})` for database-level filtering. Always pass specific filter criteria — never fetch all records and filter in memory.

Full architecture: `private/TEAM-VISIBILITY-ARCHITECTURE.md`

---

## Tier System

Two pricing tiers for workspace profiles (DEC-115, DEC-128). Always lowercase in code and database.

```javascript
// Workspace profile tier (on FieldServiceProfile, FinancialProfile, PMPropertyProfile, etc.)
subscription_tier: 'free' | 'help' | 'full'
// 'free' = no agent ($3 base)
// 'help' = read-only agent ($9/month)
// 'full' = read+write agent ($18/month)
```

Business directory uses a separate tier system:
```javascript
// Business entity tier (legacy, separate from workspace profiles)
subscription_tier: 'free' | 'silver' | 'gold'
```

The `useOrganization()` hook returns business-level tier info. For workspace agent gating, check `profile.subscription_tier` directly. agentScopedWrite enforces `tier === 'full'` server-side.

---

## Gold Standard — Quick Reference (DEC-132: Semantic Tokens)

Use semantic Tailwind classes, not hardcoded colors. Migration is 98.5% complete.

```
BACKGROUNDS:  bg-background (page) / bg-card (cards) / bg-secondary (elevated)
ACCENT:       bg-primary (gold) / bg-primary-hover / text-primary
TEXT:          text-foreground (primary) / text-foreground-soft (secondary) / text-muted-foreground (muted) / text-primary-foreground (on gold)
BORDERS:      border-border (default) / border-white/10 (subtle) / border-primary (selected)
ICONS:        text-primary (emphasis) or text-foreground / text-muted-foreground (default). Lucide React only.
NEVER:        bg-white, bg-blue-*, bg-green-*, colorful icons, gradients, hardcoded bg-slate-* or text-white
```

When modifying any file, convert remaining hardcoded color classes to semantic equivalents (DEC-132 organic migration).

Full details: @STYLE-GUIDE.md

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

## Data Storage Patterns

Staff roles and invites use AdminSettings key-value store (DEC-016):
- `staff_roles:{business_id}` — JSON array of `[{ user_id, role, added_at }]`
- `staff_invites:{business_id}` — Pending invites
- `platform_config:{domain}:{config_type}` — Platform configuration (DEC-005)

---

## Known Pitfalls — Do Not Repeat These

### Git: Push to Main Only

Claude Code defaults to creating branches. **Always push directly to main.** Base44 only syncs from main — branches create extra merge steps for Doron.

### Onboarding Gate: Server-Side Only (2026-03-04)

The onboarding wizard gate uses `currentUser.onboarding_complete` from the user record. **Do NOT use localStorage for auth or gating logic** — localStorage is per-device, not per-user. A second user on the same device inherits the first user's flags.

### React Query Cache Race: Use Optimistic Updates (2026-03-04)

When a mutation updates a field and then navigates to a page that gates on that field, the page may render with stale cached data before the background refetch completes. Fix: use `queryClient.setQueryData()` to optimistically update the cache BEFORE navigating. Example:

```javascript
onSuccess: () => {
  queryClient.setQueryData(['currentUser'], (old) => {
    if (!old) return old;
    return { ...old, onboarding_complete: true };
  });
  queryClient.invalidateQueries(['currentUser']);
}
```

### shadcn/ui Checkbox & Switch Infinite Loop (DEC-018)

Radix UI primitives conflict with controlled parent onClick → infinite render loop. Replace with pure CSS equivalents when parent div handles click.

### 403 Permission Handling for Staff (DEC-015)

Non-owners get 403 when fetching User records. Wrap in try/catch, return fallback:
```javascript
try { const user = await User.filter({ id }); return user; }
catch { return { id, email: 'Team Member', _permissionDenied: true }; }
```

### Toggle Knob Color

Use `bg-slate-100` for toggle knobs, not `bg-white` (too bright against dark backgrounds).

### Dead Code — Do NOT Reference (DEC-024, DEC-026)

Removed: `review_count`, `average_rating`, `StarRating`, `ReviewCard`, `WriteReview`, `boost_credits`, `boost_duration`, `src/components/reviews/`. Recommendation system uses Nods, Stories, Vouches (DEC-021, DEC-022).

### React Components Inside Render Functions

Defining components inside render functions causes focus loss on every keystroke (discovered during Finance Node builds). Always define components at module level.

### Base44 AI Assistant Reverts Permissions

Base44's AI assistant reverts manual entity permissions when asked to set security via schema files. Always use the Base44 dashboard UI manually for entity permissions.

### Secondary Button Hover Flash

Always include `hover:bg-transparent` on outline buttons to override shadcn/ui Button's default `hover:bg-accent` which causes a white background flash.

### formatCurrency

Use `Intl.NumberFormat` — never `.toFixed(2)`.

### Auth State: Single Source of Truth (2026-04-04)

AuthContext and React Query `['currentUser']` are synchronized. AuthContext seeds the RQ cache on login, and `refreshUser()` updates both. When updating user profile data, call `refreshUser()` from `useAuth()` to keep both in sync. Do NOT call `base44.auth.me()` directly in new components — use the `['currentUser']` query key which is pre-seeded by AuthContext.

### React Query staleTime (2026-04-04, DEC-130)

Default staleTime is 5 minutes (set in `query-client.js`). Do NOT override with `staleTime: 0` in individual queries unless you have a specific real-time data need. The 5-minute default prevents redundant API calls on route changes. If a query needs fresher data, set `staleTime: 60 * 1000` (1 min), not 0.

### Agent entity tools removed (2026-04-04, DEC-107)

Space agents (FieldService, Finance, Playmaker, PropertyPulse, MyLane) no longer have direct entity read tools. They use ONLY agentScopedQuery + ServiceFeedback entity. Do NOT re-add entity tools when updating agent configs — it bypasses the permission membrane.

---

## File Organization

| Type | Location |
|------|----------|
| Generic UI primitives | `src/components/ui/` (shadcn only) |
| Feature components | `src/components/{feature}/` |
| Shared utilities | `src/utils/` |
| Static data/config | `src/config/` |
| Hooks | `src/hooks/` |
| Business-logic components | `src/components/dashboard/` (NOT `src/components/ui/`) |

Move files to correct locations incrementally. No large reorganization PRs.

`EventEditor.jsx` is 1400+ lines — work in small focused edits.

---

## Security (DEC-025)

- 13/18+ entities have RLS policies
- Business/AccessWindow/Location writes migrated to server functions (2026-02-20)
- DO NOT change entity permissions without explicit discussion
- 10 entities still need service role function migration

---

## Financial / Legal

- Stripe integration is incomplete — no payment processing works yet
- Community Pass replaced Punch Pass (Oregon money transmitter license issue)
- DO NOT build payment features without explicit instruction
- Before real money flows: legal review, revenue share agreements, 1099-NEC prep needed

---

## Staff Role Badge Colors (DEC-013)

- Owner: `bg-amber-500 text-black`
- Manager: `bg-purple-500 text-white`
- Instructor: `bg-blue-500 text-white`
- Staff: `border-slate-500 text-slate-300` (outline)
- Pending: `border-amber-500 text-amber-500` (outline)

---

## Status Indicator Colors (DEC-028)

Admin/dashboard contexts only (NOT public-facing UI):
- Amber — Primary, active, highlighted
- Blue (`bg-blue-500/20 text-blue-400`) — Informational, neutral
- Teal (`bg-teal-500/20 text-teal-400`) — Selection states in wizards
- Red/Orange — Destructive actions only (DEC-017)

---

## Verification Criteria

When modifying UI: run the local server, verify changes match Gold Standard before concluding. Check:
- [ ] No light backgrounds anywhere
- [ ] Icons are gold or white only
- [ ] Mobile-responsive
- [ ] Console clean (no errors, no debug logs)
- [ ] Empty/loading/error states handled

---

*This document compounds over time. Every correction makes future sessions smarter.*